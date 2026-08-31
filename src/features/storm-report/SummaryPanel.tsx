import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { LiveStorm } from "../../types";
import { forecastPositionLabel, forecastStrengthLabel, formatForecastTime } from "../../utils/forecast";
import { SectionHeading } from "./SectionHeading";
import { styles } from "./styles";

export function SummaryPanel({ storm }: { storm: LiveStorm }) {
  const { theme } = useTheme();
  const nextPoints = (storm.forecastPoints ?? []).slice(0, 4);
  const hasWarning = Boolean(storm.products.windWatchesWarnings || storm.products.stormSurgeWatchWarning);
  return (
    <>
      <SectionHeading title="Report summary" meta="Latest official forecast positions" />
      <View style={styles.summaryGrid}>
        <View style={[styles.statusCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name={hasWarning ? "warning-outline" : "checkmark-circle-outline"}
            size={24} color={hasWarning ? theme.redBright : theme.cyan} />
          <View style={styles.statusCopy}>
            <Text style={[styles.statusTitle, { color: theme.text }]}>
              {hasWarning ? "Official watch or warning product published" : "No storm-specific NHC watch/warning layer"}
            </Text>
            <Text style={[styles.statusText, { color: theme.textMuted }]}>
              Open Alerts to see every affected area, official instructions, and location matches.
            </Text>
          </View>
        </View>
        <View style={styles.nextForecast}>
          {nextPoints.map((point, index) => (
            <View key={`${point.validAt ?? "forecast"}-${index}`} style={[styles.nextPoint, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.nextTime, { color: theme.text }]}>{formatForecastTime(point.validAt)}</Text>
              <Text style={[styles.nextStrength, { color: theme.redBright }]}>{forecastStrengthLabel(point)}</Text>
              <Text style={[styles.nextPosition, { color: theme.textMuted }]}>{forecastPositionLabel(point.latitude, point.longitude)}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={[styles.disclaimer, { color: theme.textMuted }]}>Hurricane Alley displays official NOAA/NHC information unchanged and does not create a forecast.</Text>
    </>
  );
}
