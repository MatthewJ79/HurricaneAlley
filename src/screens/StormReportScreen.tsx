import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { ActiveStormMap } from "../components/ActiveStormMap";
import { Screen, ScreenHeader } from "../components/Chrome";
import { ModelGuidanceMap } from "../components/ModelGuidanceMap";
import { StormSelector } from "../components/StormSelector";
import { useTheme } from "../theme/ThemeProvider";
import type { Theme } from "../theme/tokens";
import type { LiveStorm } from "../types";
import {
  forecastPositionLabel,
  forecastStrengthLabel,
  formatForecastTime,
} from "../utils/forecast";
import { mappableGuidance, modelColor } from "../utils/modelGuidance";

type ReportView = "Summary" | "Forecast" | "Models" | "Alerts";
type ModelView = "All tracks" | "Agreement" | "Individual";
type GuidancePoint =
  NonNullable<LiveStorm["modelGuidance"]>["aids"][number]["points"][number];

const reportViews: Array<{
  id: ReportView;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}> = [
  { id: "Summary", icon: "pulse-outline", label: "Summary" },
  { id: "Forecast", icon: "navigate-outline", label: "Track & cone" },
  { id: "Models", icon: "analytics-outline", label: "Models" },
  { id: "Alerts", icon: "warning-outline", label: "Alerts & products" },
];

