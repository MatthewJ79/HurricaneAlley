import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { ScreenName, StormFeedState, TabName } from "../types";

type IconName = ComponentProps<typeof Ionicons>["name"];

const tabs: { id: TabName; label: string; icon: IconName; active: IconName }[] = [
  { id: "home", label: "Home", icon: "home-outline", active: "home" },
  { id: "prepare", label: "Prepare", icon: "shield-checkmark-outline", active: "shield-checkmark" },
];

export function DataStatusBanner({ feed }: { feed: StormFeedState }) {
  const { theme } = useTheme();
  const live = feed.status === "live";
  const title =
    feed.status === "live"
      ? "LIVE NHC STORM SUMMARY"
      : feed.status === "loading"
        ? "CONNECTING TO HURRICANE ALLEY DATA"
        : feed.status === "cached"
          ? "CACHED NHC DATA — VERIFY CURRENT CONDITIONS"
          : "HISTORICAL DEMO — NOT CURRENT EMERGENCY INFORMATION";
  const subtitle =
    feed.status === "live"
      ? "Official NHC summaries, forecast tracks, and cones connected"
      : feed.status === "loading"
        ? "Historical demo remains visible while data loads"
        : feed.status === "cached"
          ? "The latest successful NHC response is being displayed"
          : "Hurricane Helene · September 2024";

  return (
    <View
      style={[
        styles.demo,
        { backgroundColor: live ? theme.cyan : theme.demo },
      ]}
    >
      <Text style={styles.demoTitle}>{title}</Text>
      <Text style={styles.demoSubtitle}>{subtitle}</Text>
    </View>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightContent,
  contentWidth,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightContent?: ReactNode;
  contentWidth?: number;
  compact?: boolean;
}) {
  const { theme, mode, toggleMode } = useTheme();
  return (
    <View
      style={[
        styles.header,
        compact && styles.headerCompact,
        contentWidth === undefined
          ? null
          : { width: contentWidth, alignSelf: "center" },
      ]}
    >
      <View style={styles.headerTitleRow}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} hitSlop={10}>
            <Ionicons name="arrow-back" color={theme.text} size={27} />
          </Pressable>
        ) : null}
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>{subtitle}</Text> : null}
        </View>
      </View>
      {rightContent || !onBack ? (
        <View style={styles.headerActions}>
          {rightContent}
          {!onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Use ${mode === "dark" ? "light" : "dark"} theme`}
              onPress={toggleMode}
              style={[styles.themeButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Ionicons name={mode === "dark" ? "sunny-outline" : "moon-outline"} color={theme.text} size={22} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function Screen({
  children,
  footerSpace = true,
}: PropsWithChildren<{ footerSpace?: boolean }>) {
  const { theme, mode } = useTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.scrollContent, footerSpace && styles.footerSpace]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function BottomTabs({
  screen,
  navigate,
}: {
  screen: ScreenName;
  navigate: (screen: ScreenName) => void;
}) {
  const { theme } = useTheme();
  return (
    <SafeAreaView style={[styles.tabSafe, { backgroundColor: theme.nav, borderColor: theme.border }]}>
      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const active = screen === tab.id;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => navigate(tab.id)}
              style={styles.tab}
            >
              <Ionicons name={active ? tab.active : tab.icon} size={24} color={active ? theme.cyan : theme.textFaint} />
              <Text style={[styles.tabLabel, { color: active ? theme.cyan : theme.textFaint }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export function IconCircle({
  name,
  color,
}: {
  name: IconName;
  color?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.iconCircle, { backgroundColor: theme.surfaceMuted }]}>
      <Ionicons name={name} size={22} color={color ?? theme.cyan} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, width: "100%" },
  footerSpace: { paddingBottom: 98 },
  demo: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  demoTitle: { color: "#101010", fontSize: 8, fontWeight: "800", textAlign: "center" },
  demoSubtitle: { color: "#101010", fontSize: 8, marginTop: 2 },
  header: {
    width: "auto",
    minHeight: 96,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerCompact: {
    minHeight: 72,
    paddingVertical: 10,
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 25, lineHeight: 31, fontWeight: "800", letterSpacing: -0.7 },
  headerSubtitle: { fontSize: 13, marginTop: 3 },
  themeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabSafe: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      android: { paddingBottom: 4 },
    }),
  },
  tabs: {
    width: "100%",
    maxWidth: 520,
    height: 72,
    alignSelf: "center",
    flexDirection: "row",
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  tabLabel: { fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
