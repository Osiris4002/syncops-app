import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useTaskStore } from "@/lib/stores/task-store";
import { useEffect, useState } from "react";
import { useColors } from "@/hooks/use-colors";
import { isActiveTask } from "@/lib/task-utils";

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, signOut } = useAuthStore();
  const { tasks } = useTaskStore();
  const [isLoading, setIsLoading] = useState(false);

  const userTasks = tasks.filter((t) => t.assigned_to === user?.id);
  const completedTasks = userTasks.filter((t) => t.status === "completed").length;
  const pendingTasks = userTasks.filter((t) => isActiveTask(t.status)).length;

  const handleLogout = async () => {
    Alert.alert("Sign out", "Sign out of SyncOps?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Sign out",
        onPress: async () => {
          try {
            setIsLoading(true);
            await signOut();
            router.replace("/auth/login");
          } catch (error) {
            Alert.alert("Error", "Failed to logout");
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  if (!user) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color={colors.primary} size="large" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="px-4 py-6 gap-6">
          {/* Header */}
          <View className="gap-2">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-semibold">← Back</Text>
            </TouchableOpacity>
            <Text className="text-3xl font-bold text-foreground">Profile</Text>
            <Text className="text-base text-muted">Your account information</Text>
          </View>

          {/* Profile Card */}
          <View className="bg-surface rounded-lg p-6 border border-border gap-4">
            <View className="items-center gap-3">
              <View className="w-16 h-16 bg-primary rounded-full items-center justify-center">
                <Text className="text-2xl font-bold text-white">{user.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-foreground">{user.name}</Text>
                <Text className="text-sm text-muted capitalize">{user.role}</Text>
              </View>
            </View>

            <View className="h-px bg-border" />

            <View className="gap-3">
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Performance Score</Text>
                <Text className="text-sm font-semibold text-foreground">{user.performance_score.toFixed(1)}</Text>
              </View>
              <View className="h-px bg-border" />
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Tasks Completed</Text>
                <Text className="text-sm font-semibold text-foreground">{user.tasks_completed}</Text>
              </View>
              <View className="h-px bg-border" />
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Average Time</Text>
                <Text className="text-sm font-semibold text-foreground">{user.avg_time} min</Text>
              </View>
            </View>
          </View>

          {/* Task Statistics */}
          {user.role === "staff" && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">Task Statistics</Text>
              <View className="flex-row gap-3">
                <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                  <Text className="text-sm text-muted mb-1">Pending</Text>
                  <Text className="text-2xl font-bold text-warning">{pendingTasks}</Text>
                </View>
                <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                  <Text className="text-sm text-muted mb-1">Completed</Text>
                  <Text className="text-2xl font-bold text-success">{completedTasks}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Account Information */}
          <View className="bg-surface rounded-lg p-4 border border-border gap-4">
            <Text className="text-lg font-semibold text-foreground">Account Information</Text>

            <View className="gap-3">
              <View>
                <Text className="text-xs text-muted mb-1">User ID</Text>
                <Text className="text-sm font-mono text-foreground break-all">{user.id}</Text>
              </View>
              <View className="h-px bg-border" />
              <View>
                <Text className="text-xs text-muted mb-1">Role</Text>
                <Text className="text-sm font-semibold text-foreground capitalize">{user.role}</Text>
              </View>
              <View className="h-px bg-border" />
              <View>
                <Text className="text-xs text-muted mb-1">Member Since</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={handleLogout}
              disabled={isLoading}
              className="bg-error rounded-lg py-3 items-center"
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">Sign out</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
