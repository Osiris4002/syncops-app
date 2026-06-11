import type { Task } from "@/lib/supabase";

export const ACTIVE_TASK_STATUSES: Task["status"][] = ["pending", "in-progress", "rework"];

export function isActiveTask(status: Task["status"]): boolean {
  return ACTIVE_TASK_STATUSES.includes(status);
}

export function taskDisplayNumber(task: Pick<Task, "id" | "task_number">): string {
  if (typeof task.task_number === "number") return `#${task.task_number}`;
  return `#${task.id.slice(0, 8).toUpperCase()}`;
}
