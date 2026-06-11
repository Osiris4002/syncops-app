import { ScrollView, Text, View, TouchableOpacity, FlatList, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuthStore } from "@/lib/stores/auth-store";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useColors } from "@/hooks/use-colors";
import { getWorkforceRecommendation } from "@/lib/services/task-automation";

interface StaffAnalytics {
  id: string;
  name: string;
  performance_score: number;
  tasks_completed: number;
  avg_time: number;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const [staffAnalytics, setStaffAnalytics] = useState<StaffAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendation, setRecommendation] = useState<{
    recommendedStaffCount: number;
    reason: string;
  } | null>(null);

  useEffect(() => {
    if (user?.role !== "manager") {
      Alert.alert("Access denied", "Only managers can view team analytics.");
      router.replace("/");
    }
  }, [user?.role, router]);

  useEffect(() => {
    if (user?.role !== "manager") return;
    void fetchAnalytics();
    void fetchRecommendation();
  }, [user?.role]);

  const fetchRecommendation = async () => {
    try {
      const rec = await getWorkforceRecommendation();
      setRecommendation(rec);
    } catch (error) {
      console.error("Failed to fetch recommendation:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, name, performance_score, tasks_completed, avg_time")
        .eq("role", "staff")
        .order("performance_score", { ascending: false });

      if (error) throw error;
      setStaffAnalytics((data as StaffAnalytics[]) || []);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const topPerformer = staffAnalytics[0];
  const averageScore =
    staffAnalytics.length > 0
      ? (staffAnalytics.reduce((sum, s) => sum + s.performance_score, 0) / staffAnalytics.length).toFixed(1)
      : "0";
  const totalTasksCompleted = staffAnalytics.reduce((sum, s) => sum + s.tasks_completed, 0);

  const renderStaffItem = ({ item, index }: { item: StaffAnalytics; index: number }) => (
    <View className="bg-surface border border-border rounded-lg p-4 mb-3">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-muted">#{index + 1}</Text>
            <Text className="text-base font-semibold text-foreground">{item.name}</Text>
          </View>
          <Text className="text-xs text-muted mt-1">{item.tasks_completed} tasks completed</Text>
        </View>
        <View className="bg-primary/10 px-3 py-1 rounded-full">
          <Text className="text-sm font-bold text-primary">{item.performance_score.toFixed(1)}</Text>
        </View>
      </View>

      <View className="flex-row justify-between items-center">
        <Text className="text-xs text-muted">Avg Time: {item.avg_time} min</Text>
        <View className="w-24 h-2 bg-border rounded-full overflow-hidden">
          <View
            className="h-full bg-primary"
            style={{ width: `${Math.min((item.performance_score / 100) * 100, 100)}%` }}
          />
        </View>
      </View>
    </View>
  );

  if (user?.role !== "manager") {
    return null;
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
            <Text className="text-3xl font-bold text-foreground">Performance Analytics</Text>
            <Text className="text-base text-muted">Staff performance metrics</Text>
          </View>

          {/* Key Metrics */}
          <View className="gap-3">
            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-1">Team Average Score</Text>
              <Text className="text-3xl font-bold text-primary">{averageScore}</Text>
              <Text className="text-xs text-muted mt-2">Out of 100</Text>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                <Text className="text-sm text-muted mb-1">Total Tasks</Text>
                <Text className="text-2xl font-bold text-success">{totalTasksCompleted}</Text>
              </View>
              <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                <Text className="text-sm text-muted mb-1">Staff Members</Text>
                <Text className="text-2xl font-bold text-primary">{staffAnalytics.length}</Text>
              </View>
            </View>
          </View>

          {/* Top Performer */}
          {topPerformer && (
            <View className="bg-primary/10 border border-primary rounded-lg p-4 gap-2">
              <Text className="text-sm font-semibold text-primary">🏆 Top Performer</Text>
              <Text className="text-base font-bold text-foreground">{topPerformer.name}</Text>
              <Text className="text-xs text-muted">
                Score: {topPerformer.performance_score.toFixed(1)} • {topPerformer.tasks_completed} tasks
              </Text>
            </View>
          )}

          {/* Staff Rankings */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Staff Rankings</Text>

            {isLoading ? (
              <View className="flex-1 items-center justify-center py-6">
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : staffAnalytics.length > 0 ? (
              <FlatList
                data={staffAnalytics}
                renderItem={renderStaffItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <View className="bg-surface rounded-lg p-6 items-center border border-border">
                <Text className="text-muted text-center">No staff analytics available</Text>
              </View>
            )}
          </View>

          {recommendation && (
            <View className="bg-success/10 border border-success rounded-lg p-4 gap-2">
              <Text className="text-sm font-semibold text-success">Workforce recommendation</Text>
              <Text className="text-base font-bold text-foreground">
                Recommended staff count: {recommendation.recommendedStaffCount}
              </Text>
              <Text className="text-xs text-muted">{recommendation.reason}</Text>
            </View>
          )}

          {/* Insights */}
          <View className="bg-surface rounded-lg p-4 border border-border gap-3">
            <Text className="text-sm font-semibold text-foreground">Performance Insights</Text>
            <Text className="text-xs text-muted leading-relaxed">
              • Staff members are ranked by their performance score, which is calculated based on task completion rate, time efficiency, and quality.
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              • Average completion time helps identify efficiency opportunities and training needs.
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              • Regular monitoring helps optimize workforce allocation and identify top performers for recognition.
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              • Workforce recommendations use recent task volume versus current staff count.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
