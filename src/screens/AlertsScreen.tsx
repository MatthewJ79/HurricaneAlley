import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen, ScreenHeader } from "../components/Chrome";
import { Eyebrow, PrimaryButton, Section, SectionTitle } from "../components/Primitives";
import { StormSelector } from "../components/StormSelector";
import { useTheme } from "../theme/ThemeProvider";
import type { LiveStorm, ScreenName } from "../types";

export function AlertsScreen({
  navigate,
  storm,
  storms,
  onSelectStorm,
}: {
  navigate: (screen: ScreenName) => void;
  storm: LiveStorm | null;
  storms: LiveStorm[];
  onSelectStorm: (stormId: string) => void;
}) {
  const { theme } = useTheme();

  if (!storm) {
    return (
      <Screen>
        <ScreenHeader
          title="Official Alerts"
          subtitle="NHC watches and warnings"
        />
        <Section>
          <View
            style={[
              styles.empty,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No active NHC storms
            </Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Storm-specific NHC products will appear here when published.
            </Text>
          </View>
        </Section>
      </Screen>
    );
  }

  const watches = storm.products.windWatchesWarnings;
  const surge = storm.products.stormSurgeWatchWarning;
  const hasNHCWarningProduct = Boolean(watches || surge);

  return (
    <Screen>
      <ScreenHeader
        title="Official Alerts"
        subtitle={`${storm.classification} ${storm.name}`}
      />
      <StormSelector
        storms={storms}
        selectedStormId={storm.id}
        onSelect={onSelectStorm}
      />

      <View
        style={[
          styles.status,
          {
            backgroundColor: hasNHCWarningProduct
              ? theme.emergency
              : theme.surface,
            borderColor: hasNHCWarningProduct
              ? theme.emergency
              : theme.border,
          },
        ]}
      >
        <Ionicons
          name={
            hasNHCWarningProduct
              ? "warning-outline"
              : "checkmark-circle-outline"
          }
          size={30}
          color={hasNHCWarningProduct ? "#FFFFFF" : theme.cyan}
        />
        <View style={styles.statusCopy}>
          <Eyebrow color={hasNHCWarningProduct ? "#FFFFFF" : theme.cyan}>
            OFFICIAL NHC STATUS
          </Eyebrow>
          <Text
            style={[
              styles.statusTitle,
              { color: hasNHCWarningProduct ? "#FFFFFF" : theme.text },
            ]}
          >
            {hasNHCWarningProduct
              ? "Watch or warning product published"
              : "No storm-specific NHC watch/warning layer"}
          </Text>
          <Text
            style={[
              styles.statusText,
              {
                color: hasNHCWarningProduct
                  ? "rgba(255,255,255,.88)"
                  : theme.textMuted,
              },
            ]}
          >
            {hasNHCWarningProduct
              ? "Open the official products below for affected locations and current instructions."
              : "This does not rule out marine hazards or local NWS alerts. Review the public advisory below."}
          </Text>
        </View>
      </View>

      <Section>
        <SectionTitle
          title="Published products"
          eyebrow={`Advisory ${storm.products.publicAdvisory?.advisoryNumber ?? "current"}`}
        />
        <View style={styles.products}>
          <AlertProduct
            icon="megaphone-outline"
            title="NHC public advisory"
            subtitle="Current hazards, watches, warnings, and affected areas"
            url={storm.products.publicAdvisory?.url}
            required
          />
          <AlertProduct
            icon="warning-outline"
            title="Tropical cyclone watches/warnings"
            subtitle="Official NHC geographic watch and warning layer"
            url={productUrl(watches)}
          />
          <AlertProduct
            icon="water-outline"
            title="Storm surge watch/warning"
            subtitle="Published for applicable Atlantic and Gulf threats"
            url={productUrl(surge)}
          />
          <AlertProduct
            icon="speedometer-outline"
            title="Wind speed probabilities"
            subtitle="Official probabilities for tropical-storm-force winds"
            url={storm.products.windSpeedProbabilities?.url}
            required
          />
          <AlertProduct
            icon="time-outline"
            title="Earliest reasonable tropical-storm winds"
            subtitle="Official NHC arrival-time GIS product"
            url={productUrl(storm.products.earliestTropicalStormWinds)}
          />
        </View>

        <View
          style={[
            styles.locationNotice,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Ionicons name="location-outline" size={24} color={theme.cyan} />
          <View style={styles.locationCopy}>
            <Text style={[styles.locationTitle, { color: theme.text }]}>
              Location-specific alerts are planned
            </Text>
            <Text style={[styles.locationText, { color: theme.textMuted }]}>
              The next alert phase will match an opt-in device location with
              official NWS and local emergency-management zones. No evacuation
              order will be inferred.
            </Text>
          </View>
        </View>

        <PrimaryButton onPress={() => navigate("kit")}>
          Open preparedness checklist
        </PrimaryButton>
        <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
          Hurricane Alley reproduces official products and does not issue,
          modify, infer, or predict watches, warnings, or evacuation orders.
          Follow instructions from the NHC, your local NWS office, and local
          emergency management.
        </Text>
      </Section>
    </Screen>
  );
}

function AlertProduct({
  icon,
  title,
  subtitle,
  url,
  required = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  url: string | null | undefined;
  required?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityState={{ disabled: !url }}
      disabled={!url}
      onPress={() => {
        if (url) void Linking.openURL(url);
      }}
      style={[
        styles.product,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: url ? 1 : 0.58,
        },
      ]}
    >
      <View
        style={[styles.productIcon, { backgroundColor: theme.surfaceMuted }]}
      >
        <Ionicons name={icon} size={21} color={theme.cyan} />
      </View>
      <View style={styles.productCopy}>
        <Text style={[styles.productTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.productText, { color: theme.textMuted }]}>
          {url
            ? subtitle
            : required
              ? "Temporarily unavailable"
              : "Not currently published for this storm"}
        </Text>
      </View>
      {url ? (
        <Ionicons name="open-outline" size={19} color={theme.textFaint} />
      ) : null}
    </Pressable>
  );
}

function productUrl(
  product: LiveStorm["products"][keyof LiveStorm["products"]] | undefined,
) {
  return product?.url ?? product?.kmzUrl ?? product?.zipUrl ?? null;
}

const styles = StyleSheet.create({
  status: {
    marginHorizontal: 20,
    padding: 18,
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
  },
  statusCopy: { flex: 1 },
  statusTitle: { marginTop: 4, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  statusText: { marginTop: 6, fontSize: 10, lineHeight: 16 },
  products: { gap: 8 },
  product: {
    minHeight: 78,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  productIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  productCopy: { flex: 1 },
  productTitle: { fontSize: 12, fontWeight: "800" },
  productText: { marginTop: 4, fontSize: 9, lineHeight: 13 },
  locationNotice: {
    marginVertical: 16,
    padding: 16,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  locationCopy: { flex: 1 },
  locationTitle: { fontSize: 12, fontWeight: "800" },
  locationText: { marginTop: 5, fontSize: 10, lineHeight: 16 },
  disclaimer: { marginTop: 15, textAlign: "center", fontSize: 9, lineHeight: 15 },
  empty: { padding: 20, borderWidth: 1, borderRadius: 16 },
  emptyTitle: { fontSize: 15, fontWeight: "800" },
  emptyText: { marginTop: 7, fontSize: 10, lineHeight: 16 },
});
