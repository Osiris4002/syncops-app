import { useState } from "react";
import { ScrollView, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useColors } from "@/hooks/use-colors";

export default function SignUpScreen() {
  const router = useRouter();
  const colors = useColors();
  const { signUp, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"manager" | "staff">("staff");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSignUp = async () => {
    try {
      setLocalError(null);
      clearError();

      if (!name || !email || !password || !confirmPassword) {
        setLocalError("Please fill in all fields");
        return;
      }

      if (password !== confirmPassword) {
        setLocalError("Passwords do not match");
        return;
      }

      if (password.length < 6) {
        setLocalError("Password must be at least 6 characters");
        return;
      }

      await signUp(email, password, name, role);
      router.replace("/(tabs)");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Sign up failed";
      setLocalError(errorMessage);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 justify-center px-6 gap-4">
          {/* Header */}
          <View className="items-center gap-2 mb-4">
            <Text className="text-4xl font-bold text-foreground">Create Account</Text>
            <Text className="text-base text-muted">Join SyncOps</Text>
          </View>

          {/* Error Message */}
          {(error || localError) && (
            <View className="bg-error/10 border border-error rounded-lg p-4">
              <Text className="text-error text-sm font-medium">{error || localError}</Text>
            </View>
          )}

          {/* Name Input */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Full Name</Text>
            <TextInput
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              placeholder="Enter your full name"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              editable={!isLoading}
            />
          </View>

          {/* Email Input */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Email</Text>
            <TextInput
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              placeholder="Enter your email"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Password</Text>
            <TextInput
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              placeholder="Enter your password"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
              secureTextEntry
            />
          </View>

          {/* Confirm Password Input */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Confirm Password</Text>
            <TextInput
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              placeholder="Confirm your password"
              placeholderTextColor={colors.muted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isLoading}
              secureTextEntry
            />
          </View>

          {/* Role Selection */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Role</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setRole("staff")}
                disabled={isLoading}
                className={`flex-1 py-3 rounded-lg items-center border-2 ${
                  role === "staff"
                    ? "bg-primary border-primary"
                    : "bg-surface border-border"
                }`}
              >
                <Text
                  className={`font-semibold ${
                    role === "staff" ? "text-white" : "text-foreground"
                  }`}
                >
                  Staff
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setRole("manager")}
                disabled={isLoading}
                className={`flex-1 py-3 rounded-lg items-center border-2 ${
                  role === "manager"
                    ? "bg-primary border-primary"
                    : "bg-surface border-border"
                }`}
              >
                <Text
                  className={`font-semibold ${
                    role === "manager" ? "text-white" : "text-foreground"
                  }`}
                >
                  Manager
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            onPress={handleSignUp}
            disabled={isLoading}
            className="bg-primary rounded-lg py-3 items-center mt-2"
            style={{ opacity: isLoading ? 0.6 : 1 }}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login Link */}
          <View className="flex-row justify-center gap-2">
            <Text className="text-muted">Already have an account?</Text>
            <TouchableOpacity onPress={handleBackToLogin} disabled={isLoading}>
              <Text className="text-primary font-semibold">Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
