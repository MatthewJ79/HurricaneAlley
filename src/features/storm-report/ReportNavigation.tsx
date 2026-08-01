import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { ActiveStormMap } from "../../components/ActiveStormMap";
import { ModelGuidanceMap } from "../../components/ModelGuidanceMap";
import { useTheme } from "../../theme/ThemeProvider";
import type { LiveStorm } from "../../types";
import { formatCycle } from "./formatters";
import { styles } from "./styles";
import { reportViews, type ReportView } from "./types";

export function ReportNavigation({
  view, vertical = false, onChange,
}: {
  view: ReportView;
  vertical?: boolean;
  onChange: (view: ReportView) => void;
}) {
  const { theme } = useTheme();
  return (
    <View accessibilityRole="tablist" style={[
      styles.reportTabs,
      vertical && styles.reportTabsVertical,
      { borderColor: theme.border, backgroundColor: theme.surface },
    ]}>
      {vertical ? (
        <View style={styles.railHeading}>
          <Text style={[styles.railEyebrow, { color: theme.textFaint }]}>STORM REPORT</Text>
          <Text style={[styles.railTitle, { color: theme.text }]}>Views</Text>
        </View>
      ) : null}
      {reportViews.map((item) => {
        const active = item.id === view;
        return (
          <Pressable key={item.id} accessibilityRole="tab"
            accessibilityState={{ selected: active }} onPress={() => onChange(item.id)}
            style={[styles.reportTab, vertical && styles.reportTabVertical,
              active && { backgroundColor: theme.cyan }]}>
            <Ionicons name={item.icon} size={vertical ? 19 : 16}
              color={active ? "#003638" : theme.textMuted} />
            <Text numberOfLines={vertical ? 2 : 1} style={[
              styles.reportTabText, vertical && styles.reportTabTextVertical,
              { color: active ? "#003638" : theme.textMuted },
            ]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ReportMap({ storm, view, height, visibleAids }: {
  storm: LiveStorm;
  view: ReportView;
  height: number;
  visibleAids?: string[];
}) {
  const { theme } = useTheme();
  const displayedHeight = view === "Models" ? Math.min(height, 280) : height;
  return (
    <View style={styles.mapSurface}>
      <View style={styles.mapHeading}>
        <View style={styles.mapHeadingCopy}>
          <Text style={[styles.mapTitle, { color: theme.text }]}>
            {view === "Models" ? "Official model guidance" : "Official NHC track"}
          </Text>
          <Text numberOfLines={1} style={[styles.mapMeta, { color: theme.textMuted }]}>
            {view === "Models"
              ? `${formatCycle(storm.modelGuidance?.cycleAt)} · ${storm.modelGuidance?.aids.length ?? 0} public ATCF aids`
              : `Advisory ${storm.officialCone?.advisoryNumber ?? storm.products.forecastAdvisory?.advisoryNumber ?? "current"} · Cone, center, and forecast positions`}
          </Text>
        </View>
        <View style={[styles.liveBadge, { borderColor: theme.cyan }]}>
          <Text style={[styles.liveBadgeText, { color: theme.cyan }]}>LIVE NHC</Text>
        </View>
      </View>
      {view === "Models" ? (
        <ModelGuidanceMap storm={storm} height={displayedHeight} visibleAids={visibleAids} />
      ) : (
        <ActiveStormMap storm={storm} height={displayedHeight} interactive />
      )}
    </View>
  );
}
