import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Screen, ScreenHeader } from "../components/Chrome";
import { useTheme } from "../theme/ThemeProvider";
import type { LiveStorm, ScreenName, StormFeedState } from "../types";

export function HomeScreen({
  navigate,
  feed,
  openStorm,
}: {
  navigate: (screen: ScreenName) => void;
  feed: StormFeedState;
  openStorm: (storm: LiveStorm) => void;
}) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const contentWidth = desktop ? Math.min(width * 0.8, 1200) : width - 40;
  const cardWidth =
    desktop && feed.storms.length > 1
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
        rightContent={
          desktop ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate("prepare")}
              style={[
                styles.headerAction,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={theme.cyan}
              />
              <Text style={[styles.headerActionText, { color: theme.text }]}>
                Prepare
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      <View style={[styles.content, { width: contentWidth }]}>
        <View style={styles.listHeading}>
          <Text style={[styles.listTitle, { color: theme.text }]}>
            {loading
              ? "Checking for active storms"
              : connected && feed.storms.length > 0
                ? `${feed.storms.length} active ${
                    feed.storms.length === 1 ? "storm" : "storms"
                  }`
                : "Current Atlantic and Pacific activity"}
          </Text>
          <Text style={[styles.listMeta, { color: theme.textMuted }]}>
            {feed.fetchedAt
              ? `NHC feed updated ${formatUpdated(feed.fetchedAt)}`
              : "Live NHC connection"}
          </Text>
        </View>

        {connected && feed.storms.length > 0 ? (
          <View style={styles.stormGrid}>
            {feed.storms.map((storm) => (
              <StormCard
                key={storm.id}
                storm={storm}
                width={cardWidth}
                onOpen={() => openStorm(storm)}
              />
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.empty,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Ionicons
              name={
                loading
                  ? "sync-outline"
                  : connected
                    ? "checkmark-circle-outline"
                    : "cloud-offline-outline"
              }
              size={34}
              color={connected ? theme.cyan : theme.warning}
            />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {loading
                ? "Loading current NHC activity"
                : connected
                  ? "No current active storms"
                  : "Live storm data is temporarily unavailable"}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {connected
                ? "When the NHC publishes an active tropical cyclone, its complete report will appear here."
                : "Hurricane Alley will restore the active-storm list when the official feed reconnects."}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.homeNote,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Ionicons name="radio-outline" size={20} color={theme.cyan} />
          <Text style={[styles.homeNoteText, { color: theme.textMuted }]}>
            Select a storm to open one complete report containing its summary,
            official track and cone, model guidance, alerts, and NHC products.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function StormCard({
  storm,
  width,
  onOpen,
}: {
  storm: LiveStorm;
  width: number;
  onOpen: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open complete report for ${storm.classification} ${storm.name}`}
      onPress={onOpen}
      style={[
        styles.stormCard,
        {
          width,
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardIdentity}>
          <View style={[styles.liveDot, { backgroundColor: theme.redBright }]} />
          <View style={styles.cardCopy}>
            <Text
              numberOfLines={1}
              style={[styles.stormName, { color: theme.text }]}
            >
              {storm.classification} {storm.name}
            </Text>
            <Text style={[styles.stormBasin, { color: theme.textMuted }]}>
              {storm.basin.toUpperCase()} · {storm.id.toUpperCase()}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={23} color={theme.cyan} />
      </View>

      <View style={styles.metrics}>
        <Metric
          label="MAX WIND"
          value={storm.wind.mph === null ? "—" : `${storm.wind.mph} MPH`}
          danger
        />
        <Metric
          label="PRESSURE"
          value={
            storm.pressureMb === null ? "—" : `${storm.pressureMb} MB`
          }
        />
        <Metric label="MOTION" value={formatMotion(storm)} />
        <Metric
          label="CENTER"
          value={`${storm.center.displayLatitude ?? "—"} · ${
            storm.center.displayLongitude ?? "—"
          }`}
        />
      </View>

      <View style={[styles.reportLink, { borderTopColor: theme.border }]}>
        <Text style={[styles.reportLinkText, { color: theme.cyan }]}>
          OPEN COMPLETE STORM REPORT
        </Text>
        <Text style={[styles.updated, { color: theme.textFaint }]}>
          Updated {formatUpdated(storm.updatedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

function Metric({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: theme.textFaint }]}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.metricValue,
          { color: danger ? theme.redBright : theme.text },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function formatMotion(storm: LiveStorm) {
  const degrees = storm.movement.directionDegrees;
  const speed = storm.movement.speedMph;
  if (degrees === null && speed === null) return "—";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const direction =
    degrees === null
      ? ""
      : directions[Math.round(degrees / 45) % directions.length];
  return `${direction}${direction && speed !== null ? " " : ""}${
    speed === null ? "" : `${speed} MPH`
  }`;
}

function formatUpdated(value: string | null) {
  if (!value) return "time unavailable";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", paddingBottom: 24 },
  headerAction: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  headerActionText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  listHeading: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
  },
  listTitle: { fontSize: 18, fontWeight: "800" },
  listMeta: { fontSize: 8, fontWeight: "700", textAlign: "right" },
  stormGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stormCard: {
    minHeight: 178,
    padding: 15,
    borderWidth: 1,
    borderRadius: 16,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardIdentity: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  liveDot: { width: 9, height: 9, borderRadius: 5 },
  cardCopy: { minWidth: 0, flex: 1 },
  stormName: { fontSize: 17, fontWeight: "800" },
  stormBasin: { marginTop: 3, fontSize: 8, fontWeight: "800" },
  metrics: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metric: { minWidth: 100, flex: 1 },
  metricLabel: { fontSize: 7, fontWeight: "800" },
  metricValue: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  reportLink: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  reportLinkText: { fontSize: 8, fontWeight: "800" },
  updated: { fontSize: 7 },
  empty: {
    minHeight: 190,
    padding: 24,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyText: {
    maxWidth: 520,
    marginTop: 7,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
  },
  homeNote: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  homeNoteText: { minWidth: 0, flex: 1, fontSize: 9, lineHeight: 14 },
});
