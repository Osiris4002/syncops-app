import { create } from "zustand";
import { supabase, type User } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, name: string, role: "manager" | "staff") => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Check existing session
      const { data, error } = await supabase.auth.getSession();

      if (error) throw error;

      if (data.session) {
        // Fetch user profile
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.session.user.id)
          .single();

        if (userError) throw userError;

        set({
          session: data.session,
          user: userData,
          isAuthenticated: true,
        });
      }

      set({ isLoading: false });
    } catch (error) {
      console.error("Auth initialization error:", error);
      const message = error instanceof Error ? error.message : String(error);

      // Recover from stale or revoked refresh tokens by clearing local auth state.
      if (message.toLowerCase().includes("refresh token")) {
        await supabase.auth.signOut();
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: "Your previous session expired. Please sign in again.",
        });
        return;
      }

      set({ isLoading: false, error: message });
    }
  },

  signUp: async (email: string, password: string, name: string, role: "manager" | "staff") => {
    try {
      set({ isLoading: true, error: null });

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Create user profile
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          name,
          role,
        })
        .select()
        .single();

      if (userError) throw userError;

      set({
        session: authData.session,
        user: userData,
        isAuthenticated: !!authData.session,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("Failed to sign in");

      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (userError) throw userError;

      set({
        session: data.session,
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      set({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
