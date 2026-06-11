import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useShallow } from "zustand/react/shallow";
import { useTaskStore } from "@/lib/stores/task-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useColors } from "@/hooks/use-colors";
import { supabase } from "@/lib/supabase";
import { taskDisplayNumber } from "@/lib/task-utils";

export default function MyTasksScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const { tasks, isLoading, refreshManagerHome, refreshStaffHome } = useTaskStore(
    useShallow((s) => ({
      tasks: s.tasks,
      isLoading: s.isLoading,
      refreshManagerHome: s.refreshManagerHome,
      refreshStaffHome: s.refreshStaffHome,
    })),
  );
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [staffById, setStaffById] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    if (user?.role === "manager") await refreshManagerHome();
    else if (user?.id) await refreshStaffHome(user.id);
  }, [user?.role, user?.id, refreshManagerHome, refreshStaffHome]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  useEffect(() => {
    if (user?.role !== "manager") return;
    void (async () => {
      const { data, error } = await supabase.from("users").select("id,name").eq("role", "staff");
      if (error || !data) return;
      const map = data.reduce<Record<string, string>>((acc, item) => {
        acc[item.id as string] = item.name as string;
        return acc;
      }, {});
      setStaffById(map);
    })();
  }, [user?.role]);

  const getFilteredTasks = () => {
    if (filterStatus === "all") {
      return tasks;
    }
    return tasks.filter((t) => t.status === filterStatus);
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

  const filteredTasks = getFilteredTasks();
  const isManager = user?.role === "manager";

  const renderTaskItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`./task/${item.id}`)}
      className="bg-surface border border-border rounded-lg p-4 mb-3"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">
            Task {taskDisplayNumber(item)} - Room {item.room_id}
          </Text>
          <Text className="text-sm text-muted mt-1">Expected: {item.expected_time} min</Text>
        </View>
        <View className={`${getStatusColor(item.status)} px-3 py-1 rounded-full`}>
          <Text className="text-white text-xs font-semibold capitalize">{item.status}</Text>
        </View>
      </View>
      <View className="flex-row justify-between items-center">
        <Text className="text-xs text-muted">Priority: {item.priority}</Text>
        <Text className="text-xs text-muted">{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      {item.latest_remark ? <Text className="text-xs text-muted mt-2">Remark: {item.latest_remark}</Text> : null}
      {isManager && (
        <Text className="text-xs text-muted mt-2">
          Assigned to: {item.assigned_to ? (staffById[item.assigned_to] ?? item.assigned_to) : "Unassigned"}
        </Text>
      )}
    </TouchableOpacity>
  );

  const statusFilters = ["all", "pending", "in-progress", "completed", "rework"];

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
          {/* Header */}
          <View className="gap-2">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-semibold">← Back</Text>
            </TouchableOpacity>
            <Text className="text-3xl font-bold text-foreground">
              {user?.role === "manager" ? "All Tasks" : "My Tasks"}
            </Text>
            <Text className="text-base text-muted">{filteredTasks.length} tasks</Text>
          </View>

          {/* Filter Buttons */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="gap-2"
            contentContainerStyle={{ gap: 8 }}
          >
            {statusFilters.map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-full border ${
                  filterStatus === status
                    ? "bg-primary border-primary"
                    : "bg-surface border-border"
                }`}
              >
                <Text
                  className={`font-semibold capitalize ${
                    filterStatus === status ? "text-white" : "text-foreground"
                  }`}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Tasks List */}
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : filteredTasks.length > 0 ? (
            <FlatList
              data={filteredTasks}
              renderItem={renderTaskItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View className="bg-surface rounded-lg p-6 items-center border border-border">
              <Text className="text-muted text-center">No tasks found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
