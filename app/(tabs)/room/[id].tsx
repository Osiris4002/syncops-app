import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useTaskStore } from "@/lib/stores/task-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useEffect, useState } from "react";
import { useColors } from "@/hooks/use-colors";
import { isActiveTask, taskDisplayNumber } from "@/lib/task-utils";

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const { rooms, tasks, updateRoomStatus, isLoading } = useTaskStore();
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const room = rooms.find((r) => r.id === id);
  const roomTasks = tasks.filter((t) => t.room_id === id);

  useEffect(() => {
    if (room) {
      setSelectedStatus(room.status);
    }
  }, [room]);

  if (!room) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color={colors.primary} size="large" />
      </ScreenContainer>
    );
  }

  const handleStatusUpdate = async () => {
    if (selectedStatus === room.status) {
      Alert.alert("No Change", "Please select a different status");
      return;
    }

    try {
      await updateRoomStatus(room.id, selectedStatus as any);
      Alert.alert("Success", "Room status updated");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to update room status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "occupied":
        return "bg-error";
      case "vacant":
        return "bg-success";
      case "cleaning":
        return "bg-warning";
      default:
        return "bg-muted";
    }
  };

  const statusOptions = ["occupied", "vacant", "cleaning"];

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="px-4 py-6 gap-6">
          {/* Header */}
          <View className="gap-2">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-semibold">← Back</Text>
            </TouchableOpacity>
            <Text className="text-3xl font-bold text-foreground">Room {room.room_number}</Text>
            <Text className="text-base text-muted">Room Details</Text>
          </View>

          {/* Current Status */}
          <View className="bg-surface rounded-lg p-4 border border-border gap-3">
            <Text className="text-sm font-semibold text-muted">Current Status</Text>
            <View className="flex-row items-center gap-2">
              <View className={`${getStatusColor(room.status)} px-4 py-2 rounded-full`}>
                <Text className="text-white font-semibold capitalize">{room.status}</Text>
              </View>
              <Text className="text-sm text-muted">Priority: {room.priority}</Text>
            </View>
          </View>

          {/* Room Information */}
          <View className="bg-surface rounded-lg p-4 border border-border gap-4">
            <Text className="text-lg font-semibold text-foreground">Room Information</Text>

            <View className="gap-3">
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Room Number</Text>
                <Text className="text-sm font-semibold text-foreground">{room.room_number}</Text>
              </View>
              <View className="h-px bg-border" />
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Priority</Text>
                <Text className="text-sm font-semibold text-foreground capitalize">{room.priority}</Text>
              </View>
              <View className="h-px bg-border" />
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Active Tasks</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {roomTasks.filter((t) => isActiveTask(t.status)).length}
                </Text>
              </View>
              <View className="h-px bg-border" />
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Completed Tasks</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {roomTasks.filter((t) => t.status === "completed").length}
                </Text>
              </View>
            </View>
          </View>

          {/* Status Update Section */}
          {user?.role === "manager" && (
            <View className="bg-surface rounded-lg p-4 border border-border gap-4">
              <Text className="text-lg font-semibold text-foreground">Update Status</Text>

              <View className="gap-2">
                {statusOptions.map((status) => (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setSelectedStatus(status)}
                    className={`p-3 rounded-lg border-2 ${
                      selectedStatus === status ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <Text className={`font-semibold capitalize ${selectedStatus === status ? "text-primary" : "text-foreground"}`}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleStatusUpdate}
                disabled={isLoading}
                className="bg-primary rounded-lg py-3 items-center"
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold">Update Status</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Room Tasks */}
          {roomTasks.length > 0 && (
            <View className="bg-surface rounded-lg p-4 border border-border gap-4">
              <Text className="text-lg font-semibold text-foreground">Room Tasks</Text>
              {roomTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  onPress={() => router.push(`./task/${task.id}`)}
                  className="p-3 bg-background rounded-lg border border-border"
                >
                  <View className="flex-row justify-between items-center">
                    <Text className="text-sm font-semibold text-foreground capitalize">
                      Task {taskDisplayNumber(task)} - {task.status}
                    </Text>
                    <Text className="text-xs text-muted">{task.expected_time} min</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
