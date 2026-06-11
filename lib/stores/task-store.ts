import { create } from "zustand";
import { supabase, type Task, type Room } from "@/lib/supabase";
import { autoAssignTask, updateStaffPerformance } from "@/lib/services/task-automation";

type FetchOpts = { silent?: boolean };

interface TaskState {
  tasks: Task[];
  rooms: Room[];
  isLoading: boolean;
  error: string | null;

  fetchTasks: (opts?: FetchOpts) => Promise<void>;
  fetchRooms: (opts?: FetchOpts) => Promise<void>;
  fetchTasksByAssignee: (userId: string, opts?: FetchOpts) => Promise<void>;
  refreshManagerHome: () => Promise<void>;
  refreshStaffHome: (userId: string) => Promise<void>;
  createTask: (task: Omit<Task, "id" | "created_at" | "updated_at">) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  updateRoomStatus: (roomId: string, status: Room["status"]) => Promise<void>;
  subscribeToTasks: () => () => void;
  subscribeToRooms: () => () => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  rooms: [],
  isLoading: false,
  error: null,

  fetchTasks: async (opts) => {
    const silent = opts?.silent === true;
    try {
      if (!silent) set({ isLoading: true, error: null });
      else set({ error: null });

      const { data, error } = await supabase.from("tasks").select("*");

      if (error) throw error;

      set({ tasks: (data as Task[]) || [] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage });
    } finally {
      if (!silent) set({ isLoading: false });
    }
  },

  fetchRooms: async (opts) => {
    const silent = opts?.silent === true;
    try {
      if (!silent) set({ isLoading: true, error: null });
      else set({ error: null });

      const { data, error } = await supabase.from("rooms").select("*");

      if (error) throw error;

      set({ rooms: (data as Room[]) || [] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage });
    } finally {
      if (!silent) set({ isLoading: false });
    }
  },

  fetchTasksByAssignee: async (userId, opts) => {
    const silent = opts?.silent === true;
    try {
      if (!silent) set({ isLoading: true, error: null });
      else set({ error: null });

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      set({ tasks: (data as Task[]) || [] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage });
    } finally {
      if (!silent) set({ isLoading: false });
    }
  },

  refreshManagerHome: async () => {
    try {
      set({ error: null });
      const [tasksRes, roomsRes] = await Promise.all([
        supabase.from("tasks").select("*"),
        supabase.from("rooms").select("*"),
      ]);
      if (tasksRes.error) throw tasksRes.error;
      if (roomsRes.error) throw roomsRes.error;
      set({
        tasks: (tasksRes.data as Task[]) || [],
        rooms: (roomsRes.data as Room[]) || [],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage });
    }
  },

  refreshStaffHome: async (userId: string) => {
    try {
      set({ error: null });
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      set({ tasks: (data as Task[]) || [] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage });
    }
  },

