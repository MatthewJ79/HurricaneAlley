import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen, ScreenHeader } from "../components/Chrome";
import { HomeStormCard } from "../features/home/HomeStormCard";
import { formatStormUpdated } from "../features/home/stormFormatters";
import { useTheme } from "../theme/ThemeProvider";
import type { LiveStorm, ScreenName, StormFeedState } from "../types";

export function HomeScreen({ navigate, feed, openStorm }: {
  navigate: (screen: ScreenName) => void;
  feed: StormFeedState;
  openStorm: (storm: LiveStorm) => void;
}) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const contentWidth = desktop ? Math.min(width * 0.8, 1200) : width - 40;
  const cardWidth = desktop && feed.storms.length > 1
    ? (contentWidth - 10) / 2
    : contentWidth;
  const loading = feed.status === "loading";
  const connected = feed.status === "live" || feed.status === "cached";

  return (
    <Screen>
      <ScreenHeader
        title="Active Storms"
        subtitle="Official NOAA/NHC tropical cyclone reports"
        contentWidth={desktop ? contentWidth : undefined}
        rightContent={desktop ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigate("prepare")}
            style={[styles.headerAction, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color={theme.cyan} />
            <Text style={[styles.headerActionText, { color: theme.text }]}>Prepare</Text>
          </Pressable>
        ) : undefined}
      />
      <View style={[styles.content, { width: contentWidth }]}>
        <View style={styles.listHeading}>
          <Text style={[styles.listTitle, { color: theme.text }]}>
            {loading
              ? "Checking for active storms"
              : connected && feed.storms.length > 0
                ? `${feed.storms.length} active ${feed.storms.length === 1 ? "storm" : "storms"}`
                : "Current Atlantic and Pacific activity"}
          </Text>
          <Text style={[styles.listMeta, { color: theme.textMuted }]}>
            {feed.fetchedAt ? `NHC feed updated ${formatStormUpdated(feed.fetchedAt)}` : "Live NHC connection"}
          </Text>
        </View>
        {connected && feed.storms.length > 0 ? (
          <View style={styles.stormGrid}>
            {feed.storms.map((storm) => (
              <HomeStormCard key={storm.id} storm={storm} width={cardWidth} onOpen={() => openStorm(storm)} />
            ))}
          </View>
        ) : (
          <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons
              name={loading ? "sync-outline" : connected ? "checkmark-circle-outline" : "cloud-offline-outline"}
              size={34}
              color={connected ? theme.cyan : theme.warning}
            />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {loading ? "Loading current NHC activity" : connected ? "No current active storms" : "Live storm data is temporarily unavailable"}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {connected
                ? "When the NHC publishes an active tropical cyclone, its complete report will appear here."
                : "Hurricane Alley will restore the active-storm list when the official feed reconnects."}
            </Text>
          </View>
        )}
        <View style={[styles.homeNote, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="radio-outline" size={20} color={theme.cyan} />
          <Text style={[styles.homeNoteText, { color: theme.textMuted }]}>Select a storm to open one complete report containing its summary, official track and cone, model guidance, alerts, and NHC products.</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", paddingBottom: 24 },
  headerAction: { minHeight: 38, paddingHorizontal: 12, borderWidth: 1, borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 7 },
  headerActionText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  listHeading: { marginBottom: 10, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 },
  listTitle: { fontSize: 18, fontWeight: "800" },
  listMeta: { fontSize: 8, fontWeight: "700", textAlign: "right" },
  stormGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  empty: { minHeight: 190, padding: 24, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginTop: 12, fontSize: 17, fontWeight: "800", textAlign: "center" },
  emptyText: { maxWidth: 520, marginTop: 7, fontSize: 10, lineHeight: 16, textAlign: "center" },
  homeNote: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 9 },
  homeNoteText: { minWidth: 0, flex: 1, fontSize: 9, lineHeight: 14 },
});