export function StormReportScreen({
  storm,
  storms,
  onSelectStorm,
  onBack,
  onPrepare,
}: {
  storm: LiveStorm | null;
  storms: LiveStorm[];
  onSelectStorm: (stormId: string) => void;
  onBack: () => void;
  onPrepare: () => void;
}) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const desktop = width >= 900;
  const contentWidth = desktop ? Math.min(width * 0.8, 1200) : width - 40;
  const mapHeight = desktop
    ? Math.max(430, Math.min(520, height - 245))
    : 420;
  const [view, setView] = useState<ReportView>(initialReportView);
  const [modelView, setModelView] = useState<ModelView>("All tracks");
  const [selectedAid, setSelectedAid] = useState<string | null>(null);
  const mappableModels = useMemo(
    () => (storm ? mappableGuidance(storm) : []),
    [storm],
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

  if (!storm) {
    return (
      <Screen>
        <ScreenHeader
          title="Storm Report"
          subtitle="No active tropical cyclone"
          onBack={onBack}
          contentWidth={desktop ? contentWidth : undefined}
        />
        <View
          style={[
            styles.empty,
            {
              width: contentWidth,
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No current active storms
          </Text>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            Return to Home. A full report will become available when the NHC
            publishes an active cyclone.
          </Text>
        </View>
      </Screen>
    );
  }

  const visibleAids =
    modelView === "Individual" && selectedAid ? [selectedAid] : undefined;
  const desktopWorkspaceWidth = contentWidth - 450;
  const guidanceWidth = desktop
    ? (desktopWorkspaceWidth - 7) / 2
    : contentWidth;
  const productWidth = desktop
    ? (desktopWorkspaceWidth - 7) / 2
    : contentWidth;

  return (
    <Screen>
      <ScreenHeader
        title={`${storm.classification} ${storm.name}`}
        subtitle={`${storm.basin} · Complete official storm report`}
        onBack={onBack}
        compact={desktop}
        contentWidth={desktop ? contentWidth : undefined}
        rightContent={
          desktop ? (
            <StormSelector
              compact
              storms={storms}
              selectedStormId={storm.id}
              onSelect={onSelectStorm}
            />
          ) : undefined
        }
      />

      <View style={[styles.report, { width: contentWidth }]}>
        {desktop ? (
          <View style={styles.desktopDashboard}>
            <ReportNavigation
              view={view}
              vertical
              onChange={setView}
            />
            <View style={styles.desktopWorkspace}>
              {view !== "Alerts" ? (
                <ReportMap
                  storm={storm}
                  view={view}
                  height={mapHeight}
                  visibleAids={visibleAids}
                />
              ) : null}
              {view === "Models" ? (
                <ModelsPanel
                  storm={storm}
                  models={mappableModels}
                  modelView={modelView}
                  selectedAid={selectedAid}
                  guidanceWidth={guidanceWidth}
                  compact
                  onSetModelView={setModelView}
                  onSelectAid={(aid) => {
                    setSelectedAid(aid);
                    setModelView("Individual");
                  }}
                />
              ) : null}
              {view === "Alerts" ? (
                <AlertsPanel
                  storm={storm}
                  productWidth={productWidth}
                  onPrepare={onPrepare}
                />
              ) : null}
              {view === "Forecast" ? (
                <ForecastSource storm={storm} />
              ) : null}
            </View>
            <DesktopInformationRail storm={storm} />
          </View>
        ) : (
          <>
        {!desktop ? (
          <StormSelector
            storms={storms}
            selectedStormId={storm.id}
            onSelect={onSelectStorm}
          />
        ) : null}

        <StormSummary storm={storm} compact={!desktop} />

        <View
          accessibilityRole="tablist"
          style={[
            styles.reportTabs,
            !desktop && styles.reportTabsMobile,
            { borderColor: theme.border },
          ]}
        >
          {reportViews.map((item) => {
            const active = item.id === view;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setView(item.id)}
                style={[
                  styles.reportTab,
                  !desktop && styles.reportTabMobile,
                  active && { backgroundColor: theme.cyan },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={active ? "#003638" : theme.textMuted}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.reportTabText,
                    { color: active ? "#003638" : theme.textMuted },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {view !== "Alerts" ? (
          <View style={styles.mapSurface}>
            <View style={styles.mapHeading}>
              <View>
                <Text style={[styles.mapTitle, { color: theme.text }]}>
                  {view === "Models"
                    ? "Official model guidance"
                    : "Official NHC track"}
                </Text>
                <Text style={[styles.mapMeta, { color: theme.textMuted }]}>
                  {view === "Models"
                    ? `${formatCycle(storm.modelGuidance?.cycleAt)} · ${
                        storm.modelGuidance?.aids.length ?? 0
                      } public ATCF aids`
                    : `Advisory ${
                        storm.officialCone?.advisoryNumber ??
                        storm.products.forecastAdvisory?.advisoryNumber ??
                        "current"
                      } · Cone, center, and forecast positions`}
                </Text>
              </View>
              <View style={[styles.liveBadge, { borderColor: theme.cyan }]}>
                <Text style={[styles.liveBadgeText, { color: theme.cyan }]}>
                  LIVE NHC
                </Text>
              </View>
            </View>
            {view === "Models" ? (
              <ModelGuidanceMap
                storm={storm}
                height={mapHeight}
                visibleAids={visibleAids}
              />
            ) : (
              <ActiveStormMap
                storm={storm}
                height={mapHeight}
                interactive
              />
            )}
          </View>
        ) : null}

        {view === "Summary" ? <SummaryPanel storm={storm} /> : null}
        {view === "Forecast" ? <ForecastPanel storm={storm} /> : null}
        {view === "Models" ? (
          <ModelsPanel
            storm={storm}
            models={mappableModels}
            modelView={modelView}
            selectedAid={selectedAid}
            guidanceWidth={guidanceWidth}
            onSetModelView={setModelView}
            onSelectAid={(aid) => {
              setSelectedAid(aid);
              setModelView("Individual");
            }}
          />
        ) : null}
        {view === "Alerts" ? (
          <AlertsPanel
            storm={storm}
            productWidth={productWidth}
            onPrepare={onPrepare}
          />
        ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

function ReportNavigation({
  view,
  vertical = false,
  onChange,
}: {
  view: ReportView;
  vertical?: boolean;
  onChange: (view: ReportView) => void;
}) {
  const { theme } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.reportTabs,
        vertical && styles.reportTabsVertical,
        { borderColor: theme.border, backgroundColor: theme.surface },
      ]}
    >
      {vertical ? (
        <View style={styles.railHeading}>
          <Text style={[styles.railEyebrow, { color: theme.textFaint }]}>
            STORM REPORT
          </Text>
          <Text style={[styles.railTitle, { color: theme.text }]}>Views</Text>
        </View>
      ) : null}
      {reportViews.map((item) => {
        const active = item.id === view;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.id)}
            style={[
              styles.reportTab,
              vertical && styles.reportTabVertical,
              active && { backgroundColor: theme.cyan },
            ]}
          >
            <Ionicons
              name={item.icon}
              size={vertical ? 19 : 16}
              color={active ? "#003638" : theme.textMuted}
            />
            <Text
              numberOfLines={vertical ? 2 : 1}
              style={[
                styles.reportTabText,
                vertical && styles.reportTabTextVertical,
                { color: active ? "#003638" : theme.textMuted },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ReportMap({
  storm,
  view,
  height,
  visibleAids,
}: {
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
            {view === "Models"
              ? "Official model guidance"
              : "Official NHC track"}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.mapMeta, { color: theme.textMuted }]}
          >
            {view === "Models"
              ? `${formatCycle(storm.modelGuidance?.cycleAt)} · ${
                  storm.modelGuidance?.aids.length ?? 0
                } public ATCF aids`
              : `Advisory ${
                  storm.officialCone?.advisoryNumber ??
                  storm.products.forecastAdvisory?.advisoryNumber ??
                  "current"
                } · Cone, center, and forecast positions`}
          </Text>
        </View>
        <View style={[styles.liveBadge, { borderColor: theme.cyan }]}>
          <Text style={[styles.liveBadgeText, { color: theme.cyan }]}>
            LIVE NHC
          </Text>
        </View>
      </View>
      {view === "Models" ? (
        <ModelGuidanceMap
          storm={storm}
          height={displayedHeight}
          visibleAids={visibleAids}
        />
      ) : (
        <ActiveStormMap storm={storm} height={displayedHeight} interactive />
      )}
    </View>
  );
}

function DesktopInformationRail({ storm }: { storm: LiveStorm }) {
  const { theme } = useTheme();
  const forecast = storm.forecastPoints ?? [];
  return (
    <View style={styles.informationRail}>
      <View
        style={[
          styles.conditionsCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.conditionsHeading}>
          <View>
            <Text style={[styles.conditionsEyebrow, { color: theme.cyan }]}>
              {storm.classificationCode} · {storm.basin.toUpperCase()}
            </Text>
            <Text style={[styles.conditionsLabel, { color: theme.textMuted }]}>
              CURRENT CONDITIONS
            </Text>
          </View>
          <View style={[styles.liveDot, { backgroundColor: theme.redBright }]} />
        </View>
        <View style={styles.primaryWind}>
          <Text style={[styles.primaryWindValue, { color: theme.redBright }]}>
            {storm.wind.mph === null ? "—" : storm.wind.mph}
          </Text>
          <View>
            <Text style={[styles.primaryWindUnit, { color: theme.text }]}>
              MPH
            </Text>
            <Text style={[styles.primaryWindMeta, { color: theme.textFaint }]}>
              MAX WIND
            </Text>
          </View>
        </View>
        <View style={styles.conditionsMetrics}>
          <RailMetric
            label="PRESSURE"
            value={
              storm.pressureMb === null ? "—" : `${storm.pressureMb} MB`
            }
          />
          <RailMetric label="MOTION" value={formatMotion(storm)} />
          <RailMetric
            label="CENTER"
            value={`${storm.center.displayLatitude ?? "—"} · ${
              storm.center.displayLongitude ?? "—"
            }`}
            wide
          />
        </View>
        <Text style={[styles.conditionsUpdated, { color: theme.textFaint }]}>
          OFFICIAL UPDATE · {formatUpdated(storm.updatedAt)}
        </Text>
      </View>

      <View
        style={[
          styles.forecastRail,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.forecastRailHeading}>
          <View>
            <Text style={[styles.forecastRailTitle, { color: theme.text }]}>
              Official forecast
            </Text>
            <Text style={[styles.forecastRailMeta, { color: theme.textMuted }]}>
              NHC CENTER POSITIONS
            </Text>
          </View>
          <Text style={[styles.advisoryBadge, { color: theme.cyan }]}>
            ADV{" "}
            {storm.officialCone?.advisoryNumber ??
              storm.products.forecastAdvisory?.advisoryNumber ??
              "—"}
          </Text>
        </View>
        <View style={styles.forecastRailList}>
          {forecast.map((point, index) => (
            <View
              key={`${point.validAt ?? "forecast"}-${index}`}
              style={[
                styles.forecastRailRow,
                index < forecast.length - 1 && {
                  borderBottomColor: theme.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={styles.forecastRailTime}>
                <Text
                  numberOfLines={1}
                  style={[styles.forecastRailTimeText, { color: theme.text }]}
                >
                  {formatForecastTime(point.validAt)}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.forecastRailPosition,
                    { color: theme.textFaint },
                  ]}
                >
                  {forecastPositionLabel(point.latitude, point.longitude)}
                </Text>
              </View>
              <View
                style={[
                  styles.forecastStrengthBadge,
                  { backgroundColor: `${forecastTone(point.windKnots, theme)}20` },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.forecastStrengthBadgeText,
                    { color: forecastTone(point.windKnots, theme) },
                  ]}
                >
                  {forecastStrengthLabel(point)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function RailMetric({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.railMetric, wide && styles.railMetricWide]}>
      <Text style={[styles.railMetricLabel, { color: theme.textFaint }]}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.railMetricValue, { color: theme.text }]}
      >
        {value}
      </Text>
    </View>
  );
}

function ForecastSource({ storm }: { storm: LiveStorm }) {
  const { theme } = useTheme();
  return (
    <View style={styles.forecastSource}>
      <Text style={[styles.forecastSourceText, { color: theme.textMuted }]}>
        The cone represents probable center-track uncertainty. Hazardous
        conditions can occur outside it.
      </Text>
      {storm.officialCone?.sourceUrl ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(storm.officialCone!.sourceUrl)}
        >
          <Text style={[styles.forecastSourceLink, { color: theme.cyan }]}>
            OFFICIAL NHC CONE SOURCE
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StormSummary({
  storm,
  compact,
}: {
  storm: LiveStorm;
  compact: boolean;
}) {
  const { theme } = useTheme();
  const metrics = [
    ["MAX WIND", storm.wind.mph === null ? "—" : `${storm.wind.mph} MPH`],
    ["PRESSURE", storm.pressureMb === null ? "—" : `${storm.pressureMb} MB`],
    ["MOTION", formatMotion(storm)],
    [
      "CENTER",
      `${storm.center.displayLatitude ?? "—"} · ${
        storm.center.displayLongitude ?? "—"
      }`,
    ],
  ];

  return (
    <View
      style={[
        styles.summaryStrip,
        compact && styles.summaryStripMobile,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View
        style={[
          styles.summaryIdentity,
          compact && styles.summaryIdentityMobile,
        ]}
      >
        <Text style={[styles.summaryClassification, { color: theme.cyan }]}>
          {storm.classificationCode} · {storm.basin.toUpperCase()}
        </Text>
        <Text style={[styles.summaryTime, { color: theme.textMuted }]}>
          Official update {formatUpdated(storm.updatedAt)}
        </Text>
      </View>
      <View style={styles.metrics}>
        {metrics.map(([label, value], index) => (
          <View key={label} style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.textFaint }]}>
              {label}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.metricValue,
                { color: index === 0 ? theme.redBright : theme.text },
              ]}
            >
              {value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryPanel({ storm }: { storm: LiveStorm }) {
  const { theme } = useTheme();
  const nextPoints = (storm.forecastPoints ?? []).slice(0, 4);
  const hasWarning = Boolean(
    storm.products.windWatchesWarnings ||
      storm.products.stormSurgeWatchWarning,
  );

  return (
    <>
      <SectionHeading
        title="Report summary"
        meta="Latest official forecast positions"
      />
      <View style={styles.summaryGrid}>
        <View
          style={[
            styles.statusCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Ionicons
            name={hasWarning ? "warning-outline" : "checkmark-circle-outline"}
            size={24}
            color={hasWarning ? theme.redBright : theme.cyan}
          />
          <View style={styles.statusCopy}>
            <Text style={[styles.statusTitle, { color: theme.text }]}>
              {hasWarning
                ? "Official watch or warning product published"
                : "No storm-specific NHC watch/warning layer"}
            </Text>
            <Text style={[styles.statusText, { color: theme.textMuted }]}>
              Open Alerts & Products for affected locations and the complete
              official advisory record.
            </Text>
          </View>
        </View>
        <View style={styles.nextForecast}>
          {nextPoints.map((point, index) => (
            <View
              key={`${point.validAt ?? "forecast"}-${index}`}
              style={[
                styles.nextPoint,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.nextTime, { color: theme.text }]}>
                {formatForecastTime(point.validAt)}
              </Text>
              <Text style={[styles.nextStrength, { color: theme.redBright }]}>
                {forecastStrengthLabel(point)}
              </Text>
              <Text style={[styles.nextPosition, { color: theme.textMuted }]}>
                {forecastPositionLabel(point.latitude, point.longitude)}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
        Hurricane Alley displays official NOAA/NHC information unchanged and
        does not create a forecast.
      </Text>
    </>
  );
}

function ForecastPanel({ storm }: { storm: LiveStorm }) {
  const { theme } = useTheme();
  return (
    <>
      <SectionHeading
        title="Official forecast"
        meta={`${storm.forecastPoints?.length ?? 0} published positions`}
      />
      <View style={styles.forecastGrid}>
        {(storm.forecastPoints ?? []).map((point, index) => (
          <View
            key={`${point.validAt ?? "forecast"}-${index}`}
            style={[
              styles.forecastPoint,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.forecastTime, { color: theme.text }]}>
              {formatForecastTime(point.validAt)}
            </Text>
            <Text style={[styles.forecastStrength, { color: theme.redBright }]}>
              {forecastStrengthLabel(point)}
            </Text>
            <Text style={[styles.forecastPosition, { color: theme.textMuted }]}>
              {forecastPositionLabel(point.latitude, point.longitude)}
            </Text>
          </View>
        ))}
      </View>
      {storm.officialCone?.sourceUrl ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(storm.officialCone!.sourceUrl)}
        >
          <Text style={[styles.sourceLink, { color: theme.cyan }]}>
            Open the official NHC cone source
          </Text>
        </Pressable>
      ) : null}
      <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
        The cone represents probable center-track uncertainty. Hazardous
        conditions can occur outside the cone.
      </Text>
    </>
  );
}

function ModelsPanel({
  storm,
  models,
  modelView,
  selectedAid,
  guidanceWidth,
  compact = false,
  onSetModelView,
  onSelectAid,
}: {
  storm: LiveStorm;
  models: ReturnType<typeof mappableGuidance>;
  modelView: ModelView;
  selectedAid: string | null;
  guidanceWidth: number;
  compact?: boolean;
  onSetModelView: (view: ModelView) => void;
  onSelectAid: (aid: string) => void;
}) {
  const { theme } = useTheme();
  return (
    <>
      <View
        style={[
          styles.modelControls,
          compact && styles.modelControlsCompact,
        ]}
      >
        <View style={styles.modelViewRow}>
          {(["All tracks", "Agreement", "Individual"] as const).map(
            (option) => {
              const active = option === modelView;
              return (
                <Pressable
                  key={option}
                  onPress={() => onSetModelView(option)}
                  style={[
                    styles.smallTag,
                    {
                      borderColor: active ? theme.cyan : theme.border,
                      backgroundColor: active
                        ? `${theme.cyan}1C`
                        : theme.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.smallTagText,
                      { color: active ? theme.cyan : theme.textMuted },
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>
        <View style={styles.aidRow}>
          {models.map((model) => (
            <Pressable
              key={model.aid}
              onPress={() => onSelectAid(model.aid)}
              style={[
                styles.aidTag,
                {
                  borderColor:
                    modelView === "Individual" && selectedAid === model.aid
                      ? modelColor(model.aid)
                      : theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.aidLine,
                  { backgroundColor: modelColor(model.aid) },
                ]}
              />
              <Text style={[styles.aidTagText, { color: theme.textMuted }]}>
                {model.aid === "AVNI" ? "GFS · AVNI" : model.aid}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {modelView === "Agreement" ? (
        <AgreementSummary models={models} />
      ) : null}

      <SectionHeading
        title="Forecast guidance"
        meta="Official public ATCF records"
      />
      <View style={styles.guidanceGrid}>
        {(storm.modelGuidance?.aids ?? []).map((model) => (
          <GuidanceRow
            key={model.aid}
            model={model}
            width={guidanceWidth}
          />
        ))}
      </View>
      <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
        Model guidance is not the official forecast. Use the NHC forecast and
        discussion for decisions.
      </Text>
    </>
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
    .filter((point): point is GuidancePoint => point !== undefined);
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
        styles.agreement,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.agreementTitle, { color }]}>
        {agreement} AGREEMENT
      </Text>
      <Text style={[styles.agreementValue, { color: theme.text }]}>
        {Math.round(spreadMiles)} MI MAX SPREAD · {endpoints.length} AIDS AT 72H
      </Text>
      <Text style={[styles.agreementNote, { color: theme.textMuted }]}>
        APP-CALCULATED DISPERSION · NOT AN NHC FORECAST
      </Text>
    </View>
  );
}

function GuidanceRow({
  model,
  width,
}: {
  model: NonNullable<LiveStorm["modelGuidance"]>["aids"][number];
  width: number;
}) {
  const { theme } = useTheme();
  const point72 =
    model.points.find((point) => point.forecastHour === 72) ??
    [...model.points].reverse().find((point) => point.forecastHour <= 72);
  const last = model.points.at(-1);
  return (
    <View
      style={[
        styles.guidanceRow,
        {
          width,
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View
        style={[
          styles.guidanceColor,
          { backgroundColor: modelColor(model.aid) },
        ]}
      />
      <Text style={styles.guidanceAid}>{model.aid}</Text>
      <Text
        numberOfLines={1}
        style={[styles.guidanceName, { color: theme.text }]}
      >
        {model.name}
      </Text>
      <Text style={[styles.guidanceStat, { color: theme.textMuted }]}>
        {point72?.windMph === null || point72?.windMph === undefined
          ? "72H —"
          : `72H ${point72.windMph} MPH`}
        {last ? ` · ${last.forecastHour}H` : ""}
      </Text>
    </View>
  );
}

function AlertsPanel({
  storm,
  productWidth,
  onPrepare,
}: {
  storm: LiveStorm;
  productWidth: number;
  onPrepare: () => void;
}) {
  const { theme } = useTheme();
  const watches = storm.products.windWatchesWarnings;
  const surge = storm.products.stormSurgeWatchWarning;
  const products = [
    {
      icon: "megaphone-outline" as const,
      title: "NHC public advisory",
      subtitle: "Current hazards, watches, warnings, and affected areas",
      url: storm.products.publicAdvisory?.url,
    },
    {
      icon: "chatbox-ellipses-outline" as const,
      title: "Forecast discussion",
      subtitle: "Forecaster reasoning and model interpretation",
      url: storm.products.forecastDiscussion?.url,
    },
    {
      icon: "document-text-outline" as const,
      title: "Forecast advisory",
      subtitle: "Official track, intensity, and wind radii",
      url: storm.products.forecastAdvisory?.url,
    },
    {
      icon: "warning-outline" as const,
      title: "Tropical cyclone watches/warnings",
      subtitle: "Official NHC geographic watch and warning product",
      url: productUrl(watches),
    },
    {
      icon: "water-outline" as const,
      title: "Storm surge watch/warning",
      subtitle: "Published for applicable Atlantic and Gulf threats",
      url: productUrl(surge),
    },
    {
      icon: "analytics-outline" as const,
      title: "Wind speed probabilities",
      subtitle: "Official probabilities for tropical-storm-force winds",
      url: storm.products.windSpeedProbabilities?.url,
    },
    {
      icon: "time-outline" as const,
      title: "Earliest reasonable tropical-storm winds",
      subtitle: "Official NHC arrival-time GIS product",
      url: productUrl(storm.products.earliestTropicalStormWinds),
    },
    {
      icon: "time-outline" as const,
      title: "Most likely tropical-storm winds",
      subtitle: "Official NHC most-likely arrival-time GIS product",
      url: productUrl(storm.products.mostLikelyTropicalStormWinds),
    },
  ];

  return (
    <>
      <SectionHeading
        title="Alerts & official products"
        meta={`Advisory ${
          storm.products.publicAdvisory?.advisoryNumber ?? "current"
        }`}
      />
      <View
        style={[
          styles.alertStatus,
          {
            backgroundColor:
              watches || surge ? theme.emergency : theme.surface,
            borderColor: watches || surge ? theme.emergency : theme.border,
          },
        ]}
      >
        <Ionicons
          name={watches || surge ? "warning-outline" : "checkmark-circle-outline"}
          size={26}
          color={watches || surge ? "#FFFFFF" : theme.cyan}
        />
        <View style={styles.statusCopy}>
          <Text
            style={[
              styles.statusTitle,
              { color: watches || surge ? "#FFFFFF" : theme.text },
            ]}
          >
            {watches || surge
              ? "Official watch or warning product published"
              : "No storm-specific NHC watch/warning layer"}
          </Text>
          <Text
            style={[
              styles.statusText,
              {
                color:
                  watches || surge ? "rgba(255,255,255,.86)" : theme.textMuted,
              },
            ]}
          >
            Always review local NWS and emergency-management instructions.
          </Text>
        </View>
      </View>
      <View style={styles.productGrid}>
        {products.map((product) => (
          <OfficialProduct
            key={product.title}
            {...product}
            width={productWidth}
          />
        ))}
      </View>
      <View
        style={[
          styles.locationNotice,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Ionicons name="location-outline" size={23} color={theme.cyan} />
        <View style={styles.statusCopy}>
          <Text style={[styles.statusTitle, { color: theme.text }]}>
            Location-specific alerts are planned
          </Text>
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            Opt-in device location will be matched with official NWS and local
            emergency-management zones. Hurricane Alley will never infer an
            evacuation order.
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onPrepare}
        style={[styles.prepareButton, { backgroundColor: theme.cyan }]}
      >
        <Ionicons name="shield-checkmark-outline" size={19} color="#003638" />
        <Text style={styles.prepareButtonText}>Open preparedness</Text>
      </Pressable>
      <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
        Hurricane Alley reproduces official products and does not issue,
        modify, infer, or predict watches, warnings, or evacuation orders.
      </Text>
    </>
  );
}

function OfficialProduct({
  icon,
  title,
  subtitle,
  url,
  width,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  url: string | null | undefined;
  width: number;
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
          width,
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: url ? 1 : 0.55,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={theme.cyan} />
      <View style={styles.productCopy}>
        <Text
          numberOfLines={1}
          style={[styles.productTitle, { color: theme.text }]}
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.productText, { color: theme.textMuted }]}
        >
          {url ? subtitle : "Not currently published for this storm"}
        </Text>
      </View>
      {url ? (
        <Ionicons name="open-outline" size={17} color={theme.textFaint} />
      ) : null}
    </Pressable>
  );
}

function SectionHeading({ title, meta }: { title: string; meta: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeading}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <Text
        numberOfLines={1}
        style={[styles.sectionMeta, { color: theme.textFaint }]}
      >
        {meta}
      </Text>
    </View>
  );
}

function productUrl(
  product: LiveStorm["products"][keyof LiveStorm["products"]] | undefined,
) {
  return product?.url ?? product?.kmzUrl ?? product?.zipUrl ?? null;
}

function forecastTone(windKnots: number, theme: Theme) {
  if (windKnots >= 64) return theme.redBright;
  if (windKnots >= 34) return theme.amber;
  return theme.cyan;
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

function formatCycle(value: string | null | undefined) {
  if (!value) return "Cycle pending";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function initialReportView(): ReportView {
  if (typeof window === "undefined") return "Summary";
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("reportView") ?? params.get("screen");
  if (requested === "track" || requested === "forecast") return "Forecast";
  if (requested === "data" || requested === "models") return "Models";
  if (requested === "alerts") return "Alerts";
  return "Summary";
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

const styles = StyleSheet.create({
  report: {
    alignSelf: "center",
    paddingBottom: 24,
  },
  desktopDashboard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  desktopWorkspace: {
    minWidth: 0,
    flex: 1,
  },
  informationRail: {
    width: 300,
    gap: 8,
  },
  summaryStrip: {
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  summaryIdentity: { minWidth: 185 },
  summaryStripMobile: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 10,
  },
  summaryIdentityMobile: { minWidth: 0 },
  summaryClassification: { fontSize: 9, fontWeight: "800" },
  summaryTime: { marginTop: 3, fontSize: 8 },
  metrics: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metric: { minWidth: 110, flex: 1 },
  metricLabel: { fontSize: 7, fontWeight: "800" },
  metricValue: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  reportTabs: {
    marginBottom: 12,
    padding: 4,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    gap: 4,
  },
  reportTabsMobile: { flexWrap: "wrap" },
  reportTabsVertical: {
    width: 130,
    marginBottom: 0,
    padding: 6,
    flexDirection: "column",
    gap: 5,
  },
  railHeading: {
    paddingHorizontal: 7,
    paddingTop: 7,
    paddingBottom: 9,
  },
  railEyebrow: { fontSize: 8, fontWeight: "800" },
  railTitle: { marginTop: 2, fontSize: 17, fontWeight: "800" },
  reportTab: {
    minWidth: 0,
    minHeight: 38,
    flex: 1,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  reportTabMobile: {
    flexBasis: "47%",
    flexGrow: 1,
    flexShrink: 1,
  },
  reportTabText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  reportTabVertical: {
    minHeight: 62,
    flex: 0,
    paddingHorizontal: 8,
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 5,
  },
  reportTabTextVertical: {
    fontSize: 9.5,
    lineHeight: 13,
    textAlign: "left",
  },
  mapSurface: { width: "100%" },
  mapHeading: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  mapHeadingCopy: { minWidth: 0, flex: 1 },
  mapTitle: { fontSize: 18, fontWeight: "800" },
  mapMeta: { marginTop: 2, fontSize: 8, fontWeight: "600" },
  liveBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 999,
  },
  liveBadgeText: { fontSize: 7, fontWeight: "800" },
  conditionsCard: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  conditionsHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  conditionsEyebrow: { fontSize: 9, fontWeight: "800" },
  conditionsLabel: { marginTop: 3, fontSize: 8.5, fontWeight: "700" },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  primaryWind: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
  },
  primaryWindValue: {
    fontSize: 38,
    lineHeight: 40,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  primaryWindUnit: { fontSize: 14, fontWeight: "800" },
  primaryWindMeta: { marginTop: 1, fontSize: 9, fontWeight: "800" },
  conditionsMetrics: {
    marginTop: 9,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  railMetric: { minWidth: 105, flex: 1 },
  railMetricWide: { minWidth: "100%" },
  railMetricLabel: { fontSize: 8, fontWeight: "800" },
  railMetricValue: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  conditionsUpdated: {
    marginTop: 11,
    paddingTop: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#303A46",
    fontSize: 8,
    fontWeight: "700",
  },
  forecastRail: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  forecastRailHeading: {
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  forecastRailTitle: { fontSize: 16, fontWeight: "800" },
  forecastRailMeta: { marginTop: 3, fontSize: 8, fontWeight: "700" },
  advisoryBadge: { fontSize: 9, fontWeight: "800" },
  forecastRailList: { width: "100%" },
  forecastRailRow: {
    minHeight: 51,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  forecastRailTime: { minWidth: 0, flex: 1 },
  forecastRailTimeText: { fontSize: 10, fontWeight: "800" },
  forecastRailPosition: {
    marginTop: 3,
    fontSize: 8,
    fontWeight: "700",
  },
  forecastStrengthBadge: {
    maxWidth: 120,
    minWidth: 108,
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 6,
  },
  forecastStrengthBadgeText: {
    fontSize: 8.5,
    fontWeight: "800",
    textAlign: "center",
  },
  forecastSource: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  forecastSourceText: { minWidth: 0, flex: 1, fontSize: 7.5, lineHeight: 11 },
  forecastSourceLink: { fontSize: 7, fontWeight: "800" },
  sectionHeading: {
    marginTop: 18,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  sectionMeta: {
    minWidth: 0,
    flexShrink: 1,
    fontSize: 8,
    fontWeight: "700",
    textAlign: "right",
    textTransform: "uppercase",
  },
  summaryGrid: { gap: 7 },
  statusCard: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusCopy: { minWidth: 0, flex: 1 },
  statusTitle: { fontSize: 11, fontWeight: "800" },
  statusText: { marginTop: 3, fontSize: 8, lineHeight: 12 },
  nextForecast: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  nextPoint: {
    minWidth: 155,
    flex: 1,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 9,
  },
  nextTime: { fontSize: 8, fontWeight: "800" },
  nextStrength: { marginTop: 3, fontSize: 9, fontWeight: "800" },
  nextPosition: { marginTop: 2, fontSize: 7, fontWeight: "700" },
  forecastGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  forecastPoint: {
    minWidth: 190,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 9,
  },
  forecastTime: { fontSize: 9, fontWeight: "800" },
  forecastStrength: { marginTop: 4, fontSize: 11, fontWeight: "800" },
  forecastPosition: { marginTop: 3, fontSize: 8, fontWeight: "700" },
  sourceLink: { marginTop: 12, fontSize: 10, fontWeight: "800" },
  modelControls: { marginTop: 9, gap: 6 },
  modelControlsCompact: { marginTop: 6 },
  modelViewRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  smallTag: {
    minHeight: 27,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 999,
    justifyContent: "center",
  },
  smallTagText: { fontSize: 8, fontWeight: "800", textTransform: "uppercase" },
  aidRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  aidTag: {
    minHeight: 25,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  aidLine: { width: 12, height: 3, borderRadius: 2 },
  aidTagText: { fontSize: 7.5, fontWeight: "800" },
  agreement: {
    marginTop: 8,
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  agreementTitle: { fontSize: 10, fontWeight: "800" },
  agreementValue: {
    fontSize: 8,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  agreementNote: { minWidth: 0, flex: 1, fontSize: 7, textAlign: "right" },
  guidanceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  guidanceRow: {
    minHeight: 39,
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  guidanceColor: { width: 3, height: 22, borderRadius: 2 },
  guidanceAid: {
    minWidth: 40,
    color: "#FFFFFF",
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: "#007C91",
    fontSize: 8,
    fontWeight: "800",
    textAlign: "center",
  },
  guidanceName: { minWidth: 0, flex: 1, fontSize: 10, fontWeight: "800" },
  guidanceStat: {
    fontSize: 7.5,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  alertStatus: {
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  productGrid: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  product: {
    minHeight: 52,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  productCopy: { minWidth: 0, flex: 1 },
  productTitle: { fontSize: 10, fontWeight: "800" },
  productText: { marginTop: 2, fontSize: 8 },
  locationNotice: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  prepareButton: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  prepareButtonText: {
    color: "#003638",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  disclaimer: { marginTop: 14, fontSize: 9, lineHeight: 14 },
  empty: {
    alignSelf: "center",
    padding: 20,
    borderWidth: 1,
    borderRadius: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyText: { marginTop: 6, fontSize: 10, lineHeight: 16 },
});
