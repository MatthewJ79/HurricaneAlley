import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AlertMap } from "../../components/AlertMap";
import { compareAlerts, formatAlertDate } from "../my-area/alertFormatters";
import { useRegionalAlerts } from "../../hooks/useRegionalAlerts";
import { useSavedPlaces } from "../../hooks/useSavedPlaces";
import { useTheme } from "../../theme/ThemeProvider";
import type { LiveStorm, OfficialAlert, SavedPlace } from "../../types";
import { alertActionLabel, alertAreaForStorm, alertColor, pointMatchesAlert } from "../../utils/alerts";
import { SectionHeading } from "./SectionHeading";
import { styles } from "./styles";

type AlertFilter = "All" | "Act now" | "Prepare" | "Monitor";

export function AlertsPanel({ storm, onPrepare }: {
  storm: LiveStorm; productWidth: number; onPrepare: () => void;
}) {
  const { theme } = useTheme();
  const area = alertAreaForStorm(storm);
  const feed = useRegionalAlerts(area?.code ?? null);
  const { places } = useSavedPlaces();
  const [filter, setFilter] = useState<AlertFilter>("All");
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const currentAlerts = useMemo(() => groupAlertsForDisplay(latestAlertVersions(feed.alerts)).sort(compareAlerts), [feed.alerts]);
  const visibleAlerts = useMemo(() => currentAlerts.filter((alert) => matchesFilter(alert, filter)), [currentAlerts, filter]);
  const selectedAlert = visibleAlerts.find((alert) => alert.id === selectedAlertId) ?? visibleAlerts[0] ?? null;
  const selectAlert = useCallback((alertId: string) => setSelectedAlertId(alertId), []);

  useEffect(() => {
    if (!visibleAlerts.some((alert) => alert.id === selectedAlertId)) {
      setSelectedAlertId(visibleAlerts[0]?.id ?? null);
    }
  }, [selectedAlertId, visibleAlerts]);

  if (!area) {
    return (
      <>
        <SectionHeading title="Alerts" meta="Regional coverage unavailable" />
        <View style={[styles.alertEmpty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="map-outline" size={28} color={theme.cyan} />
          <Text style={[styles.alertEmptyTitle, { color: theme.text }]}>All-area alerts are not connected for this basin yet</Text>
          <Text style={[styles.alertEmptyText, { color: theme.textMuted }]}>Storm products remain available in the Summary and Models views while regional alert coverage is expanded.</Text>
        </View>
      </>
    );
  }

  const urgentCount = currentAlerts.filter((alert) => ["Extreme", "Severe"].includes(alert.severity)).length;
  const mappedCount = latestAlertVersions(feed.alerts).filter((alert) => alert.geometry).length;
  return (
    <>
      <SectionHeading title={`${area.label} alerts`} meta={statusText(feed.status, feed.stale, feed.fetchedAt)} />
      <View style={[styles.alertHero, {
        backgroundColor: urgentCount ? theme.emergency : theme.surface,
        borderColor: urgentCount ? theme.emergency : theme.border,
      }]}>
        <Ionicons name={urgentCount ? "warning" : "checkmark-circle-outline"} size={28}
          color={urgentCount ? "#FFFFFF" : theme.cyan} />
        <View style={styles.statusCopy}>
          <Text style={[styles.alertHeroTitle, { color: urgentCount ? "#FFFFFF" : theme.text }]}>
            {feed.status === "loading" ? "Loading every active alert" :
              feed.status === "unavailable" ? "Official alerts are unavailable — this is not an all-clear" :
              urgentCount ? `${urgentCount} urgent warning${urgentCount === 1 ? "" : "s"} across ${area.label}` :
              `No severe or extreme alerts returned for ${area.label}`}
          </Text>
          <Text style={[styles.alertHeroText, { color: urgentCount ? "rgba(255,255,255,.88)" : theme.textMuted }]}>
            {currentAlerts.length} current official message{currentAlerts.length === 1 ? "" : "s"} · {mappedCount} mapped area{mappedCount === 1 ? "" : "s"}. Location is optional.
          </Text>
        </View>
      </View>

      {feed.error ? <Text accessibilityRole="alert" style={[styles.alertError, { color: theme.warning, borderColor: theme.warning }]}>{feed.error}</Text> : null}

      <View style={styles.alertFilterRow} accessibilityRole="tablist">
        {(["All", "Act now", "Prepare", "Monitor"] as AlertFilter[]).map((option) => {
          const active = filter === option;
          return (
            <Pressable key={option} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setFilter(option)}
              style={[styles.alertFilter, { backgroundColor: active ? theme.cyan : theme.surface, borderColor: active ? theme.cyan : theme.border }]}>
              <Text style={[styles.alertFilterText, { color: active ? "#003638" : theme.text }]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      {visibleAlerts.some((alert) => alert.geometry) ? (
        <>
          <View style={styles.alertMapHeading}>
            <View>
              <Text style={[styles.alertMapTitle, { color: theme.text }]}>All affected areas</Text>
              <Text style={[styles.alertMapMeta, { color: theme.textMuted }]}>Select a shaded warning area or an alert below.</Text>
            </View>
            <View style={[styles.officialBadge, { borderColor: theme.cyan }]}>
              <Text style={[styles.officialBadgeText, { color: theme.cyan }]}>OFFICIAL NWS</Text>
            </View>
          </View>
          <AlertMap alerts={visibleAlerts} places={places} selectedAlertId={selectedAlert?.id ?? null}
            onSelectAlert={selectAlert} />
          <MapLegend alerts={visibleAlerts} />
        </>
      ) : null}

      <PlaceImpact places={places} alerts={currentAlerts} />

      <SectionHeading title="Warnings, watches & advisories" meta={`${visibleAlerts.length} shown`} />
      <View style={styles.regionalAlertList}>
        {feed.status !== "loading" && visibleAlerts.length === 0 ? (
          <View style={[styles.alertEmpty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.alertEmptyTitle, { color: theme.text }]}>No alerts in this view</Text>
            <Text style={[styles.alertEmptyText, { color: theme.textMuted }]}>Choose All to review every active official alert.</Text>
          </View>
        ) : null}
        {visibleAlerts.map((alert) => (
          <RegionalAlertCard key={alert.id} alert={alert} places={places}
            selected={alert.id === selectedAlert?.id} onSelect={() => selectAlert(alert.id)} />
        ))}
      </View>

      <Pressable accessibilityRole="button" onPress={onPrepare} style={[styles.prepareButton, { backgroundColor: theme.cyan }]}>
        <Ionicons name="shield-checkmark-outline" size={19} color="#003638" />
        <Text style={styles.prepareButtonText}>Open preparedness</Text>
      </Pressable>
      <Text style={[styles.disclaimer, { color: theme.textMuted }]}>Hurricane Alley displays official alert wording and response categories. It never infers an evacuation order, shelter-in-place instruction, or all-clear from a storm track or forecast cone.</Text>
    </>
  );
}

function RegionalAlertCard({ alert, places, selected, onSelect }: {
  alert: OfficialAlert; places: SavedPlace[]; selected: boolean; onSelect: () => void;
}) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const matched = places.filter((place) => pointMatchesAlert(place, alert));
  const color = alertColor(alert);
  const toggle = () => { onSelect(); setExpanded((value) => !value); };
  return (
    <View style={[styles.regionalAlertCard, {
      backgroundColor: theme.surface,
      borderColor: selected ? color : theme.border,
    }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={toggle} style={styles.regionalAlertHeader}>
        <View style={[styles.alertColorBar, { backgroundColor: color }]} />
        <View style={styles.statusCopy}>
          <Text style={[styles.alertAction, { color }]}>{alertActionLabel(alert).toUpperCase()}</Text>
          <Text style={[styles.regionalAlertEvent, { color: theme.text }]}>{alert.event}</Text>
          <Text numberOfLines={expanded ? undefined : 3} style={[styles.regionalAlertArea, { color: theme.textMuted }]}>{alert.areaDescription ?? "Affected area listed by the issuing office"}</Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={theme.textFaint} />
      </Pressable>
      <View style={styles.alertTimingRow}>
        <Text style={[styles.alertTiming, { color: theme.textMuted }]}>Issued {formatAlertDate(alert.sentAt)}</Text>
        <Text style={[styles.alertTiming, { color: theme.textMuted }]}>Expires {formatAlertDate(alert.endsAt ?? alert.expiresAt)}</Text>
      </View>
      {matched.length ? (
        <View style={styles.placeMatchRow}>
          <Ionicons name="location" size={15} color={color} />
          <Text style={[styles.placeMatchText, { color: theme.text }]}>
            Matches {matched.map((place) => place.name).join(", ")}
          </Text>
        </View>
      ) : null}
      {expanded ? (
        <View style={[styles.alertDetails, { borderTopColor: theme.border }]}>
          {alert.instruction ? <OfficialSection label="Official instructions" value={alert.instruction} emphasized /> : null}
          {alert.description ? <OfficialSection label="Official details" value={alert.description} /> : null}
          {alert.headline ? <OfficialSection label="Headline" value={alert.headline} /> : null}
          <Text style={[styles.alertAuthority, { color: theme.textMuted }]}>{alert.senderName} · {alert.severity} severity · {alert.urgency} urgency</Text>
        </View>
      ) : null}
    </View>
  );
}

function OfficialSection({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.officialSection, emphasized && { backgroundColor: theme.surfaceMuted }]}>
      <Text style={[styles.officialSectionLabel, { color: theme.cyan }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.officialSectionText, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function PlaceImpact({ places, alerts }: { places: SavedPlace[]; alerts: OfficialAlert[] }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.placeImpact, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Ionicons name="people-outline" size={23} color={theme.cyan} />
      <View style={styles.statusCopy}>
        <Text style={[styles.statusTitle, { color: theme.text }]}>People & places</Text>
        {places.length ? places.map((place) => {
          const matches = alerts.filter((alert) => pointMatchesAlert(place, alert));
          return <Text key={place.id} style={[styles.placeImpactText, { color: matches.length ? theme.text : theme.textMuted }]}>
            {place.name}: {matches.length ? `${matches.length} mapped alert${matches.length === 1 ? "" : "s"}` : "No mapped alert matches this point"}
          </Text>;
        }) : <Text style={[styles.placeImpactText, { color: theme.textMuted }]}>All alerts remain visible. Save locations in My Area to highlight family, friends, homes, or other places you care about.</Text>}
      </View>
    </View>
  );
}

function MapLegend({ alerts }: { alerts: OfficialAlert[] }) {
  const { theme } = useTheme();
  const items = [...new Map(alerts.map((alert) => [alert.event, alert])).values()].slice(0, 6);
  return (
    <View style={styles.alertLegend}>
      {items.map((alert) => <View key={alert.event} style={styles.alertLegendItem}>
        <View style={[styles.alertLegendSwatch, { backgroundColor: alertColor(alert) }]} />
        <Text style={[styles.alertLegendText, { color: theme.textMuted }]}>{alert.event}</Text>
      </View>)}
    </View>
  );
}

function latestAlertVersions(alerts: OfficialAlert[]) {
  const replaced = new Set(alerts.flatMap((alert) => alert.references));
  return alerts.filter((alert) => !replaced.has(alert.id));
}

function groupAlertsForDisplay(alerts: OfficialAlert[]) {
  const groups = new Map<string, OfficialAlert[]>();
  alerts.forEach((alert) => {
    const key = [alert.event, alert.severity, alert.urgency, alert.response,
      alert.sentAt, alert.endsAt ?? alert.expiresAt].join("|");
    groups.set(key, [...(groups.get(key) ?? []), alert]);
  });
  return [...groups.entries()].map(([key, items]) => {
    const first = items[0]!;
    const polygons = items.flatMap((alert) => {
      if (!alert.geometry) return [];
      return alert.geometry.type === "Polygon"
        ? [alert.geometry.coordinates]
        : alert.geometry.coordinates;
    });
    const areas = [...new Set(items.flatMap((alert) =>
      (alert.areaDescription ?? "").split(";").map((area) => area.trim()).filter(Boolean)))];
    return {
      ...first,
      id: `group:${key}`,
      areaDescription: areas.join("; ") || first.areaDescription,
      affectedZones: [...new Set(items.flatMap((alert) => alert.affectedZones))],
      references: [...new Set(items.flatMap((alert) => alert.references))],
      geometry: polygons.length ? { type: "MultiPolygon" as const, coordinates: polygons } : null,
    };
  });
}

function matchesFilter(alert: OfficialAlert, filter: AlertFilter) {
  if (filter === "All") return true;
  if (filter === "Act now") return alert.urgency === "Immediate" || ["Evacuate", "Shelter", "Avoid"].includes(alert.response ?? "");
  if (filter === "Prepare") return alert.response === "Prepare" || alert.urgency === "Future";
  return alert.response === "Monitor" || !["Extreme", "Severe"].includes(alert.severity);
}

function statusText(status: string, stale: boolean, fetchedAt: string | null) {
  if (status === "loading") return "Loading official feed";
  if (status === "unavailable") return "Official feed unavailable";
  const checked = formatAlertDate(fetchedAt);
  return stale ? `Cached · ${checked}` : `Updated ${checked}`;
}
