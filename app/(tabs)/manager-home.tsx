import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useShallow } from "zustand/react/shallow";
import { useTaskStore } from "@/lib/stores/task-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useColors } from "@/hooks/use-colors";
import { isActiveTask } from "@/lib/task-utils";

export default function ManagerHomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, signOut } = useAuthStore();
  const { rooms, tasks, isLoading, refreshManagerHome } = useTaskStore(
    useShallow((s) => ({
      rooms: s.rooms,
      tasks: s.tasks,
      isLoading: s.isLoading,
      refreshManagerHome: s.refreshManagerHome,
    })),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    staffAvailable: 0,
  });

  useEffect(() => {
    if (user?.role === "staff") {
      router.replace("/");
    }
  }, [user?.role, router]);

  useFocusEffect(
    useCallback(() => {
      void refreshManagerHome();
    }, [refreshManagerHome]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshManagerHome();
    } finally {
      setRefreshing(false);
    }
  }, [refreshManagerHome]);

  useEffect(() => {
    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter((t) => isActiveTask(t.status)).length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;

    setStats({
      totalTasks,
      pendingTasks,
      completedTasks,
      staffAvailable: 5,
    });
  }, [tasks]);

  const confirmSignOut = () => {
    Alert.alert("Sign out", "Sign out of SyncOps?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await signOut();
              router.replace("/auth/login");
            } catch {
              Alert.alert("Error", "Could not sign out");
            }
          })();
        },
      },
    ]);
  };

  const getRoomStatusColor = (status: string) => {
    switch (status) {
      case "occupied":
        return "bg-warning";
      case "vacant":
        return "bg-success";
      case "cleaning":
        return "bg-primary";
      default:
        return "bg-muted";
    }
  };

  const handleRoomPress = (roomId: string) => {
    router.push(`./room/${roomId}`);
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />
        }
      >
        <View className="px-4 py-6 gap-6">
          <View className="flex-row justify-between items-start gap-3">
            <View className="flex-1 gap-2">
              <Text className="text-3xl font-bold text-foreground">Welcome, {user?.name}</Text>
              <Text className="text-base text-muted">Manager dashboard</Text>
            </View>
            <View className="gap-2 items-end">
              <TouchableOpacity onPress={() => router.push("./profile")} hitSlop={8}>
                <Text className="text-sm text-primary font-semibold">Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmSignOut} hitSlop={8}>
                <Text className="text-sm text-error font-semibold">Sign out</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-1">Total tasks</Text>
              <Text className="text-2xl font-bold text-foreground">{stats.totalTasks}</Text>
            </View>
            <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-1">Pending</Text>
              <Text className="text-2xl font-bold text-warning">{stats.pendingTasks}</Text>
            </View>
            <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-1">Completed</Text>
              <Text className="text-2xl font-bold text-success">{stats.completedTasks}</Text>
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-semibold text-foreground">Room status</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => router.push("./task-history")}>
                  <Text className="text-primary font-semibold">History</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("./rooms")}>
                  <Text className="text-primary font-semibold">View all</Text>
                </TouchableOpacity>
              </View>
            </View>

            {isLoading && rooms.length === 0 ? (
              <ActivityIndicator color={colors.primary} size="large" />
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {rooms.slice(0, 6).map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    onPress={() => handleRoomPress(room.id)}
                    className={`flex-1 min-w-[30%] aspect-square rounded-lg items-center justify-center ${getRoomStatusColor(
                      room.status,
                    )} border border-border`}
                  >
                    <Text className="text-white font-semibold text-center">{room.room_number}</Text>
                    <Text className="text-white text-xs capitalize mt-1">{room.status}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Quick actions</Text>
            <TouchableOpacity
              onPress={() => router.push("./create-task")}
              className="bg-success rounded-lg py-3 items-center"
            >
              <Text className="text-white font-semibold">+ Create new task</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("./my-tasks")}
              className="bg-primary rounded-lg py-3 items-center"
            >
              <Text className="text-white font-semibold">View all tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("./ai-reports")}
              className="bg-surface border border-border rounded-lg py-3 items-center"
            >
              <Text className="text-foreground font-semibold">AI verification reports</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("./analytics")}
              className="bg-surface border border-border rounded-lg py-3 items-center"
            >
              <Text className="text-foreground font-semibold">Performance analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("./admin")}
              className="bg-surface border border-border rounded-lg py-3 items-center"
            >
              <Text className="text-foreground font-semibold">Admin panel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
