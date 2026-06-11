import { supabase, type User, type Task } from "@/lib/supabase";
import { classifyRoomImage } from "@/lib/services/teachable-inference";

/**
 * Task automation: assignment, performance scoring, AI verification hooks, workforce hints.
 */

export async function calculatePerformanceScore(userId: string): Promise<number> {
  try {
    const { data: user, error: userError } = await supabase.from("users").select("*").eq("id", userId).single();

    if (userError || !user) return 0;

    const tasksCompleted = user.tasks_completed || 0;
    const avgTime = user.avg_time || 30;
    const successRate = 0.9;

    const taskScore = (tasksCompleted / 100) * 0.4;
    const timeScore = Math.min(1, 30 / avgTime) * 0.3;
    const successScore = successRate * 0.3;

    return Math.round((taskScore + timeScore + successScore) * 100) / 100;
  } catch (error) {
    console.error("Error calculating performance score:", error);
    return 0;
  }
}

export async function getHighestScoringStaff(): Promise<User | null> {
  try {
    const { data: staffMembers, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "staff")
      .order("performance_score", { ascending: false })
      .limit(1);

    if (error || !staffMembers || staffMembers.length === 0) return null;

    return staffMembers[0] as User;
  } catch (error) {
    console.error("Error getting highest scoring staff:", error);
    return null;
  }
}

export async function autoAssignTask(roomId: string): Promise<Task | null> {
  try {
    const staff = await getHighestScoringStaff();
    if (!staff) {
      console.warn("No staff members available for task assignment");
      return null;
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        room_id: roomId,
        assigned_to: staff.id,
        status: "pending",
        priority: "normal",
        expected_time: 30,
        actual_time: null,
        completed_at: null,
      })
      .select()
      .single();

    if (error || !task) {
      console.error("Error creating task:", error);
      return null;
    }

    await supabase.from("rooms").update({ status: "cleaning" }).eq("id", roomId);

    return task as Task;
  } catch (error) {
    console.error("Error auto-assigning task:", error);
    return null;
  }
}

export async function updateStaffPerformance(userId: string): Promise<void> {
  try {
    const { data: completedTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", userId)
      .eq("status", "completed");

    if (tasksError) throw tasksError;

    if (!completedTasks || completedTasks.length === 0) return;

    const tasksCompleted = completedTasks.length;
    const avgTime = Math.round(
      completedTasks.reduce((sum, task) => sum + (task.actual_time || 0), 0) / tasksCompleted,
    );

    const performanceScore = await calculatePerformanceScore(userId);

    const { error: updateError } = await supabase
      .from("users")
      .update({
        tasks_completed: tasksCompleted,
        avg_time: avgTime,
        performance_score: performanceScore,
      })
      .eq("id", userId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error("Error updating staff performance:", error);
  }
}

export async function getWorkforceRecommendation(): Promise<{
  recommendedStaffCount: number;
  reason: string;
}> {
  try {
    const { data: staff, error: staffError } = await supabase.from("users").select("*").eq("role", "staff");

    if (staffError || !staff) {
      return {
        recommendedStaffCount: 3,
        reason: "Default recommendation",
      };
    }

    const today = new Date().toISOString().split("T")[0];
    const { data: todaysTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .gte("created_at", today);

    if (tasksError) throw tasksError;

    const taskCount = todaysTasks?.length || 0;
    const avgTasksPerStaff = staff.length > 0 ? taskCount / staff.length : 0;

    let recommendedCount = staff.length;
    let reason = "Current staffing level is optimal";

    if (avgTasksPerStaff > 5) {
      recommendedCount = Math.ceil(staff.length * 1.5);
      reason = "High task volume — consider increasing staff";
    } else if (avgTasksPerStaff < 2) {
      recommendedCount = Math.max(1, Math.floor(staff.length * 0.7));
      reason = "Low task volume — staffing can be reduced";
    }

    return {
      recommendedStaffCount: recommendedCount,
      reason,
    };
  } catch (error) {
    console.error("Error getting workforce recommendation:", error);
    return {
      recommendedStaffCount: 3,
      reason: "Unable to calculate recommendation",
    };
  }
}

export async function verifyImageWithAI(
  imageUrl: string,
  taskId: string,
): Promise<{
  result: "clean" | "rework";
  confidence: number;
}> {
  try {
    const out = await classifyRoomImage(imageUrl);
    if (out.classIndex === -1) {
      return { result: "rework", confidence: 0 };
    }
    return { result: out.result, confidence: out.confidence };
  } catch (error) {
    console.error(`Error verifying image for task ${taskId}:`, error);
    return {
      result: "rework",
      confidence: 0,
    };
  }
}

export async function processCompletedTask(taskId: string): Promise<void> {
  try {
    const { data: task, error: taskError } = await supabase.from("tasks").select("*").eq("id", taskId).single();

    if (taskError || !task) {
      console.error("Task not found:", taskId);
      return;
    }

    const { data: images, error: imagesError } = await supabase
      .from("images")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (imagesError || !images || images.length === 0) {
      console.log("No images found for task:", taskId);
      return;
    }

    const image = images[0];

    const aiResult = await verifyImageWithAI(image.image_url, taskId);

    const { error: updateError } = await supabase
      .from("images")
      .update({
        ai_result: aiResult.result,
        confidence: aiResult.confidence,
      })
      .eq("id", image.id);

    if (updateError) throw updateError;

    const newStatus = aiResult.result === "clean" ? "completed" : "rework";
    const elapsedBase = task.timer_elapsed_seconds ?? 0;
    const activeSeconds = task.timer_started_at
      ? Math.max(0, Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000))
      : 0;
    const totalElapsedSeconds = elapsedBase + activeSeconds;
    const completedAt = new Date().toISOString();
    const remark = newStatus === "completed" ? "AI verified" : "Rework by AI";

    const { error: taskUpdateError } = await supabase
      .from("tasks")
      .update({
        status: newStatus,
        latest_remark: remark,
        timer_started_at: null,
        timer_elapsed_seconds: totalElapsedSeconds,
        actual_time: Math.max(1, Math.ceil(totalElapsedSeconds / 60)),
        completed_at: newStatus === "completed" ? completedAt : null,
      })
      .eq("id", taskId);

    if (taskUpdateError) throw taskUpdateError;

    const nextRoomStatus = newStatus === "completed" ? "vacant" : "cleaning";
    await supabase.from("rooms").update({ status: nextRoomStatus }).eq("id", task.room_id);

    if (newStatus === "completed" && task.assigned_to) {
      await updateStaffPerformance(task.assigned_to);
    }
  } catch (error) {
    console.error("Error processing completed task:", error);
  }
}
