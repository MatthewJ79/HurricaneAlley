import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { ActiveStormMap } from "../components/ActiveStormMap";
import { Screen, ScreenHeader } from "../components/Chrome";
import { Eyebrow, Section, SectionTitle } from "../components/Primitives";
import { StormSelector } from "../components/StormSelector";
import { useTheme } from "../theme/ThemeProvider";
import type { LiveStorm } from "../types";

export function TrackScreen({
  storm,
  storms,
  onSelectStorm,
}: {
  storm: LiveStorm | null;
  storms: LiveStorm[];
  onSelectStorm: (stormId: string) => void;
}) {
  const { theme } = useTheme();

  if (!storm) {
    return (
      <Screen>
        <ScreenHeader title="Storm Track" subtitle="Official NHC forecast" />
        <Section>
          <View
            style={[
              styles.empty,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No active tropical cyclone
            </Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              The official track view will appear when the NHC publishes an
              active advisory.
            </Text>
          </View>
        </Section>
      </Screen>
    );
  }

  const advisoryNumber =
    storm.officialCone?.advisoryNumber ?? "current";
  const issuedAt =
    storm.officialCone?.issuedAt ?? storm.updatedAt;

  return (
    <Screen>
      <ScreenHeader
        title="Storm Track"
        subtitle={`${storm.classification} ${storm.name}`}
      />
      <StormSelector
        storms={storms}
        selectedStormId={storm.id}
        onSelect={onSelectStorm}
      />
      <View style={styles.map}>
        <ActiveStormMap storm={storm} height={430} interactive />
        <View
          pointerEvents="none"
          style={[
            styles.mapStat,
            { backgroundColor: theme.mapStat, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.mapStorm, { color: theme.text }]}>
            {storm.classification} {storm.name}
          </Text>
          <Text style={[styles.mapWind, { color: theme.redBright }]}>
            {storm.wind.mph === null ? "—" : `${storm.wind.mph} MPH`}
          </Text>
          <Eyebrow color={theme.textMuted}>Maximum sustained winds</Eyebrow>
        </View>
      </View>

      <Section>
        <SectionTitle
          title="Official Forecast Track"
          eyebrow={`NHC advisory ${advisoryNumber}`}
        />
        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.timeColumn, { color: theme.textFaint }]}>
            VALID
          </Text>
          <Text style={[styles.th, styles.intensity, { color: theme.textFaint }]}>
            INTENSITY / POSITION
          </Text>
          <Text style={[styles.th, { color: theme.textFaint }]}>WIND</Text>
        </View>
        <View style={[styles.table, { borderColor: theme.border }]}>
          {(storm.forecastPoints ?? []).map((point, index) => {
            const category = windLabel(point.windKnots);
            return (
              <View
                key={`${point.validAt ?? "forecast"}-${index}`}
                style={[
                  styles.row,
                  { borderBottomColor: theme.border },
                ]}
              >
                <Text
                  style={[
                    styles.mono,
                    styles.timeColumn,
                    { color: theme.text },
                  ]}
                >
                  {formatValidTime(point.validAt)}
                </Text>
                <View style={styles.intensityCell}>
                  <Text
                    style={[
                      styles.category,
                      {
                        backgroundColor:
                          point.windKnots >= 64
                            ? theme.redBright
                            : point.windKnots >= 34
                              ? theme.amber
                              : theme.cyan,
                      },
                    ]}
                  >
                    {category}
                  </Text>
                  <View>
                    <Text
                      style={[styles.position, { color: theme.textMuted }]}
                    >
                      {formatPosition(point.latitude, point.longitude)}
                    </Text>
                    {point.status ? (
                      <Text style={[styles.status, { color: theme.textFaint }]}>
                        {point.status.replace(/^\.+/, "")}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text
                  style={[styles.mono, styles.wind, { color: theme.text }]}
                >
                  {point.windMph} MPH
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
          This app displays the National Hurricane Center forecast unchanged.
          The cone indicates probable center-track uncertainty; hazardous
          conditions can occur outside it.
        </Text>
        {storm.officialCone?.sourceUrl ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(storm.officialCone!.sourceUrl)}
          >
            <Text style={[styles.source, { color: theme.cyan }]}>
              Open official NHC cone source
            </Text>
          </Pressable>
        ) : null}
        <Text style={[styles.issued, { color: theme.textMuted }]}>
          Issued {formatIssuedTime(issuedAt)}
        </Text>
      </Section>
    </Screen>
  );
}

function windLabel(knots: number) {
  if (knots >= 137) return "CAT 5";
  if (knots >= 113) return "CAT 4";
  if (knots >= 96) return "CAT 3";
  if (knots >= 83) return "CAT 2";
  if (knots >= 64) return "CAT 1";
  if (knots >= 34) return "TS";
  return "TD";
}

function formatValidTime(value: string | null) {
  if (!value) return "—";
  return new Date(value)
    .toLocaleString([], {
      weekday: "short",
      hour: "numeric",
      timeZoneName: "short",
    })
    .replace(",", "\n");
}

function formatIssuedTime(value: string | null) {
  if (!value) return "time unavailable";
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPosition(latitude: number, longitude: number) {
  const lat = `${Math.abs(latitude).toFixed(1)}°${latitude >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(longitude).toFixed(1)}°${longitude >= 0 ? "E" : "W"}`;
  return `${lat} · ${lon}`;
}

const styles = StyleSheet.create({
  map: { position: "relative", marginHorizontal: 20, overflow: "hidden", borderRadius: 18 },
  mapStat: {
    position: "absolute",
    left: 12,
    bottom: 12,
    minWidth: 185,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  mapStorm: { fontSize: 14, fontWeight: "800" },
  mapWind: {
    marginVertical: 7,
    fontSize: 20,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  tableHeader: {
    paddingBottom: 7,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  th: { width: 68, fontSize: 9, fontWeight: "700" },
  timeColumn: { width: 84 },
  intensity: { flex: 1 },
  table: { borderTopWidth: StyleSheet.hairlineWidth },
  row: {
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
  },
  mono: { fontSize: 10, lineHeight: 15, fontWeight: "600", fontVariant: ["tabular-nums"] },
  intensityCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  category: {
    minWidth: 41,
    color: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },
  position: { fontSize: 9, fontWeight: "600", fontVariant: ["tabular-nums"] },
  status: { marginTop: 3, maxWidth: 120, fontSize: 7, textTransform: "uppercase" },
  wind: { width: 68, textAlign: "right" },
  disclaimer: { marginTop: 18, fontSize: 10, lineHeight: 16 },
  source: { marginTop: 13, fontSize: 10, fontWeight: "700" },
  issued: { marginTop: 12, fontSize: 9 },
  empty: {
    marginTop: 12,
    padding: 24,
    borderWidth: 1,
    borderRadius: 18,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800" },
  emptyText: { marginTop: 8, fontSize: 11, lineHeight: 18 },
});
