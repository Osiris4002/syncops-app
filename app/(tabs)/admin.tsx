import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useColors } from "@/hooks/use-colors";
import { supabase, type User } from "@/lib/supabase";

export default function AdminPanelScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"manager" | "staff">("staff");

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setUsers((data as User[]) || []);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "manager") {
      router.replace("/");
      return;
    }
    void loadUsers();
  }, [user?.role, loadUsers, router]);

  const userCount = useMemo(() => users.length, [users.length]);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Validation", "Name, email and password are required.");
      return;
    }
    try {
      setCreating(true);
      const { error } = await supabase.rpc("manager_create_app_user", {
        user_email: email.trim().toLowerCase(),
        user_password: password,
        user_name: name.trim(),
        user_role: role,
      });
      if (error) throw error;

      setName("");
      setEmail("");
      setPassword("");
      setRole("staff");
      await loadUsers();
      Alert.alert("Success", "User created successfully.");
    } catch (error) {
      Alert.alert("Create failed", error instanceof Error ? error.message : "Could not create user");
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = (target: User) => {
    Alert.alert("Delete user", `Delete ${target.name}? This removes app access for this user.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              const { error } = await supabase.rpc("manager_delete_app_user", { target_user_id: target.id });
              if (error) throw error;
              await loadUsers();
            } catch (err) {
              Alert.alert("Delete failed", err instanceof Error ? err.message : "Could not delete user");
            }
          })();
        },
      },
    ]);
  };

  if (user?.role !== "manager") return null;

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="px-4 py-6 gap-6">
          <View className="gap-2">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-semibold">← Back</Text>
            </TouchableOpacity>
            <Text className="text-3xl font-bold text-foreground">Admin panel</Text>
            <Text className="text-base text-muted">Create and manage manager/staff users</Text>
          </View>

          <View className="bg-surface rounded-lg p-4 border border-border gap-3">
            <Text className="text-sm font-semibold text-muted">Create user</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password (min 6 chars)"
              secureTextEntry
              className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
              placeholderTextColor={colors.muted}
            />
            <View className="flex-row gap-2">
              {(["staff", "manager"] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRole(r)}
                  className={`flex-1 rounded-lg border px-3 py-2 items-center ${
                    role === r ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  <Text className={`font-semibold capitalize ${role === r ? "text-primary" : "text-foreground"}`}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => void handleCreate()}
              disabled={creating}
              className={`rounded-lg py-3 items-center ${creating ? "bg-muted" : "bg-primary"}`}
            >
              {creating ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Create user</Text>}
            </TouchableOpacity>
          </View>

          <View className="bg-surface rounded-lg p-4 border border-border gap-3">
            <Text className="text-sm font-semibold text-muted">Users ({userCount})</Text>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              users.map((item) => (
                <View key={item.id} className="bg-background rounded-lg border border-border p-3 gap-2">
                  <Text className="text-base font-semibold text-foreground">{item.name}</Text>
                  <Text className="text-xs text-muted capitalize">{item.role}</Text>
                  <Text className="text-xs text-muted">{item.id}</Text>
                  {item.id !== user.id ? (
                    <TouchableOpacity onPress={() => confirmDelete(item)} className="bg-error rounded-lg py-2 items-center">
                      <Text className="text-white font-semibold">Delete</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text className="text-xs text-muted">Current account</Text>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
