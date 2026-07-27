import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen, ScreenHeader } from "../components/Chrome";
import { ModelGuidanceMap } from "../components/ModelGuidanceMap";
import {
  Eyebrow,
  Section,
  SectionTitle,
  SegmentedControl,
} from "../components/Primitives";
import { StormSelector } from "../components/StormSelector";
import { useTheme } from "../theme/ThemeProvider";
import type { LiveStorm } from "../types";
import { mappableGuidance, modelColor } from "../utils/modelGuidance";

type GuidancePoint =
  NonNullable<LiveStorm["modelGuidance"]>["aids"][number]["points"][number];

export function DataScreen({
  storm,
  storms,
  onSelectStorm,
}: {
  storm: LiveStorm | null;
  storms: LiveStorm[];
  onSelectStorm: (stormId: string) => void;
}) {
  const { theme } = useTheme();
  const [view, setView] = useState(initialModelView);
  const mappableModels = useMemo(
    () => (storm ? mappableGuidance(storm) : []),
    [storm],
  );
  const [selectedAid, setSelectedAid] = useState<string | null>(
    initialModelAid,
  );

  useEffect(() => {
    if (!mappableModels.some((model) => model.aid === selectedAid)) {
      setSelectedAid(
        mappableModels.find((model) => model.aid === "AVNI")?.aid ??
          mappableModels[0]?.aid ??
          null,
      );
    }
  }, [mappableModels, selectedAid]);

  const visibleAids =
    view === "Individual" && selectedAid ? [selectedAid] : undefined;

  return (
    <Screen>
      <ScreenHeader
        title="Official Storm Data"
        subtitle={
          storm
            ? `${storm.classification} ${storm.name}`
            : "NOAA/NHC live products"
        }
      />
      {storm ? (
        <>
          <StormSelector
            storms={storms}
            selectedStormId={storm.id}
            onSelect={onSelectStorm}
          />
          <SegmentedControl
            options={["All tracks", "Agreement", "Individual"]}
            value={view}
            onChange={setView}
          />
          <Section>
            <View
              style={[
                styles.sourceCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Ionicons name="radio-outline" size={24} color={theme.cyan} />
              <View style={styles.sourceCopy}>
                <Eyebrow color={theme.cyan}>LIVE OFFICIAL GUIDANCE</Eyebrow>
                <Text style={[styles.sourceTitle, { color: theme.text }]}>
                  NHC ATCF public aid deck
                </Text>
                <Text style={[styles.sourceText, { color: theme.textMuted }]}>
                  Cycle {formatCycle(storm.modelGuidance?.cycleAt)} ·{" "}
                  {storm.modelGuidance?.aids.length ?? 0} public forecast aids
                </Text>
              </View>
            </View>

            <SectionTitle
              title={
                view === "Individual"
                  ? "Individual guidance"
                  : view === "Agreement"
                    ? "Guidance agreement"
                    : "Spaghetti guidance"
              }
              eyebrow={
                view === "Individual"
                  ? "Select one public ATCF aid"
                  : "Individual public ATCF forecast-aid tracks"
              }
            />
            {view === "Individual" ? (
              <View style={styles.aidPicker}>
                {mappableModels.map((model) => {
                  const selected = model.aid === selectedAid;
                  return (
                    <Pressable
                      key={model.aid}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedAid(model.aid)}
                      style={[
                        styles.aidOption,
                        {
                          borderColor: selected
                            ? modelColor(model.aid)
                            : theme.border,
                          backgroundColor: selected
                            ? `${modelColor(model.aid)}22`
                            : theme.surface,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.aidOptionLine,
                          { backgroundColor: modelColor(model.aid) },
                        ]}
                      />
                      <View>
                        <Text
                          style={[
                            styles.aidOptionCode,
                            { color: selected ? theme.text : theme.textMuted },
                          ]}
                        >
                          {model.aid === "AVNI" ? "GFS · AVNI" : model.aid}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.aidOptionName,
                            { color: theme.textFaint },
                          ]}
                        >
                          {model.name}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {view === "Agreement" ? (
              <AgreementSummary models={mappableModels} />
            ) : null}
            <ModelGuidanceMap
              storm={storm}
              height={370}
              visibleAids={visibleAids}
            />
            <View style={styles.legend}>
              {mappableModels
                .filter(
                  (model) =>
                    !visibleAids || visibleAids.includes(model.aid),
                )
                .map((model) => (
                <View key={model.aid} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendLine,
                      { backgroundColor: modelColor(model.aid) },
                    ]}
                  />
                  <Text style={[styles.legendText, { color: theme.textMuted }]}>
                    {model.aid}
                  </Text>
                </View>
                ))}
            </View>

            <SectionTitle
              title="Forecast guidance"
              eyebrow="Official public ATCF model and consensus records"
            />
            {storm.modelGuidance?.aids.length ? (
              <View style={styles.modelList}>
                {storm.modelGuidance.aids.map((model) => (
                  <GuidanceCard key={model.aid} model={model} />
                ))}
              </View>
            ) : (
              <View
                style={[
                  styles.empty,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  Guidance cycle is not available yet
                </Text>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  Hurricane Alley will display only records received from the
                  current NHC public ATCF file. No demonstration models are
                  substituted.
                </Text>
              </View>
            )}

            <SectionTitle
              title="NHC products"
              eyebrow={`Advisory ${storm.products.forecastAdvisory?.advisoryNumber ?? "current"}`}
            />
            <View style={styles.productList}>
              <ProductLink
                icon="chatbox-ellipses-outline"
                title="Forecast discussion"
                subtitle="Forecaster reasoning and model interpretation"
                url={storm.products.forecastDiscussion?.url}
              />
              <ProductLink
                icon="document-text-outline"
                title="Forecast advisory"
                subtitle="Official track, intensity, and wind radii"
                url={storm.products.forecastAdvisory?.url}
              />
              <ProductLink
                icon="analytics-outline"
                title="Wind speed probabilities"
                subtitle="Official NHC probabilistic wind product"
                url={storm.products.windSpeedProbabilities?.url}
              />
            </View>

            <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
              Model guidance is not the official forecast. Hurricane Alley
              displays the public ATCF records without creating a forecast;
              use the NHC forecast and discussion for decisions.
            </Text>
          </Section>
        </>
      ) : (
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
              Official storm guidance will appear here when an active cyclone
              is published.
            </Text>
          </View>
        </Section>
      )}
    </Screen>
  );
}

function AgreementSummary({
  models,
}: {
  models: ReturnType<typeof mappableGuidance>;
}) {
  const { theme } = useTheme();
  const endpoints = models
    .map((model) => model.points.find((point) => point.forecastHour === 72))
    .filter(
      (point): point is GuidancePoint => point !== undefined,
    );

  let spreadMiles = 0;
  for (let left = 0; left < endpoints.length; left += 1) {
    for (let right = left + 1; right < endpoints.length; right += 1) {
      spreadMiles = Math.max(
        spreadMiles,
        distanceMiles(endpoints[left]!, endpoints[right]!),
      );
    }
  }

  const agreement =
    spreadMiles <= 75 ? "TIGHT" : spreadMiles <= 150 ? "MODERATE" : "WIDE";
  const color =
    agreement === "TIGHT"
      ? theme.cyan
      : agreement === "MODERATE"
        ? theme.amber
        : theme.redBright;

  return (
    <View
      style={[
        styles.agreementCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View>
        <Eyebrow>APP-CALCULATED 72-HOUR CLUSTER</Eyebrow>
        <Text style={[styles.agreementLabel, { color }]}>
          {agreement} AGREEMENT
        </Text>
      </View>
      <View style={styles.agreementStats}>
        <View>
          <Text style={[styles.agreementNumber, { color: theme.text }]}>
            {Math.round(spreadMiles)} MI
          </Text>
          <Text style={[styles.agreementMeta, { color: theme.textMuted }]}>
            MAX ENDPOINT SPREAD
          </Text>
        </View>
        <View>
          <Text style={[styles.agreementNumber, { color: theme.text }]}>
            {endpoints.length}
          </Text>
          <Text style={[styles.agreementMeta, { color: theme.textMuted }]}>
            AIDS AT 72 HR
          </Text>
        </View>
      </View>
      <Text style={[styles.agreementNote, { color: theme.textMuted }]}>
        Tight ≤75 mi · Moderate 76–150 mi · Wide &gt;150 mi. This comparison
        summarizes guidance dispersion; it is not an NHC forecast.
      </Text>
    </View>
  );
}

function distanceMiles(
  left: { latitude: number; longitude: number },
  right: { latitude: number; longitude: number },
) {
  const radians = Math.PI / 180;
  const latitudeDelta = (right.latitude - left.latitude) * radians;
  const longitudeDelta =
    ((((right.longitude - left.longitude) + 540) % 360) - 180) * radians;
  const leftLatitude = left.latitude * radians;
  const rightLatitude = right.latitude * radians;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(haversine));
}

function GuidanceCard({
  model,
}: {
  model: NonNullable<LiveStorm["modelGuidance"]>["aids"][number];
}) {
  const { theme } = useTheme();
  const point72 =
    model.points.find((point) => point.forecastHour === 72) ??
    [...model.points]
      .reverse()
      .find((point) => point.forecastHour <= 72);
  const lastPoint = model.points.at(-1);

  return (
    <View
      style={[
        styles.modelCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={styles.modelHeading}>
        <View style={styles.aidBadge}>
          <Text style={styles.aidText}>{model.aid}</Text>
        </View>
        <View style={styles.modelCopy}>
          <Text style={[styles.modelName, { color: theme.text }]}>
            {model.name}
          </Text>
          <Text style={[styles.modelKind, { color: theme.textMuted }]}>
            {model.kind}
          </Text>
        </View>
      </View>
      <View style={styles.stats}>
        <ModelStat
          label={point72 ? `${point72.forecastHour}-HR WIND` : "WIND"}
          value={
            point72?.windMph === null || point72?.windMph === undefined
              ? "—"
              : `${point72.windMph} MPH`
          }
        />
        <ModelStat
          label="FORECAST RANGE"
          value={lastPoint ? `${lastPoint.forecastHour} HR` : "—"}
        />
        <ModelStat
          label="POINTS"
          value={String(model.points.length)}
        />
      </View>
    </View>
  );
}

function ModelStat({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: theme.textFaint }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function ProductLink({
  icon,
  title,
  subtitle,
  url,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  url: string | null | undefined;
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
          opacity: url ? 1 : 0.55,
        },
      ]}
    >
      <Ionicons name={icon} size={22} color={theme.cyan} />
      <View style={styles.productCopy}>
        <Text style={[styles.productTitle, { color: theme.text }]}>
          {title}
        </Text>
        <Text style={[styles.productSubtitle, { color: theme.textMuted }]}>
          {url ? subtitle : "Not published for this storm"}
        </Text>
      </View>
      <Ionicons name="open-outline" size={19} color={theme.textFaint} />
    </Pressable>
  );
}

function formatCycle(value: string | null | undefined) {
  if (!value) return "waiting";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function initialModelView() {
  if (typeof window === "undefined") return "All tracks";
  const requested = new URLSearchParams(window.location.search).get(
    "modelView",
  );
  if (requested === "agreement") return "Agreement";
  if (requested === "individual") return "Individual";
  return "All tracks";
}

function initialModelAid() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search)
    .get("aid")
    ?.toUpperCase() ?? null;
}

const styles = StyleSheet.create({
  sourceCard: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sourceCopy: { flex: 1 },
  sourceTitle: { marginTop: 3, fontSize: 14, fontWeight: "800" },
  sourceText: { marginTop: 4, fontSize: 10, lineHeight: 15 },
  aidPicker: {
    marginBottom: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  aidOption: {
    width: "48%",
    minHeight: 50,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  aidOptionLine: { width: 4, height: 27, borderRadius: 2 },
  aidOptionCode: { fontSize: 9, fontWeight: "800" },
  aidOptionName: { maxWidth: 112, marginTop: 2, fontSize: 7 },
  agreementCard: {
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  agreementLabel: { marginTop: 4, fontSize: 16, fontWeight: "800" },
  agreementStats: {
    marginTop: 13,
    flexDirection: "row",
    gap: 28,
  },
  agreementNumber: {
    fontSize: 16,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  agreementMeta: { marginTop: 3, fontSize: 7, fontWeight: "800" },
  agreementNote: { marginTop: 12, fontSize: 8, lineHeight: 13 },
  legend: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  legendItem: {
    minWidth: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendLine: { width: 18, height: 3, borderRadius: 2 },
  legendText: { fontSize: 8, fontWeight: "800" },
  modelList: { gap: 9 },
  modelCard: { padding: 13, borderWidth: 1, borderRadius: 14 },
  modelHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  aidBadge: {
    minWidth: 48,
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#007C91",
  },
  aidText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },
  modelCopy: { flex: 1 },
  modelName: { fontSize: 12, fontWeight: "800" },
  modelKind: { marginTop: 3, fontSize: 9 },
  stats: { marginTop: 13, flexDirection: "row", gap: 8 },
  stat: { flex: 1 },
  statLabel: { fontSize: 7, fontWeight: "800" },
  statValue: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  productList: { gap: 8 },
  product: {
    minHeight: 72,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  productCopy: { flex: 1 },
  productTitle: { fontSize: 12, fontWeight: "800" },
  productSubtitle: { marginTop: 3, fontSize: 9, lineHeight: 13 },
  empty: { padding: 18, borderWidth: 1, borderRadius: 14 },
  emptyTitle: { fontSize: 14, fontWeight: "800" },
  emptyText: { marginTop: 6, fontSize: 10, lineHeight: 16 },
  disclaimer: { marginTop: 18, fontSize: 10, lineHeight: 16 },
});
