import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { LiveStorm } from "../../types";
import { productUrl } from "./formatters";
import { SectionHeading } from "./SectionHeading";
import { styles } from "./styles";

export function AlertsPanel({ storm, productWidth, onPrepare }: {
  storm: LiveStorm; productWidth: number; onPrepare: () => void;
}) {
  const { theme } = useTheme();
  const watches = storm.products.windWatchesWarnings;
  const surge = storm.products.stormSurgeWatchWarning;
  const products = [
    { icon: "megaphone-outline" as const, title: "NHC public advisory", subtitle: "Current hazards, watches, warnings, and affected areas", url: storm.products.publicAdvisory?.url },
    { icon: "chatbox-ellipses-outline" as const, title: "Forecast discussion", subtitle: "Forecaster reasoning and model interpretation", url: storm.products.forecastDiscussion?.url },
    { icon: "document-text-outline" as const, title: "Forecast advisory", subtitle: "Official track, intensity, and wind radii", url: storm.products.forecastAdvisory?.url },
    { icon: "warning-outline" as const, title: "Tropical cyclone watches/warnings", subtitle: "Official NHC geographic watch and warning product", url: productUrl(watches) },
    { icon: "water-outline" as const, title: "Storm surge watch/warning", subtitle: "Published for applicable Atlantic and Gulf threats", url: productUrl(surge) },
    { icon: "analytics-outline" as const, title: "Wind speed probabilities", subtitle: "Official probabilities for tropical-storm-force winds", url: storm.products.windSpeedProbabilities?.url },
    { icon: "time-outline" as const, title: "Earliest reasonable tropical-storm winds", subtitle: "Official NHC arrival-time GIS product", url: productUrl(storm.products.earliestTropicalStormWinds) },
    { icon: "time-outline" as const, title: "Most likely tropical-storm winds", subtitle: "Official NHC most-likely arrival-time GIS product", url: productUrl(storm.products.mostLikelyTropicalStormWinds) },
  ];
  const hasWarning = Boolean(watches || surge);
  return (
    <>
      <SectionHeading title="Alerts & official products" meta={`Advisory ${storm.products.publicAdvisory?.advisoryNumber ?? "current"}`} />
      <View style={[styles.alertStatus, {
        backgroundColor: hasWarning ? theme.emergency : theme.surface,
        borderColor: hasWarning ? theme.emergency : theme.border,
      }]}>
        <Ionicons name={hasWarning ? "warning-outline" : "checkmark-circle-outline"} size={26} color={hasWarning ? "#FFFFFF" : theme.cyan} />
        <View style={styles.statusCopy}>
          <Text style={[styles.statusTitle, { color: hasWarning ? "#FFFFFF" : theme.text }]}>
            {hasWarning ? "Official watch or warning product published" : "No storm-specific NHC watch/warning layer"}
          </Text>
          <Text style={[styles.statusText, { color: hasWarning ? "rgba(255,255,255,.86)" : theme.textMuted }]}>Always review local NWS and emergency-management instructions.</Text>
        </View>
      </View>
      <View style={styles.productGrid}>
        {products.map((product) => <OfficialProduct key={product.title} {...product} width={productWidth} />)}
      </View>
      <View style={[styles.locationNotice, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="location-outline" size={23} color={theme.cyan} />
        <View style={styles.statusCopy}>
          <Text style={[styles.statusTitle, { color: theme.text }]}>Location-specific alerts are planned</Text>
          <Text style={[styles.statusText, { color: theme.textMuted }]}>Opt-in device location will be matched with official NWS and local emergency-management zones. Hurricane Alley will never infer an evacuation order.</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={onPrepare} style={[styles.prepareButton, { backgroundColor: theme.cyan }]}>
        <Ionicons name="shield-checkmark-outline" size={19} color="#003638" />
        <Text style={styles.prepareButtonText}>Open preparedness</Text>
      </Pressable>
      <Text style={[styles.disclaimer, { color: theme.textMuted }]}>Hurricane Alley reproduces official products and does not issue, modify, infer, or predict watches, warnings, or evacuation orders.</Text>
    </>
  );
}

function OfficialProduct({ icon, title, subtitle, url, width }: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string; subtitle: string; url: string | null | undefined; width: number;
}) {
  const { theme } = useTheme();
  return (
    <Pressable accessibilityRole="link" accessibilityState={{ disabled: !url }} disabled={!url}
      onPress={() => { if (url) void Linking.openURL(url); }}
      style={[styles.product, { width, backgroundColor: theme.surface, borderColor: theme.border, opacity: url ? 1 : 0.55 }]}>
      <Ionicons name={icon} size={20} color={theme.cyan} />
      <View style={styles.productCopy}>
        <Text numberOfLines={1} style={[styles.productTitle, { color: theme.text }]}>{title}</Text>
        <Text numberOfLines={1} style={[styles.productText, { color: theme.textMuted }]}>{url ? subtitle : "Not currently published for this storm"}</Text>
      </View>
      {url ? <Ionicons name="open-outline" size={17} color={theme.textFaint} /> : null}
    </Pressable>
  );
}
