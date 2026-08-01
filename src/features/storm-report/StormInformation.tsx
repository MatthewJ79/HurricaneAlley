import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { LiveStorm } from "../../types";
import { forecastPositionLabel, forecastStrengthLabel, formatForecastTime } from "../../utils/forecast";
import { forecastTone, formatMotion, formatUpdated } from "./formatters";
import { styles } from "./styles";

export function DesktopInformationRail({ storm }: { storm: LiveStorm }) {
  const { theme } = useTheme();
  const forecast = storm.forecastPoints ?? [];
  return (
    <View style={styles.informationRail}>
      <View style={[styles.conditionsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.conditionsHeading}>
          <View>
            <Text style={[styles.conditionsEyebrow, { color: theme.cyan }]}>
              {storm.classificationCode} · {storm.basin.toUpperCase()}
            </Text>
            <Text style={[styles.conditionsLabel, { color: theme.textMuted }]}>CURRENT CONDITIONS</Text>
          </View>
          <View style={[styles.liveDot, { backgroundColor: theme.redBright }]} />
        </View>
        <View style={styles.primaryWind}>
          <Text style={[styles.primaryWindValue, { color: theme.redBright }]}>
            {storm.wind.mph === null ? "—" : storm.wind.mph}
          </Text>
          <View>
            <Text style={[styles.primaryWindUnit, { color: theme.text }]}>MPH</Text>
            <Text style={[styles.primaryWindMeta, { color: theme.textFaint }]}>MAX WIND</Text>
          </View>
        </View>
        <View style={styles.conditionsMetrics}>
          <RailMetric label="PRESSURE" value={storm.pressureMb === null ? "—" : `${storm.pressureMb} MB`} />
          <RailMetric label="MOTION" value={formatMotion(storm)} />
          <RailMetric label="CENTER" value={`${storm.center.displayLatitude ?? "—"} · ${storm.center.displayLongitude ?? "—"}`} wide />
        </View>
        <Text style={[styles.conditionsUpdated, { color: theme.textFaint }]}>
          OFFICIAL UPDATE · {formatUpdated(storm.updatedAt)}
        </Text>
      </View>

      <View style={[styles.forecastRail, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.forecastRailHeading}>
          <View>
            <Text style={[styles.forecastRailTitle, { color: theme.text }]}>Official forecast</Text>
            <Text style={[styles.forecastRailMeta, { color: theme.textMuted }]}>NHC CENTER POSITIONS</Text>
          </View>
          <Text style={[styles.advisoryBadge, { color: theme.cyan }]}>
            ADV {storm.officialCone?.advisoryNumber ?? storm.products.forecastAdvisory?.advisoryNumber ?? "—"}
          </Text>
        </View>
        <View style={styles.forecastRailList}>
          {forecast.map((point, index) => (
            <View key={`${point.validAt ?? "forecast"}-${index}`} style={[
              styles.forecastRailRow,
              index < forecast.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
            ]}>
              <View style={styles.forecastRailTime}>
                <Text numberOfLines={1} style={[styles.forecastRailTimeText, { color: theme.text }]}>{formatForecastTime(point.validAt)}</Text>
                <Text numberOfLines={1} style={[styles.forecastRailPosition, { color: theme.textFaint }]}>{forecastPositionLabel(point.latitude, point.longitude)}</Text>
              </View>
              <View style={[styles.forecastStrengthBadge, { backgroundColor: "transparent", borderColor: forecastTone(point.windKnots, theme) }]}>
                <Text numberOfLines={1} style={[styles.forecastStrengthBadgeText, { color: forecastTone(point.windKnots, theme) }]}>{forecastStrengthLabel(point)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function RailMetric({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.railMetric, wide && styles.railMetricWide]}>
      <Text style={[styles.railMetricLabel, { color: theme.textFaint }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.railMetricValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

export function StormSummary({ storm, compact }: { storm: LiveStorm; compact: boolean }) {
  const { theme } = useTheme();
  const metrics = [
    ["MAX WIND", storm.wind.mph === null ? "—" : `${storm.wind.mph} MPH`],
    ["PRESSURE", storm.pressureMb === null ? "—" : `${storm.pressureMb} MB`],
    ["MOTION", formatMotion(storm)],
    ["CENTER", `${storm.center.displayLatitude ?? "—"} · ${storm.center.displayLongitude ?? "—"}`],
  ];
  return (
    <View style={[styles.summaryStrip, compact && styles.summaryStripMobile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.summaryIdentity, compact && styles.summaryIdentityMobile]}>
        <Text style={[styles.summaryClassification, { color: theme.cyan }]}>{storm.classificationCode} · {storm.basin.toUpperCase()}</Text>
        <Text style={[styles.summaryTime, { color: theme.textMuted }]}>Official update {formatUpdated(storm.updatedAt)}</Text>
      </View>
      <View style={styles.metrics}>
        {metrics.map(([label, value], index) => (
          <View key={label} style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.textFaint }]}>{label}</Text>
            <Text numberOfLines={1} style={[styles.metricValue, { color: index === 0 ? theme.redBright : theme.text }]}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
