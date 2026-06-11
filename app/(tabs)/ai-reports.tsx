import { ScrollView, Text, View, TouchableOpacity, FlatList, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useTaskStore } from "@/lib/stores/task-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useEffect, useState } from "react";
import { useColors } from "@/hooks/use-colors";
import { supabase, type Image as TaskImage } from "@/lib/supabase";
import { taskDisplayNumber } from "@/lib/task-utils";

export default function AIReportsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const { tasks, rooms, updateTask, isLoading, fetchTasks, fetchRooms } = useTaskStore();
  const [taskImages, setTaskImages] = useState<Map<string, TaskImage[]>>(new Map());
  const [imagesLoading, setImagesLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== "manager") {
      Alert.alert("Access denied", "Only managers can view AI reports.");
      router.replace("/");
    }
  }, [user?.role, router]);

  useEffect(() => {
    if (user?.role !== "manager") return;
    void fetchTasks();
    void fetchRooms();
    void fetchAllTaskImages();
  }, [user?.role, fetchTasks, fetchRooms]);

  const fetchAllTaskImages = async () => {
    try {
      setImagesLoading(true);
      const { data, error } = await supabase.from("images").select("*").order("created_at", { ascending: false });

      if (error) throw error;

      const imageMap = new Map<string, TaskImage[]>();
      (data as TaskImage[]).forEach((img) => {
        if (!imageMap.has(img.task_id)) {
          imageMap.set(img.task_id, []);
        }
        imageMap.get(img.task_id)!.push(img);
      });
      setTaskImages(imageMap);
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setImagesLoading(false);
    }
  };

  const handleApprove = async (taskId: string) => {
    try {
      await updateTask(taskId, { status: "completed", latest_remark: "AI verified by manager" });
      Alert.alert("Success", "Task approved");
      void fetchTasks();
      void fetchRooms({ silent: true });
    } catch {
      Alert.alert("Error", "Failed to approve task");
    }
  };

  const handleReject = async (taskId: string) => {
    try {
      await updateTask(taskId, { status: "rework", latest_remark: "Rework by manager after AI review" });
      Alert.alert("Success", "Task sent back for rework");
      void fetchTasks();
      void fetchRooms({ silent: true });
    } catch {
      Alert.alert("Error", "Failed to reject task");
    }
  };

  const tasksWithAI = tasks.filter((t) => t.status === "completed" || t.status === "rework");

  const completedWithAI = tasksWithAI.filter((t) => t.status === "completed").length;
  const reworkRequired = tasksWithAI.filter((t) => t.status === "rework").length;
  const successRate =
    tasksWithAI.length > 0 ? ((completedWithAI / tasksWithAI.length) * 100).toFixed(1) : "0";

  const getConfidenceColor = (confidence: number | null) => {
    if (!confidence) return "text-muted";
    if (confidence >= 80) return "text-success";
    if (confidence >= 60) return "text-warning";
    return "text-error";
  };

  const renderReportItem = ({ item }: { item: (typeof tasks)[0] }) => {
    const room = rooms.find((r) => r.id === item.room_id);
    const images = taskImages.get(item.id) || [];
    const latestImage = images[0];

    return (
      <View className="bg-surface border border-border rounded-lg p-4 mb-3">
        <View className="gap-3">
          <TouchableOpacity
            onPress={() => router.push(`./task/${item.id}`)}
            className="flex-row justify-between items-start"
          >
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">Room {room?.room_number}</Text>
              <Text className="text-xs text-muted mt-1">Task {taskDisplayNumber(item)}</Text>
              <Text className="text-sm text-muted mt-1">Status: {item.status}</Text>
              {item.latest_remark ? <Text className="text-xs text-muted mt-1">Remark: {item.latest_remark}</Text> : null}
            </View>
            <View className={`${item.status === "completed" ? "bg-success" : "bg-error"} px-3 py-1 rounded-full`}>
              <Text className="text-white text-xs font-semibold capitalize">{item.status}</Text>
            </View>
          </TouchableOpacity>

          {latestImage && (
            <View className="bg-background rounded-lg p-3 gap-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm font-semibold text-foreground">AI result</Text>
                {latestImage.ai_result && (
                  <View
                    className={`px-3 py-1 rounded-full ${
                      latestImage.ai_result === "clean" ? "bg-success/20" : "bg-error/20"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold capitalize ${
                        latestImage.ai_result === "clean" ? "text-success" : "text-error"
                      }`}
                    >
                      {latestImage.ai_result}
                    </Text>
                  </View>
                )}
              </View>
              {latestImage.confidence != null && (
                <Text className={`text-sm font-semibold ${getConfidenceColor(latestImage.confidence)}`}>
                  Confidence: {latestImage.confidence}%
                </Text>
              )}
            </View>
          )}

          {item.status === "completed" && latestImage?.confidence != null && latestImage.confidence < 80 && (
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => void handleApprove(item.id)}
                className="flex-1 bg-success rounded-lg py-2 items-center"
              >
                <Text className="text-white font-semibold">Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleReject(item.id)}
                className="flex-1 bg-error rounded-lg py-2 items-center"
              >
                <Text className="text-white font-semibold">Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.status === "rework" && (
            <TouchableOpacity
              onPress={() => void handleApprove(item.id)}
              className="bg-primary rounded-lg py-2 items-center"
            >
              <Text className="text-white font-semibold">Mark as complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (user?.role !== "manager") {
    return null;
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="px-4 py-6 gap-6">
          <View className="gap-2">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-semibold">← Back</Text>
            </TouchableOpacity>
            <Text className="text-3xl font-bold text-foreground">AI verification reports</Text>
            <Text className="text-base text-muted">Cleanliness verification results</Text>
          </View>

          <View className="gap-3">
            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted mb-1">Success rate</Text>
              <Text className="text-3xl font-bold text-success">{successRate}%</Text>
              <Text className="text-xs text-muted mt-2">
                {completedWithAI} passed, {reworkRequired} rework
              </Text>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                <Text className="text-sm text-muted mb-1">Passed</Text>
                <Text className="text-2xl font-bold text-success">{completedWithAI}</Text>
              </View>
              <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                <Text className="text-sm text-muted mb-1">Rework</Text>
                <Text className="text-2xl font-bold text-error">{reworkRequired}</Text>
              </View>
            </View>
          </View>

          <View className="bg-primary/10 border border-primary rounded-lg p-4 gap-2">
            <Text className="text-sm font-semibold text-primary">How AI verification works</Text>
            <Text className="text-xs text-foreground leading-relaxed">
              The app analyzes room photos to estimate cleanliness. Completed tasks passed the threshold; rework
              indicates follow-up cleaning. Managers can override low-confidence results.
            </Text>
          </View>

          {imagesLoading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : null}

          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : tasksWithAI.length > 0 ? (
            <FlatList
              data={tasksWithAI}
              renderItem={renderReportItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View className="bg-surface rounded-lg p-6 items-center border border-border">
              <Text className="text-muted text-center">No AI verification reports yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
