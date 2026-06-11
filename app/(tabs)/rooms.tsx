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
import { useCallback, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useTaskStore } from "@/lib/stores/task-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useColors } from "@/hooks/use-colors";

export default function RoomsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const { rooms, isLoading, fetchRooms } = useTaskStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void fetchRooms({ silent: true });
    }, [fetchRooms]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchRooms({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [fetchRooms]);

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-error";
      case "normal":
        return "text-foreground";
      case "low":
        return "text-muted";
      default:
        return "text-foreground";
    }
  };

  const renderRoomItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`./room/${item.id}`)}
      className="bg-surface border border-border rounded-lg p-4 mb-3"
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-foreground">Room {item.room_number}</Text>
          <View className="flex-row items-center gap-2 mt-2">
            <View className={`${getStatusColor(item.status)} px-3 py-1 rounded-full`}>
              <Text className="text-white text-xs font-semibold capitalize">{item.status}</Text>
            </View>
            <Text className={`text-xs font-semibold capitalize ${getPriorityColor(item.priority)}`}>
              {item.priority} priority
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
  const vacantRooms = rooms.filter((r) => r.status === "vacant").length;
  const cleaningRooms = rooms.filter((r) => r.status === "cleaning").length;

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
            <Text className="text-3xl font-bold text-foreground">Rooms</Text>
            <Text className="text-base text-muted">{rooms.length} total rooms</Text>
          </View>

          {/* Stats */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-1">Occupied</Text>
              <Text className="text-2xl font-bold text-error">{occupiedRooms}</Text>
            </View>
            <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-1">Vacant</Text>
              <Text className="text-2xl font-bold text-success">{vacantRooms}</Text>
            </View>
            <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-1">Cleaning</Text>
              <Text className="text-2xl font-bold text-warning">{cleaningRooms}</Text>
            </View>
          </View>

          {/* Rooms List */}
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : rooms.length > 0 ? (
            <FlatList
              data={rooms}
              renderItem={renderRoomItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              removeClippedSubviews
            />
          ) : (
            <View className="bg-surface rounded-lg p-6 items-center border border-border">
              <Text className="text-muted text-center">No rooms found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
