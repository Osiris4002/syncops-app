import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Custom storage implementation for Expo
const ExpoSecureStorage = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error("Error reading from secure storage:", error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error("Error writing to secure storage:", error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error("Error removing from secure storage:", error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : ExpoSecureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database types
export interface User {
  id: string;
  name: string;
  role: "manager" | "staff";
  performance_score: number;
  tasks_completed: number;
  avg_time: number;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  room_number: string;
  status: "occupied" | "vacant" | "cleaning";
  priority: "low" | "normal" | "high";
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  task_number?: number | null;
  room_id: string;
  assigned_to: string | null;
  status: "pending" | "in-progress" | "completed" | "rework";
  priority: "low" | "normal" | "high";
  expected_time: number;
  actual_time: number | null;
  latest_remark?: string | null;
  timer_elapsed_seconds?: number;
  timer_started_at?: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Image {
  id: string;
  task_id: string;
  image_url: string;
  ai_result: "clean" | "rework" | null;
  confidence: number | null;
  created_at: string;
}

export interface PerformanceHistory {
  id: string;
  user_id: string;
  date: string;
  tasks_completed: number;
  avg_completion_time: number;
  success_rate: number;
  performance_score: number;
  created_at: string;
}

// Database type definitions for TypeScript
export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<User, "id" | "created_at" | "updated_at">>;
      };
      rooms: {
        Row: Room;
        Insert: Omit<Room, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Room, "id" | "created_at" | "updated_at">>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Task, "id" | "created_at" | "updated_at">>;
      };
      images: {
        Row: Image;
        Insert: Omit<Image, "id" | "created_at">;
        Update: Partial<Omit<Image, "id" | "created_at">>;
      };
      performance_history: {
        Row: PerformanceHistory;
        Insert: Omit<PerformanceHistory, "id" | "created_at">;
        Update: Partial<Omit<PerformanceHistory, "id" | "created_at">>;
      };
    };
  };
};
