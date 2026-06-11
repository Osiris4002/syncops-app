import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

/**
 * Expo Go (executionEnvironment === "storeClient") cannot load expo-notifications on Android
 * without throwing — remote push was removed from Expo Go in SDK 53+.
 * We lazy-load expo-notifications only in dev builds / standalone apps.
 */
function canUseExpoNotifications(): boolean {
  if (Constants.executionEnvironment === "storeClient") return false;
  if (Constants.appOwnership === "expo") return false;
  return true;
}

type NotificationsModule = typeof import("expo-notifications");

let notificationsLoadPromise: Promise<NotificationsModule | null> | null = null;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (!canUseExpoNotifications()) {
    return null;
  }
  if (!notificationsLoadPromise) {
    notificationsLoadPromise = import("expo-notifications").then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () =>
          ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }) as any,
      });
      return Notifications;
    });
  }
  return notificationsLoadPromise;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!canUseExpoNotifications()) return false;
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return false;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return false;
  }
}

export async function getNotificationToken(): Promise<string | null> {
  if (!canUseExpoNotifications()) return null;
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return null;
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (error) {
    console.error("Error getting notification token:", error);
    return null;
  }
}

export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!canUseExpoNotifications()) return;
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
        badge: 1,
      },
      trigger: null,
    });
  } catch (error) {
    console.error("Error sending local notification:", error);
  }
}

export function subscribeToTaskNotifications(
  userId: string,
  options?: { onAssigned?: (task: { id: string; room_id: string }) => void },
): () => void {
  try {
    const channel = supabase
      .channel(`tasks:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tasks",
          filter: `assigned_to=eq.${userId}`,
        },
        (payload: { new: { id: string; room_id: string } }) => {
          const task = payload.new;
          options?.onAssigned?.(task);
          void sendLocalNotification(
            "New task assigned",
            `You have a new cleaning task (room ${task.room_id}).`,
            { taskId: task.id, roomId: task.room_id },
          );
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  } catch (error) {
    console.error("Error subscribing to task notifications:", error);
    return () => {};
  }
}

export function subscribeToTaskUpdates(userId: string): () => void {
  try {
    const channel = supabase
      .channel(`task-updates:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `assigned_to=eq.${userId}`,
        },
        (payload: { new: { status: string; room_id: string; id: string } }) => {
          const task = payload.new;
          if (task.status === "rework") {
            void sendLocalNotification(
              "Task needs rework",
              `Room ${task.room_id} needs another pass. Please review and resubmit.`,
              { taskId: task.id, roomId: task.room_id },
            );
          }
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  } catch (error) {
    console.error("Error subscribing to task updates:", error);
    return () => {};
  }
}

export function subscribeToAIResults(userId: string): () => void {
  try {
    const channel = supabase
      .channel(`ai-results:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "images",
        },
        (payload: { new: { ai_result?: string; id: string } }) => {
          const image = payload.new;
          if (image.ai_result) {
            const message =
              image.ai_result === "clean"
                ? "Your image passed AI verification."
                : "Your image needs review. Please resubmit.";
            void sendLocalNotification("AI verification complete", message, {
              imageId: image.id,
              result: image.ai_result,
            });
          }
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  } catch (error) {
    console.error("Error subscribing to AI results:", error);
    return () => {};
  }
}

export function handleNotificationResponse(callback: (notification: unknown) => void): () => void {
  if (!canUseExpoNotifications()) {
    return () => {};
  }
  let subscription: { remove: () => void } | undefined;
  const ready = getNotifications().then((Notifications) => {
    if (!Notifications) return;
    subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      callback(response.notification);
    });
  });
  return () => {
    void ready.finally(() => subscription?.remove());
  };
}
