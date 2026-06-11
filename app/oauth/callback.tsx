import { ThemedView } from "@/components/themed-view";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type OAuthParams = {
  code?: string;
  state?: string;
  error?: string;
  sessionToken?: string;
  user?: string;
};

function pickParam(
  params: OAuthParams,
  queryParams: Record<string, string | string[] | undefined> | null,
  key: keyof OAuthParams,
): string | undefined {
  const raw = params[key];
  if (raw != null && raw !== "") {
    return Array.isArray(raw) ? raw[0] : String(raw);
  }
  const q = queryParams?.[key];
  if (q == null) return undefined;
  return Array.isArray(q) ? q[0] : String(q);
}

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<OAuthParams>();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      console.log("[OAuth] Callback handler triggered");
      const parsedInitial = await Linking.parseInitialURLAsync();
      const queryParams = parsedInitial.queryParams ?? {};

      const code = pickParam(params, queryParams, "code");
      const state = pickParam(params, queryParams, "state");
      const errorParam = pickParam(params, queryParams, "error");
      const sessionToken = pickParam(params, queryParams, "sessionToken");
      const userParam = pickParam(params, queryParams, "user");

      console.log("[OAuth] Params received:", {
        code: code ? `${code.substring(0, 12)}…` : undefined,
        state: state ? `${state.substring(0, 12)}…` : undefined,
        error: errorParam,
        sessionToken: sessionToken ? "present" : "missing",
        user: userParam ? "present" : "missing",
      });

      try {
        if (sessionToken) {
          console.log("[OAuth] Session token found (callback)");
          await Auth.setSessionToken(sessionToken);

          if (userParam) {
            try {
              const userJson =
                typeof atob !== "undefined"
                  ? atob(userParam)
                  : Buffer.from(userParam, "base64").toString("utf-8");
              const userData = JSON.parse(userJson);
              const userInfo: Auth.User = {
                id: userData.id,
                openId: userData.openId,
                name: userData.name,
                email: userData.email,
                loginMethod: userData.loginMethod,
                lastSignedIn: new Date(userData.lastSignedIn || Date.now()),
              };
              await Auth.setUserInfo(userInfo);
              console.log("[OAuth] User info stored:", userInfo);
            } catch (err) {
              console.error("[OAuth] Failed to parse user data:", err);
            }
          }

          setStatus("success");
          setTimeout(() => {
            router.replace("/(tabs)");
          }, 1000);
          return;
        }

        if (errorParam) {
          console.error("[OAuth] Error parameter:", errorParam);
          setStatus("error");
          setErrorMessage(errorParam || "OAuth error occurred");
          return;
        }

        const hasOAuthPayload = !!(code && state);
        if (!hasOAuthPayload) {
          // Expo Go / dev client reports exp://… as the initial URL with no OAuth query string.
          // Opening /oauth/callback without a real redirect should return to login, not throw.
          console.log(
            "[OAuth] No OAuth code/state in route or initial URL — not a redirect callback. Redirecting to login.",
          );
          router.replace("/auth/login");
          return;
        }

        console.log("[OAuth] Exchanging code for session token...");
        const result = await Api.exchangeOAuthCode(code, state);
        console.log("[OAuth] Exchange result:", {
          hasSessionToken: !!result.sessionToken,
          hasUser: !!result.user,
        });

        if (result.sessionToken) {
          await Auth.setSessionToken(result.sessionToken);

          if (result.user) {
            const userInfo: Auth.User = {
              id: result.user.id,
              openId: result.user.openId,
              name: result.user.name,
              email: result.user.email,
              loginMethod: result.user.loginMethod,
              lastSignedIn: new Date(result.user.lastSignedIn || Date.now()),
            };
            await Auth.setUserInfo(userInfo);
            console.log("[OAuth] User info stored:", userInfo);
          }

          setStatus("success");
          setTimeout(() => {
            router.replace("/(tabs)");
          }, 1000);
        } else {
          console.error("[OAuth] No session token in result:", result);
          setStatus("error");
          setErrorMessage("No session token received");
        }
      } catch (error) {
        console.error("[OAuth] Callback error:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to complete authentication",
        );
      }
    };

    handleCallback();
  }, [
    params.code,
    params.state,
    params.error,
    params.sessionToken,
    params.user,
    router,
  ]);

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <ThemedView className="flex-1 items-center justify-center gap-4 p-5">
        {status === "processing" && (
          <>
            <ActivityIndicator size="large" />
            <Text className="mt-4 text-base leading-6 text-center text-foreground">
              Completing authentication...
            </Text>
          </>
        )}
        {status === "success" && (
          <>
            <Text className="text-base leading-6 text-center text-foreground">
              Authentication successful!
            </Text>
            <Text className="text-base leading-6 text-center text-foreground">Redirecting...</Text>
          </>
        )}
        {status === "error" && (
          <>
            <Text className="mb-2 text-xl font-bold leading-7 text-error">Authentication failed</Text>
            <Text className="text-base leading-6 text-center text-foreground">{errorMessage}</Text>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
