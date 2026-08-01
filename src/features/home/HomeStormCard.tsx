import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { LiveStorm } from "../../types";
import { formatStormMotion, formatStormUpdated } from "./stormFormatters";

export function HomeStormCard({ storm, width, onOpen }: {
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
      style={[styles.card, { width, backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={styles.top}>
        <View style={styles.identity}>
          <View style={[styles.liveDot, { backgroundColor: theme.redBright }]} />
          <View style={styles.copy}>
            <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>
              {storm.classification} {storm.name}
            </Text>
            <Text style={[styles.basin, { color: theme.textMuted }]}>
              {storm.basin.toUpperCase()} · {storm.id.toUpperCase()}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={23} color={theme.cyan} />
      </View>
      <View style={styles.metrics}>
        <Metric label="MAX WIND" value={storm.wind.mph === null ? "—" : `${storm.wind.mph} MPH`} danger />
        <Metric label="PRESSURE" value={storm.pressureMb === null ? "—" : `${storm.pressureMb} MB`} />
        <Metric label="MOTION" value={formatStormMotion(storm)} />
        <Metric label="CENTER" value={`${storm.center.displayLatitude ?? "—"} · ${storm.center.displayLongitude ?? "—"}`} />
      </View>
      <View style={[styles.reportLink, { borderTopColor: theme.border }]}>
        <Text style={[styles.reportLinkText, { color: theme.cyan }]}>OPEN COMPLETE STORM REPORT</Text>
        <Text style={[styles.updated, { color: theme.textFaint }]}>Updated {formatStormUpdated(storm.updatedAt)}</Text>
      </View>
    </Pressable>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: theme.textFaint }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.metricValue, { color: danger ? theme.redBright : theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 178, padding: 15, borderWidth: 1, borderRadius: 16 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  identity: { minWidth: 0, flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  liveDot: { width: 9, height: 9, borderRadius: 5 },
  copy: { minWidth: 0, flex: 1 },
  name: { fontSize: 17, fontWeight: "800" },
  basin: { marginTop: 3, fontSize: 8, fontWeight: "800" },
  metrics: { marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { minWidth: 100, flex: 1 },
  metricLabel: { fontSize: 7, fontWeight: "800" },
  metricValue: { marginTop: 3, fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] },
  reportLink: { marginTop: 18, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  reportLinkText: { fontSize: 8, fontWeight: "800" },
  updated: { fontSize: 7 },
});

