import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Image as RNImage } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/stores/auth-store";
import { processCompletedTask } from "@/lib/services/task-automation";

function paramToString(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default function TaskCameraScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const taskId = paramToString(params.id);
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user?.role !== "staff") {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <Text className="text-foreground text-center">Only staff can submit verification photos.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-primary rounded-lg px-6 py-3">
          <Text className="text-white font-semibold">Go back</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  if (!taskId) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <Text className="text-foreground text-center">Missing task. Go back and open the task again.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-primary rounded-lg px-6 py-3">
          <Text className="text-white font-semibold">Go back</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const openCamera = async () => {
    try {
      setBusy(true);
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) {
        Alert.alert("Camera", "Camera permission is required to take a photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setPickedUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Camera", "Could not open the camera.");
    } finally {
      setBusy(false);
    }
  };

  const openLibrary = async () => {
    try {
      setBusy(true);
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!lib.granted) {
        Alert.alert("Photos", "Photo library permission is required to choose an image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsMultipleSelection: false,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setPickedUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Photos", "Could not open the photo library.");
    } finally {
      setBusy(false);
    }
  };

  const handleUploadImage = async () => {
    if (!pickedUri) {
      Alert.alert("Missing image", "Take a photo or choose one from your gallery first.");
      return;
    }

    try {
      setIsUploading(true);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        throw new Error("Session expired. Please sign in again before uploading.");
      }

      const response = await fetch(pickedUri);
      const arrayBuffer = await response.arrayBuffer();
      const fileName = `${taskId}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("task-images")
        .upload(fileName, arrayBuffer, {
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("task-images").getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("images").insert({
        task_id: taskId,
        image_url: publicData.publicUrl,
        ai_result: null,
        confidence: null,
      });

      if (dbError) throw dbError;

      await processCompletedTask(taskId);

      Alert.alert("Success", "Image uploaded and sent for verification.");
      setPickedUri(null);
      router.back();
    } catch (error) {
      console.error("Upload error:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("row-level security policy")) {
        Alert.alert(
          "Upload blocked",
          "Storage permissions are not configured yet. Ask the manager/admin to apply the latest Supabase migration for task image uploads.",
        );
      } else {
        Alert.alert("Upload failed", message);
      }
    } finally {
      setIsUploading(false);
    }
  };

  if (pickedUri) {
    return (
      <ScreenContainer className="bg-background">
        <View className="flex-1 gap-4 p-4">
          <View className="gap-2">
            <TouchableOpacity onPress={() => setPickedUri(null)}>
              <Text className="text-primary font-semibold">← Choose again</Text>
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-foreground">Review image</Text>
          </View>

          <View className="flex-1 bg-surface rounded-lg overflow-hidden border border-border min-h-[200px]">
            <RNImage source={{ uri: pickedUri }} className="w-full h-full" resizeMode="contain" />
          </View>

          <TouchableOpacity
            onPress={() => void handleUploadImage()}
            disabled={isUploading}
            className="bg-primary rounded-lg py-3 items-center"
          >
            {isUploading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold">Upload for verification</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <View className="flex-1 gap-6 px-4 py-6">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-primary font-semibold">← Cancel</Text>
        </TouchableOpacity>

        <View className="gap-2">
          <Text className="text-2xl font-bold text-foreground">Verification photo</Text>
          <Text className="text-sm text-muted">
            Take a new picture or pick one from your gallery, then upload for AI review.
          </Text>
        </View>

        {busy ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : (
          <View className="gap-4">
            <TouchableOpacity
              onPress={() => void openCamera()}
              className="bg-primary rounded-lg py-4 items-center"
            >
              <Text className="text-white font-semibold text-base">Take photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void openLibrary()}
              className="bg-surface border border-border rounded-lg py-4 items-center"
            >
              <Text className="text-foreground font-semibold text-base">Choose from gallery</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
