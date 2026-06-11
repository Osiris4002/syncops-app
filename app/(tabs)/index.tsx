import { useAuthStore } from "@/lib/stores/auth-store";
import { useTaskStore } from "@/lib/stores/task-store";
import {
  requestNotificationPermissions,
  subscribeToTaskNotifications,
  subscribeToTaskUpdates,
} from "@/lib/notification-service";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { useEffect } from "react";
import ManagerHomeScreen from "./manager-home";
import StaffHomeScreen from "./staff-home";

export default function HomeScreen() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!user?.id) return;
    const unsubTasks = useTaskStore.getState().subscribeToTasks();
    const unsubRooms = useTaskStore.getState().subscribeToRooms();
    return () => {
      unsubTasks();
      unsubRooms();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || user.role !== "staff") return;
    void requestNotificationPermissions();
    const unsubAssign = subscribeToTaskNotifications(user.id, {
      onAssigned: (task) => {
        Alert.alert("New task assigned", `You have a new task for room ${task.room_id}.`, [
          { text: "Later", style: "cancel" },
          { text: "Open task", onPress: () => router.push(`./task/${task.id}`) },
        ]);
      },
    });
    const unsubUpdates = subscribeToTaskUpdates(user.id);
    return () => {
      unsubAssign();
      unsubUpdates();
    };
  }, [user?.id, user?.role]);

  if (!user) {
    return null;
  }

  // Show role-based dashboard
  if (user.role === "manager") {
    return <ManagerHomeScreen />;
  }

  return <StaffHomeScreen />;
}
