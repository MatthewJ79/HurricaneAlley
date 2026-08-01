import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type {
  AlertFeedState,
  AlertLifecycleEvent,
  OfficialAlert,
  SavedPlace,
} from "../../types";
import { formatAlertDate } from "./alertFormatters";

export function AlertResults({ place, alerts, feed, onRemove }: {
  place: SavedPlace;
  alerts: OfficialAlert[];
  feed: AlertFeedState;
  onRemove: () => void;
}) {
  const { theme } = useTheme();
  const unavailable = feed.status === "unavailable";
  return (
    <View style={styles.results}>
      <View style={styles.resultsHeader}>
        <View style={styles.flex}>
          <Text style={[styles.resultsTitle, { color: theme.text }]}>{place.name}</Text>
          <Text style={[styles.resultsMeta, { color: feed.stale ? theme.warning : theme.textMuted }]}>
            {statusText(feed)}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${place.name}`} onPress={onRemove} hitSlop={10}>
          <Ionicons name="trash-outline" size={21} color={theme.textFaint} />
        </Pressable>
      </View>
      {feed.error && feed.stale ? (
        <Text accessibilityRole="alert" style={[styles.errorBanner, { color: theme.warning, borderColor: theme.warning }]}>
          {feed.error}. Previously retrieved information may be outdated.
        </Text>
      ) : null}
      {feed.lifecycleEvents.length ? <LifecycleSummary events={feed.lifecycleEvents} /> : null}
      {feed.status !== "loading" && !unavailable && alerts.length === 0 ? <NoAlerts /> : null}
      {alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
    </View>
  );
}

function statusText(feed: AlertFeedState) {
  if (feed.status === "loading") return "Checking official alerts...";
  if (feed.status === "unavailable") {
    return "Official alerts unavailable - this is not an all-clear";
  }
  return feed.stale
    ? `Cached alerts - last official retrieval ${formatAlertDate(feed.fetchedAt)}`
    : `Official alerts checked ${formatAlertDate(feed.fetchedAt)}`;
}

function NoAlerts() {
  const { theme } = useTheme();
  return (
    <View style={[styles.noAlerts, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Ionicons name="checkmark-circle-outline" size={28} color={theme.cyan} />
      <View style={styles.flex}>
        <Text style={[styles.noAlertsTitle, { color: theme.text }]}>No active NWS alerts returned for this point</Text>
        <Text style={[styles.noAlertsText, { color: theme.textMuted }]}>Conditions can still be hazardous. Continue to follow local emergency management and NOAA Weather Radio.</Text>
      </View>
    </View>
  );
}

function LifecycleSummary({ events }: { events: AlertLifecycleEvent[] }) {
  const { theme } = useTheme();
  const counts = events.reduce<Record<AlertLifecycleEvent["kind"], number>>(
    (result, event) => ({ ...result, [event.kind]: result[event.kind] + 1 }),
    { new: 0, updated: 0, cancelled: 0, expired: 0 },
  );
  const changes = [
    counts.new ? `${counts.new} new` : null,
    counts.updated ? `${counts.updated} updated` : null,
    counts.cancelled ? `${counts.cancelled} cancelled` : null,
    counts.expired ? `${counts.expired} expired` : null,
  ].filter(Boolean).join(" | ");
  return (
    <View accessibilityRole="alert" style={[styles.changeBanner, { backgroundColor: theme.surface, borderColor: theme.cyan }]}>
      <Ionicons name="sparkles-outline" size={22} color={theme.cyan} />
      <View style={styles.flex}>
        <Text style={[styles.changeTitle, { color: theme.text }]}>Official alert activity changed</Text>
        <Text style={[styles.changeText, { color: theme.textMuted }]}>{changes}</Text>
      </View>
    </View>
  );
}

function AlertCard({ alert }: { alert: OfficialAlert }) {
  const { theme } = useTheme();
  const dangerous = ["Extreme", "Severe"].includes(alert.severity);
  return (
    <View style={[styles.alertCard, { backgroundColor: theme.surface, borderColor: dangerous ? theme.emergency : theme.border }]}>
      <View style={styles.alertTop}>
        <View style={[styles.alertIcon, { backgroundColor: dangerous ? theme.emergency : theme.surfaceMuted }]}>
          <Ionicons name="warning" size={21} color={dangerous ? "#FFFFFF" : theme.warning} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.alertEvent, { color: theme.text }]}>{alert.event}</Text>
          <Text style={[styles.alertAuthority, { color: theme.textMuted }]}>{alert.senderName}</Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: dangerous ? theme.emergency : theme.surfaceMuted }]}>
          <Text style={[styles.severityText, { color: dangerous ? "#FFFFFF" : theme.text }]}>{alert.severity.toUpperCase()}</Text>
        </View>
      </View>
      {alert.headline ? <Text style={[styles.headline, { color: theme.text }]}>{alert.headline}</Text> : null}
      <Text style={[styles.timing, { color: theme.textMuted }]}>Issued {formatAlertDate(alert.sentAt)} | Expires {formatAlertDate(alert.expiresAt)}</Text>
      {alert.areaDescription ? <Text style={[styles.area, { color: theme.textMuted }]}>Affected area: {alert.areaDescription}</Text> : null}
      {alert.instruction ? (
        <View style={[styles.instruction, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.instructionLabel, { color: theme.cyan }]}>OFFICIAL INSTRUCTIONS</Text>
          <Text style={[styles.instructionText, { color: theme.text }]}>{alert.instruction}</Text>
        </View>
      ) : null}
      {alert.description ? <Text style={[styles.description, { color: theme.textMuted }]}>{alert.description}</Text> : null}
      {alert.sourceUrl ? (
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(alert.sourceUrl!)} style={styles.sourceLink}>
          <Text style={[styles.sourceLinkText, { color: theme.cyan }]}>Open official alert</Text>
          <Ionicons name="open-outline" size={16} color={theme.cyan} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  results: { gap: 12 },
  resultsHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  resultsTitle: { fontSize: 22, fontWeight: "800" },
  resultsMeta: { fontSize: 12, marginTop: 3 },
  errorBanner: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 18 },
  changeBanner: { borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: "row", gap: 11, alignItems: "center" },
  changeTitle: { fontSize: 14, fontWeight: "800" },
  changeText: { fontSize: 12, marginTop: 3 },
  noAlerts: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", gap: 12 },
  noAlertsTitle: { fontSize: 15, fontWeight: "800" },
  noAlertsText: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  alertCard: { borderWidth: 2, borderRadius: 18, padding: 17 },
  alertTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  alertIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  alertEvent: { fontSize: 19, fontWeight: "900" },
  alertAuthority: { fontSize: 12, marginTop: 2 },
  severityBadge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  severityText: { fontSize: 10, fontWeight: "900" },
  headline: { fontSize: 15, fontWeight: "700", lineHeight: 21, marginTop: 14 },
  timing: { fontSize: 12, marginTop: 8 },
  area: { fontSize: 13, lineHeight: 18, marginTop: 6 },
  instruction: { borderRadius: 12, padding: 13, marginTop: 14 },
  instructionLabel: { fontSize: 11, fontWeight: "900" },
  instructionText: { fontSize: 14, lineHeight: 21, marginTop: 5, fontWeight: "600" },
  description: { fontSize: 13, lineHeight: 19, marginTop: 13 },
  sourceLink: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  sourceLinkText: { fontSize: 13, fontWeight: "800" },
});

