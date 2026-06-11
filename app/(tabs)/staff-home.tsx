import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useShallow } from "zustand/react/shallow";
import { useTaskStore } from "@/lib/stores/task-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useColors } from "@/hooks/use-colors";
import type { Task } from "@/lib/supabase";
import { isActiveTask, taskDisplayNumber } from "@/lib/task-utils";

export default function StaffHomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, signOut } = useAuthStore();
  const { tasks, isLoading, refreshStaffHome } = useTaskStore(
    useShallow((s) => ({
      tasks: s.tasks,
      isLoading: s.isLoading,
      refreshStaffHome: s.refreshStaffHome,
    })),
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.role === "manager") {
      router.replace("/");
    }
  }, [user?.role, router]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) void refreshStaffHome(user.id);
    }, [user?.id, refreshStaffHome]),
  );

  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await refreshStaffHome(user.id);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, refreshStaffHome]);

  const assignedTasks = useMemo(() => tasks.filter((t) => t.assigned_to === user?.id), [tasks, user?.id]);
  const pendingTasks = useMemo(() => assignedTasks.filter((t) => isActiveTask(t.status)), [assignedTasks]);
  const completedTasks = useMemo(() => assignedTasks.filter((t) => t.status === "completed"), [assignedTasks]);
  const pendingPreview = useMemo(() => pendingTasks.slice(0, 3), [pendingTasks]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-warning";
      case "in-progress":
        return "bg-primary";
      case "completed":
        return "bg-success";
      case "rework":
        return "bg-error";
      default:
        return "bg-muted";
    }
  };

  const renderTaskItem = useCallback(
    ({ item }: { item: Task }) => (
      <TouchableOpacity
        onPress={() => router.push(`./task/${item.id}`)}
        className="bg-surface border border-border rounded-lg p-4 mb-3"
      >
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-base font-semibold text-foreground flex-1">
            Task {taskDisplayNumber(item)} - Room {item.room_id}
          </Text>
          <View className={`${getStatusColor(item.status)} px-3 py-1 rounded-full`}>
            <Text className="text-white text-xs font-semibold capitalize">{item.status}</Text>
          </View>
        </View>
        <Text className="text-sm text-muted">Expected: {item.expected_time} min</Text>
        {item.latest_remark ? <Text className="text-xs text-muted mt-1">Remark: {item.latest_remark}</Text> : null}
      </TouchableOpacity>
    ),
    [router],
  );

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
              <Text className="text-base text-muted">Staff dashboard</Text>
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
              <Text className="text-sm text-muted mb-1">Pending</Text>
              <Text className="text-2xl font-bold text-warning">{pendingTasks.length}</Text>
            </View>
            <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-1">Completed</Text>
              <Text className="text-2xl font-bold text-success">{completedTasks.length}</Text>
            </View>
            <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-1">Score</Text>
              <Text className="text-2xl font-bold text-primary">{user ? user.performance_score.toFixed(1) : "0.0"}</Text>
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-semibold text-foreground">Your tasks</Text>
              <TouchableOpacity onPress={() => router.push("./my-tasks")}>
                <Text className="text-primary font-semibold">View all</Text>
              </TouchableOpacity>
            </View>

            {isLoading && tasks.length === 0 ? (
              <ActivityIndicator color={colors.primary} size="large" />
            ) : pendingPreview.length > 0 ? (
              <FlatList
                data={pendingPreview}
                renderItem={renderTaskItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                removeClippedSubviews
              />
            ) : (
              <View className="bg-surface rounded-lg p-6 items-center border border-border">
                <Text className="text-muted text-center">No pending tasks</Text>
              </View>
            )}
          </View>

          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Quick actions</Text>
            <TouchableOpacity
              onPress={() => router.push("./my-tasks")}
              className="bg-primary rounded-lg py-3 items-center"
            >
              <Text className="text-white font-semibold">View all tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("./task-history")}
              className="bg-surface border border-border rounded-lg py-3 items-center"
            >
              <Text className="text-foreground font-semibold">Task history</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("./profile")}
              className="bg-surface border border-border rounded-lg py-3 items-center"
            >
              <Text className="text-foreground font-semibold">My performance</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
