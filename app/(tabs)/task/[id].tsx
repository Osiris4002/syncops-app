import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useTaskStore } from "@/lib/stores/task-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useColors } from "@/hooks/use-colors";
import { supabase, type Task } from "@/lib/supabase";
import { taskDisplayNumber } from "@/lib/task-utils";

function elapsedSecondsFromTask(task: Task): number {
  const base = task.timer_elapsed_seconds ?? 0;
  if (task.timer_started_at && task.status === "in-progress") {
    const startedAt = new Date(task.timer_started_at).getTime();
    const running = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    return base + running;
  }
  return base;
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const { tasks, rooms, isLoading, fetchTasks, fetchTasksByAssignee, updateTask, fetchRooms } = useTaskStore();

  const [remoteTask, setRemoteTask] = useState<Task | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const task = useMemo(() => {
    const fromStore = tasks.find((t) => t.id === id);
    return fromStore ?? remoteTask;
  }, [tasks, id, remoteTask]);

  const room = useMemo(() => rooms.find((r) => r.id === task?.room_id), [rooms, task?.room_id]);

  const loadTask = useCallback(async () => {
    if (!id) return;
    try {
      setLoadError(null);
      const { data, error } = await supabase.from("tasks").select("*").eq("id", id).single();
      if (error) throw error;
      setRemoteTask(data as Task);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [id]);

  useEffect(() => {
    void fetchRooms();
  }, []);

  useEffect(() => {
    if (!user || !id) return;
    if (user.role === "manager") {
      void fetchTasks();
    } else {
      void fetchTasksByAssignee(user.id);
    }
  }, [user?.id, user?.role, id]);

  useEffect(() => {
    if (!id) return;
    if (!tasks.some((t) => t.id === id)) {
      void loadTask();
    }
  }, [id, tasks, loadTask]);

  useEffect(() => {
    if (!timerRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning]);

  useEffect(() => {
    if (!task) return;
    setElapsedSec(elapsedSecondsFromTask(task));
    setTimerRunning(Boolean(task.timer_started_at && task.status === "in-progress"));
  }, [task?.id, task?.status, task?.timer_elapsed_seconds, task?.timer_started_at]);

  if (!user || !id) {
    return null;
  }

  if (loadError && !task) {
    return (
      <ScreenContainer className="bg-background p-6">
        <Text className="text-error">{loadError}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary font-semibold">← Back</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  if (!task && isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color={colors.primary} size="large" />
      </ScreenContainer>
    );
  }

  if (!task) {
    return (
      <ScreenContainer className="bg-background p-6">
        <Text className="text-foreground">Task not found.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary font-semibold">← Back</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const isManager = user.role === "manager";
  const isAssignee = task.assigned_to === user.id;

  if (!isManager && !isAssignee) {
    return (
      <ScreenContainer className="bg-background p-6">
        <Text className="text-foreground">You do not have access to this task.</Text>
        <TouchableOpacity onPress={() => router.replace("/")} className="mt-4">
          <Text className="text-primary font-semibold">Go home</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const handleStart = async () => {
    try {
      const shouldResetTimer = task.status === "pending";
      await updateTask(task.id, {
        status: "in-progress",
        timer_started_at: new Date().toISOString(),
        timer_elapsed_seconds: shouldResetTimer ? 0 : elapsedSec,
        latest_remark: task.status === "rework" ? "Rework started by staff" : task.latest_remark,
      });
      if (shouldResetTimer) setElapsedSec(0);
      setTimerRunning(true);
    } catch {
      Alert.alert("Error", "Could not start task");
    }
  };

  const handlePause = () => {
    void (async () => {
      try {
        await updateTask(task.id, {
          timer_started_at: null,
          timer_elapsed_seconds: elapsedSec,
          actual_time: Math.max(1, Math.ceil(elapsedSec / 60)),
        });
        setTimerRunning(false);
      } catch {
        Alert.alert("Error", "Could not pause task timer");
      }
    })();
  };

  const handleResume = () => {
    void (async () => {
      try {
        await updateTask(task.id, { status: "in-progress", timer_started_at: new Date().toISOString() });
        setTimerRunning(true);
      } catch {
        Alert.alert("Error", "Could not resume task timer");
      }
    })();
  };

  const handleManagerStatus = async (status: Task["status"]) => {
    try {
      const remarkByStatus: Record<Task["status"], string> = {
        pending: "Marked pending by manager",
        "in-progress": "Marked in-progress by manager",
        completed: "AI verified by manager",
        rework: "Rework by manager",
      };
      await updateTask(task.id, { status, latest_remark: remarkByStatus[status] });
      Alert.alert("Updated", "Task status saved");
    } catch {
      Alert.alert("Error", "Could not update task");
    }
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="px-4 py-6 gap-6">
          <View className="gap-2">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-semibold">← Back</Text>
            </TouchableOpacity>
            <Text className="text-3xl font-bold text-foreground">Task detail</Text>
            <Text className="text-base text-muted">Task {taskDisplayNumber(task)}</Text>
            <Text className="text-base text-muted">
              Room {room?.room_number ?? task.room_id}
            </Text>
          </View>

          <View className="bg-surface rounded-lg p-4 border border-border gap-3">
            <Row label="Status" value={task.status} />
            <Row label="Priority" value={task.priority} />
            <Row label="Expected" value={`${task.expected_time} min`} />
            <Row label="Actual" value={task.actual_time != null ? `${task.actual_time} min` : "—"} />
          </View>

          {isAssignee && user.role === "staff" && (task.status === "pending" || task.status === "in-progress" || task.status === "rework") && (
            <View className="bg-surface rounded-lg p-4 border border-border gap-4">
              <Text className="text-lg font-semibold text-foreground">Timer</Text>
              <Text className="text-4xl font-bold text-primary text-center">{timeLabel}</Text>
              <View className="flex-row gap-2">
                {(task.status === "pending" || task.status === "rework") && (
                  <TouchableOpacity onPress={() => void handleStart()} className="flex-1 bg-primary py-3 rounded-lg items-center">
                    <Text className="text-white font-semibold">{task.status === "rework" ? "Start rework" : "Start"}</Text>
                  </TouchableOpacity>
                )}
                {task.status === "in-progress" && timerRunning && (
                  <TouchableOpacity onPress={handlePause} className="flex-1 bg-warning py-3 rounded-lg items-center">
                    <Text className="text-white font-semibold">Pause</Text>
                  </TouchableOpacity>
                )}
                {task.status === "in-progress" && !timerRunning && elapsedSec > 0 && (
                  <TouchableOpacity onPress={handleResume} className="flex-1 bg-primary py-3 rounded-lg items-center">
                    <Text className="text-white font-semibold">Resume</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={() => router.push(`/task/${task.id}/camera`)}
                className="bg-primary py-3 rounded-lg items-center"
              >
                <Text className="text-white font-semibold">Submit verification photo</Text>
              </TouchableOpacity>
              <Text className="text-xs text-muted text-center">
                After you upload a room photo, AI estimates cleanliness. A manager can always override in AI
                reports.
              </Text>
            </View>
          )}

          {isManager && (
            <View className="bg-surface rounded-lg p-4 border border-border gap-3">
              <Text className="text-lg font-semibold text-foreground">Manager actions</Text>
              {(["pending", "in-progress", "completed", "rework"] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => void handleManagerStatus(status)}
                  className="py-2 px-3 rounded-lg border border-border bg-background"
                >
                  <Text className="text-foreground font-semibold capitalize">Set to {status}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {task.latest_remark ? (
            <View className="bg-surface rounded-lg p-4 border border-border gap-2">
              <Text className="text-sm text-muted">Latest remark</Text>
              <Text className="text-foreground font-medium">{task.latest_remark}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-sm font-semibold text-foreground capitalize">{value}</Text>
    </View>
  );
}
