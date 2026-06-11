import { Tabs, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const hiddenTabHref = { href: null } as const;

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  const isMainHome =
    pathname === "/" ||
    pathname === "/(tabs)" ||
    pathname.endsWith("/index") ||
    pathname.endsWith("/(tabs)/index");

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: isMainHome
          ? {
              paddingTop: 8,
              paddingBottom: bottomPadding,
              height: tabBarHeight,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              borderTopWidth: 0.5,
            }
          : { display: "none" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen name="manager-home" options={{ ...hiddenTabHref }} />
      <Tabs.Screen name="staff-home" options={{ ...hiddenTabHref }} />
      <Tabs.Screen name="rooms" options={{ ...hiddenTabHref }} />
      <Tabs.Screen name="my-tasks" options={{ ...hiddenTabHref }} />
      <Tabs.Screen name="profile" options={{ ...hiddenTabHref }} />
      <Tabs.Screen name="analytics" options={{ ...hiddenTabHref }} />
      <Tabs.Screen name="ai-reports" options={{ ...hiddenTabHref }} />
      <Tabs.Screen name="admin" options={{ ...hiddenTabHref }} />
      <Tabs.Screen name="create-task" options={{ ...hiddenTabHref }} />
      <Tabs.Screen name="task-history" options={{ ...hiddenTabHref }} />
      <Tabs.Screen name="room/[id]" options={{ ...hiddenTabHref }} />
      <Tabs.Screen name="task/[id]" options={{ ...hiddenTabHref }} />
      <Tabs.Screen name="task/[id]/camera" options={{ ...hiddenTabHref }} />
    </Tabs>
  );
}
