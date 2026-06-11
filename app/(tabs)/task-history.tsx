import { ScrollView, Text, View, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useTaskStore } from "@/lib/stores/task-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useEffect, useState } from "react";
import { useColors } from "@/hooks/use-colors";
import { taskDisplayNumber } from "@/lib/task-utils";

export default function TaskHistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const { tasks, rooms, isLoading, fetchTasksByAssignee, fetchTasks, fetchRooms } = useTaskStore();
  const [filterPeriod, setFilterPeriod] = useState<"today" | "week" | "month" | "all">("week");

  useEffect(() => {
    void fetchRooms();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role === "manager") {
      void fetchTasks();
    } else {
      void fetchTasksByAssignee(user.id);
    }
  }, [user?.id, user?.role]);

  const getFilteredTasks = () => {
    const completedTasks = tasks.filter((t) => t.status === "completed");
    const now = new Date();

    switch (filterPeriod) {
      case "today":
        return completedTasks.filter((t) => {
          const taskDate = new Date(t.completed_at || t.updated_at);
          return taskDate.toDateString() === now.toDateString();
        });
      case "week": {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return completedTasks.filter((t) => {
          const taskDate = new Date(t.completed_at || t.updated_at);
          return taskDate >= weekAgo;
        });
      }
      case "month": {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return completedTasks.filter((t) => {
          const taskDate = new Date(t.completed_at || t.updated_at);
          return taskDate >= monthAgo;
        });
      }
      default:
        return completedTasks;
    }
  };

  const calculateStats = () => {
    const filtered = getFilteredTasks();
    const totalTasks = filtered.length;
    const totalTime = filtered.reduce((sum, t) => sum + (t.actual_time || 0), 0);
    const avgTime = totalTasks > 0 ? Math.round(totalTime / totalTasks) : 0;

    return { totalTasks, totalTime, avgTime };
  };

  const stats = calculateStats();
  const filteredTasks = getFilteredTasks();

  const renderTaskItem = ({ item }: { item: (typeof tasks)[0] }) => {
    const room = rooms.find((r) => r.id === item.room_id);
    const efficiency =
      item.expected_time > 0
        ? Math.round((item.expected_time / (item.actual_time || item.expected_time)) * 100)
        : 100;

    return (
      <TouchableOpacity
        onPress={() => router.push(`./task/${item.id}`)}
        className="bg-surface border border-border rounded-lg p-4 mb-3"
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground">Room {room?.room_number ?? item.room_id}</Text>
            <Text className="text-xs text-muted mt-1">Task {taskDisplayNumber(item)}</Text>
            <Text className="text-sm text-muted mt-1">
              {new Date(item.completed_at || item.updated_at).toLocaleDateString()}
            </Text>
          </View>
          <View className="bg-success/20 px-3 py-1 rounded-full">
            <Text className="text-success text-xs font-semibold">Completed</Text>
          </View>
        </View>

        <View className="gap-2">
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted">Expected time</Text>
            <Text className="text-sm font-semibold text-foreground">{item.expected_time} min</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted">Actual time</Text>
            <Text className="text-sm font-semibold text-foreground">{item.actual_time ?? "—"} min</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted">Efficiency</Text>
            <Text className={`text-sm font-semibold ${efficiency >= 100 ? "text-success" : "text-warning"}`}>
              {efficiency}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const periods: ("today" | "week" | "month" | "all")[] = ["today", "week", "month", "all"];

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="px-4 py-6 gap-6">
          <View className="gap-2">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-semibold">← Back</Text>
            </TouchableOpacity>
            <Text className="text-3xl font-bold text-foreground">Task history</Text>
            <Text className="text-base text-muted">
              {user?.role === "manager" ? "Completed tasks across the team" : "Your completed tasks"}
            </Text>
          </View>

          <View className="gap-3">
            <View className="bg-surface rounded-lg p-4 border border-border gap-3">
              <Text className="text-sm font-semibold text-muted">Performance summary</Text>
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">Total tasks</Text>
                  <Text className="text-lg font-bold text-foreground">{stats.totalTasks}</Text>
                </View>
                <View className="h-px bg-border" />
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">Total time</Text>
                  <Text className="text-lg font-bold text-foreground">{stats.totalTime} min</Text>
                </View>
                <View className="h-px bg-border" />
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">Average time</Text>
                  <Text className="text-lg font-bold text-foreground">{stats.avgTime} min</Text>
                </View>
              </View>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="gap-2"
            contentContainerStyle={{ gap: 8 }}
          >
            {periods.map((period) => (
              <TouchableOpacity
                key={period}
                onPress={() => setFilterPeriod(period)}
                className={`px-4 py-2 rounded-full border capitalize ${
                  filterPeriod === period ? "bg-primary border-primary" : "bg-surface border-border"
                }`}
              >
                <Text
                  className={`font-semibold capitalize ${
                    filterPeriod === period ? "text-white" : "text-foreground"
                  }`}
                >
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

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
              <Text className="text-muted text-center">No completed tasks in this period</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
