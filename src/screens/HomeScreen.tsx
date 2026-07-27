import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ActiveStormMap } from "../components/ActiveStormMap";
import { Screen, ScreenHeader } from "../components/Chrome";
import { Eyebrow, Section, SectionTitle } from "../components/Primitives";
import { StormMap } from "../components/StormMap";
import { useTheme } from "../theme/ThemeProvider";
import type { LiveStorm, ScreenName, StormFeedState } from "../types";

const quickActions = [
  ["track", "pulse-outline", "Track"],
  ["data", "analytics-outline", "Models"],
  ["alerts", "alert-circle-outline", "Alerts"],
  ["prepare", "close-circle-outline", "Prepare"],
] as const;

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
  const showLive = feed.status === "live" || feed.status === "cached";

  return (
    <Screen>
      <ScreenHeader title="Active Storms" />

      {showLive ? (
        feed.storms.length > 0 ? (
          <View style={styles.liveStorms}>
            {feed.storms.map((storm) => (
              <LiveStormCard key={storm.id} storm={storm} openStorm={openStorm} />
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Ionicons name="checkmark-circle-outline" size={30} color={theme.cyan} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No active NHC tropical cyclones
            </Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Development areas from the Tropical Weather Outlook are the next feed.
            </Text>
          </View>
        )
      ) : (
        <HistoricalDemoCard navigate={navigate} />
      )}

      <View style={styles.quickGrid}>
        {quickActions.map(([screen, icon, label]) => (
          <Pressable
            key={screen}
            onPress={() => navigate(screen)}
            style={[
              styles.quickAction,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Ionicons name={icon} size={25} color={theme.cyan} />
            <Text style={[styles.quickLabel, { color: theme.textMuted }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Section>
        <SectionTitle
          title={showLive ? "Data connection" : "Historical demonstration"}
          eyebrow={
            showLive
              ? `${feed.storms.length} active NHC storm${feed.storms.length === 1 ? "" : "s"}`
              : "Live API unavailable"
          }
        />
        <View
          style={[
            styles.statusCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Ionicons
            name={showLive ? "radio-outline" : "cloud-offline-outline"}
            size={24}
            color={showLive ? theme.cyan : theme.warning}
          />
          <View style={styles.statusCopy}>
            <Text style={[styles.statusTitle, { color: theme.text }]}>
              {showLive
                ? "Official NHC summaries connected"
                : "Showing historical data safely"}
            </Text>
            <Text style={[styles.statusText, { color: theme.textMuted }]}>
              {showLive
                ? "Forecast tracks, cones, public ATCF guidance, advisories, and available NHC warning products are connected."
                : "Start the Hurricane Alley API to replace this card with current NHC storm information."}
            </Text>
          </View>
        </View>
      </Section>
    </Screen>
  );
}

function LiveStormCard({
  storm,
  openStorm,
}: {
  storm: LiveStorm;
  openStorm: (storm: LiveStorm) => void;
}) {
  const { theme } = useTheme();
  const issued = storm.updatedAt
    ? new Date(storm.updatedAt).toLocaleString()
    : "Time unavailable";

  return (
    <View
      style={[
        styles.stormCard,
        { backgroundColor: theme.surface, borderColor: theme.redBright },
      ]}
    >
      <View style={styles.cardHeading}>
        <View style={styles.stormHeadingCopy}>
          <Text style={[styles.stormName, { color: theme.text }]}>
            {storm.classification} {storm.name}
          </Text>
          <Text style={[styles.basin, { color: theme.textMuted }]}>
            {storm.basin.toUpperCase()} · {storm.id.toUpperCase()}
          </Text>
        </View>
        <Text
          style={[
            styles.liveBadge,
            { color: theme.cyan, borderColor: theme.cyan },
          ]}
        >
          LIVE NHC
        </Text>
      </View>
      <View style={styles.metrics}>
        <Metric
          label="WIND"
          value={storm.wind.mph === null ? "—" : `${storm.wind.mph} MPH`}
          danger
        />
        <Metric label="MOTION" value={formatMotion(storm)} />
        <Metric
          label="PRESSURE"
          value={storm.pressureMb === null ? "—" : `${storm.pressureMb} MB`}
        />
      </View>
      <Text style={[styles.position, { color: theme.textMuted }]}>
        {storm.center.displayLatitude ?? "—"} ·{" "}
        {storm.center.displayLongitude ?? "—"}
      </Text>
      <View style={styles.liveMap}>
        <ActiveStormMap storm={storm} height={220} />
      </View>
      <Text style={[styles.issued, { color: theme.textFaint }]}>
        Official NHC update {issued}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${storm.classification} ${storm.name}`}
        onPress={() => openStorm(storm)}
        style={[styles.trackLink, { borderColor: theme.cyan }]}
      >
        <Text style={[styles.trackLinkText, { color: theme.cyan }]}>
          View full track
        </Text>
      </Pressable>
    </View>
  );
}

function HistoricalDemoCard({
  navigate,
}: {
  navigate: (screen: ScreenName) => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open historical Hurricane Helene storm track"
      onPress={() => navigate("track")}
      style={[
        styles.stormCard,
        { backgroundColor: theme.surface, borderColor: theme.redBright },
      ]}
    >
      <View style={styles.cardHeading}>
        <View>
          <Text style={[styles.stormName, { color: theme.text }]}>
            Hurricane Helene
          </Text>
          <Text style={styles.category}>HISTORICAL CATEGORY 4</Text>
        </View>
        <Ionicons
          name="reorder-three-outline"
          size={44}
          color={theme.redBright}
          style={styles.windIcon}
        />
      </View>
      <View style={styles.metrics}>
        <Metric label="WIND" value="145 MPH" danger />
        <Metric label="MOTION" value="NNW 14 MPH" />
        <Metric label="PRESSURE" value="935 MB" />
      </View>
      <View style={styles.mapClip}>
        <StormMap height={184} />
      </View>
      <Text style={[styles.issued, { color: theme.textFaint }]}>
        Historical demo · September 2024
      </Text>
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
      <Eyebrow>{label}</Eyebrow>
      <Text
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

const styles = StyleSheet.create({
  liveStorms: { gap: 12 },
  stormCard: {
    marginHorizontal: 20,
    padding: 19,
    borderWidth: 1,
    borderRadius: 24,
  },
  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stormHeadingCopy: { flex: 1, paddingRight: 10 },
  stormName: { fontSize: 18, fontWeight: "800" },
  basin: { marginTop: 5, fontSize: 9, fontWeight: "700" },
  liveBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 8,
    fontWeight: "800",
  },
  category: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 5,
    backgroundColor: "#F02F3A",
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  windIcon: { transform: [{ rotate: "90deg" }] },
  metrics: {
    marginVertical: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  metric: { flex: 1 },
  metricValue: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  position: { fontSize: 11, fontWeight: "700", fontVariant: ["tabular-nums"] },
  liveMap: { marginTop: 14 },
  mapClip: { borderRadius: 13, overflow: "hidden" },
  issued: { marginTop: 14, fontSize: 9 },
  trackLink: {
    minHeight: 36,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 9,
  },
  trackLinkText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  emptyCard: {
    marginHorizontal: 20,
    padding: 24,
    borderWidth: 1,
    borderRadius: 24,
    alignItems: "center",
  },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: "800", textAlign: "center" },
  emptyText: { marginTop: 7, fontSize: 11, lineHeight: 16, textAlign: "center" },
  quickGrid: {
    marginTop: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 10,
  },
  quickAction: {
    flex: 1,
    height: 70,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quickLabel: {
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statusCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    gap: 12,
  },
  statusCopy: { flex: 1 },
  statusTitle: { fontSize: 13, fontWeight: "800" },
  statusText: { marginTop: 5, fontSize: 11, lineHeight: 17 },
});
