import { ScrollView, Text, View, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useTaskStore } from "@/lib/stores/task-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useEffect, useState } from "react";
import { useColors } from "@/hooks/use-colors";
import { supabase, type User } from "@/lib/supabase";

export default function CreateTaskScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const { rooms, createTask, isLoading, fetchRooms } = useTaskStore();
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [expectedTime, setExpectedTime] = useState("30");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [staffLoading, setStaffLoading] = useState(false);

  const vacantRooms = rooms.filter((r) => r.status === "vacant");

  useEffect(() => {
    if (!selectedRoom) return;
    const stillVacant = rooms.some((r) => r.id === selectedRoom && r.status === "vacant");
    if (!stillVacant) setSelectedRoom("");
  }, [rooms, selectedRoom]);

  useEffect(() => {
    if (user?.role !== "manager") {
      Alert.alert("Access denied", "Only managers can create tasks.");
      router.replace("/");
    }
  }, [user?.role, router]);

  useEffect(() => {
    void fetchRooms();
    void fetchStaffMembers();
  }, []);

  const fetchStaffMembers = async () => {
    try {
      setStaffLoading(true);
      const { data, error } = await supabase.from("users").select("*").eq("role", "staff").order("name");

      if (error) throw error;
      setStaffMembers((data as User[]) || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
      Alert.alert("Error", "Failed to load staff members");
    } finally {
      setStaffLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!selectedRoom || !selectedStaff || !expectedTime) {
      Alert.alert("Validation", "Please fill in all required fields");
      return;
    }

    const room = rooms.find((r) => r.id === selectedRoom);
    if (!room || room.status !== "vacant") {
      Alert.alert("Invalid room", "You can only create cleaning tasks for vacant rooms.");
      return;
    }

    try {
      await createTask({
        room_id: selectedRoom,
        assigned_to: selectedStaff,
        status: "pending",
        priority,
        expected_time: parseInt(expectedTime, 10),
        actual_time: null,
        completed_at: null,
      });

      Alert.alert("Success", "Task created successfully");
      router.back();
    } catch {
      Alert.alert("Error", "Failed to create task");
    }
  };

  const priorityOptions: ("low" | "normal" | "high")[] = ["low", "normal", "high"];

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
            <Text className="text-3xl font-bold text-foreground">Create new task</Text>
            <Text className="text-base text-muted">Assign a cleaning task to staff</Text>
            <Text className="text-xs text-muted">
              Only vacant rooms can receive a new cleaning task. The room moves to cleaning when the task is created.
            </Text>
          </View>

          <View className="bg-surface rounded-lg p-4 border border-border gap-3">
            <Text className="text-sm font-semibold text-muted">Select vacant room *</Text>
            {vacantRooms.length === 0 ? (
              <Text className="text-muted text-sm">No vacant rooms available right now.</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                className="gap-2"
              >
                {vacantRooms.map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    onPress={() => setSelectedRoom(room.id)}
                    className={`px-4 py-2 rounded-lg border-2 ${
                      selectedRoom === room.id ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        selectedRoom === room.id ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {room.room_number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View className="bg-surface rounded-lg p-4 border border-border gap-3">
            <Text className="text-sm font-semibold text-muted">Assign to staff *</Text>
            {staffLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : staffMembers.length > 0 ? (
              <View className="gap-2">
                {staffMembers.map((staff) => (
                  <TouchableOpacity
                    key={staff.id}
                    onPress={() => setSelectedStaff(staff.id)}
                    className={`p-3 rounded-lg border-2 ${
                      selectedStaff === staff.id ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <View className="flex-row justify-between items-center">
                      <Text
                        className={`font-semibold ${
                          selectedStaff === staff.id ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {staff.name}
                      </Text>
                      <Text className="text-xs text-muted">Score: {staff.performance_score}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text className="text-muted">No staff members available</Text>
            )}
          </View>

          <View className="bg-surface rounded-lg p-4 border border-border gap-3">
            <Text className="text-sm font-semibold text-muted">Expected time (minutes) *</Text>
            <TextInput
              value={expectedTime}
              onChangeText={setExpectedTime}
              keyboardType="number-pad"
              placeholder="30"
              className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
              placeholderTextColor={colors.muted}
            />
          </View>

          <View className="bg-surface rounded-lg p-4 border border-border gap-3">
            <Text className="text-sm font-semibold text-muted">Priority</Text>
            <View className="gap-2">
              {priorityOptions.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  className={`p-3 rounded-lg border-2 ${
                    priority === p ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  <Text
                    className={`font-semibold capitalize ${
                      priority === p ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            onPress={() => void handleCreateTask()}
            disabled={isLoading || !selectedRoom || !selectedStaff}
            className={`rounded-lg py-3 items-center ${
              isLoading || !selectedRoom || !selectedStaff ? "bg-muted" : "bg-primary"
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Create task</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