  createTask: async (task) => {
    try {
      set({ error: null });

      const { data, error } = await supabase.from("tasks").insert(task).select().single();

      if (error) throw error;
      if (!data) throw new Error("Failed to create task");

      const { error: roomErr } = await supabase
        .from("rooms")
        .update({ status: "cleaning" })
        .eq("id", task.room_id);
      if (roomErr) console.error("[createTask] Failed to set room to cleaning:", roomErr);

      const newTask = data as Task;
      set((state) => ({
        tasks: [newTask, ...state.tasks],
        rooms: state.rooms.map((r) =>
          r.id === task.room_id ? ({ ...r, status: "cleaning" } as Room) : r,
        ),
      }));

      return newTask;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage });
      throw error;
    }
  },

  updateTask: async (id, updates) => {
    try {
      set({ error: null });
      const existingTask = get().tasks.find((t) => t.id === id);

      const updatePayload: Partial<Task> = { ...updates };
      if (updatePayload.status === "completed" && !updatePayload.completed_at) {
        updatePayload.completed_at = new Date().toISOString();
      }
      if (updatePayload.status === "completed" && (updatePayload.actual_time == null || updatePayload.actual_time <= 0)) {
        const baseElapsed = existingTask?.timer_elapsed_seconds ?? 0;
        const runningElapsed =
          existingTask?.timer_started_at && existingTask.status === "in-progress"
            ? Math.max(0, Math.floor((Date.now() - new Date(existingTask.timer_started_at).getTime()) / 1000))
            : 0;
        const totalElapsedSeconds = baseElapsed + runningElapsed;
        updatePayload.actual_time =
          totalElapsedSeconds > 0
            ? Math.max(1, Math.ceil(totalElapsedSeconds / 60))
            : Math.max(1, existingTask?.expected_time ?? 1);
        updatePayload.timer_elapsed_seconds = totalElapsedSeconds;
        updatePayload.timer_started_at = null;
      }

      const { error } = await supabase.from("tasks").update(updatePayload).eq("id", id);

      if (error) throw error;

      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? ({ ...task, ...updatePayload } as Task) : task)),
      }));

      if (existingTask?.assigned_to && updatePayload.status === "completed") {
        await updateStaffPerformance(existingTask.assigned_to);
      }

      if (existingTask?.room_id && updatePayload.status) {
        const nextRoomStatus: Room["status"] =
          updatePayload.status === "completed" ? "vacant" : "cleaning";
        const { error: roomErr } = await supabase
          .from("rooms")
          .update({ status: nextRoomStatus })
          .eq("id", existingTask.room_id);
        if (roomErr) throw roomErr;
        if (!roomErr) {
          set((state) => ({
            rooms: state.rooms.map((room) =>
              room.id === existingTask.room_id ? ({ ...room, status: nextRoomStatus } as Room) : room,
            ),
          }));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage });
    }
  },

  updateRoomStatus: async (roomId, status) => {
    try {
      set({ error: null });

      const previousStatus = get().rooms.find((r) => r.id === roomId)?.status;

      const { error } = await supabase.from("rooms").update({ status }).eq("id", roomId);

      if (error) throw error;

      set((state) => ({
        rooms: state.rooms.map((room) => (room.id === roomId ? ({ ...room, status } as Room) : room)),
      }));

      // Only auto-assign a new cleaning task when a guest leaves (occupied → vacant).
      // cleaning → vacant means work finished; manager must not get a duplicate task.
      const shouldAutoAssignCleaning = status === "vacant" && previousStatus === "occupied";

      if (shouldAutoAssignCleaning) {
        const autoTask = await autoAssignTask(roomId);
        if (autoTask) {
          set((state) => ({
            tasks: [autoTask, ...state.tasks],
            rooms: state.rooms.map((room) =>
              room.id === roomId ? ({ ...room, status: "cleaning" } as Room) : room,
            ),
          }));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage });
    }
  },

  subscribeToTasks: () => {
    const channel = supabase
      .channel("tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload: any) => {
          const { eventType, new: newTask, old: oldTask } = payload;

          set((state) => {
            if (eventType === "INSERT" && newTask) {
              return { tasks: [newTask as Task, ...state.tasks] };
            }
            if (eventType === "UPDATE" && newTask) {
              return {
                tasks: state.tasks.map((task) =>
                  task.id === (newTask as Task).id ? (newTask as Task) : task,
                ),
              };
            }
            if (eventType === "DELETE" && oldTask) {
              return {
                tasks: state.tasks.filter((task) => task.id !== (oldTask as Task).id),
              };
            }
            return state;
          });
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  },

  subscribeToRooms: () => {
    const channel = supabase
      .channel("rooms")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        (payload: any) => {
          const { eventType, new: newRoom, old: oldRoom } = payload;

          set((state) => {
            if (eventType === "INSERT" && newRoom) {
              return { rooms: [newRoom as Room, ...state.rooms] };
            }
            if (eventType === "UPDATE" && newRoom) {
              return {
                rooms: state.rooms.map((room) =>
                  room.id === (newRoom as Room).id ? (newRoom as Room) : room,
                ),
              };
            }
            if (eventType === "DELETE" && oldRoom) {
              return {
                rooms: state.rooms.filter((room) => room.id !== (oldRoom as Room).id),
              };
            }
            return state;
          });
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  },

  clearError: () => set({ error: null }),
}));
