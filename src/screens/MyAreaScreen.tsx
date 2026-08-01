import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen, ScreenHeader } from "../components/Chrome";
import { AlertPreferences } from "../features/my-area/AlertPreferences";
import { AlertResults } from "../features/my-area/AlertResults";
import { compareAlerts } from "../features/my-area/alertFormatters";
import { SavedPlaceForm } from "../features/my-area/SavedPlaceForm";
import { usePlaceAlerts } from "../hooks/usePlaceAlerts";
import { usePushRegistration } from "../hooks/usePushRegistration";
import {
  DEFAULT_ALERT_PREFERENCES,
  useSavedPlaces,
} from "../hooks/useSavedPlaces";
import { useTheme } from "../theme/ThemeProvider";

export function MyAreaScreen() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 40, 900);
  const { places, hydrated, addPlace, removePlace, updatePlace } = useSavedPlaces();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId && places.some((place) => place.id === selectedId)) return;
    setSelectedId(places[0]?.id ?? null);
  }, [places, selectedId]);

  const selectedPlace = places.find((place) => place.id === selectedId) ?? null;
  const feed = usePlaceAlerts(selectedPlace);
  const alerts = useMemo(() => [...feed.alerts].sort(compareAlerts), [feed.alerts]);
  const push = usePushRegistration(selectedPlace, updatePlace);
  const preferences = selectedPlace?.alertPreferences ?? DEFAULT_ALERT_PREFERENCES;

  const removeSelectedPlace = async () => {
    if (!selectedPlace) return;
    const safeToRemove = selectedPlace.pushRegistration
      ? await push.disable(preferences)
      : true;
    if (safeToRemove) removePlace(selectedPlace.id);
  };

  return (
    <Screen>
      <ScreenHeader
        title="My Area"
        subtitle="Official alerts matched to places you choose"
        contentWidth={contentWidth}
      />
      <View style={[styles.content, { width: contentWidth }]}>
        <SafetyNote />
        <View style={styles.placeRow}>
          {places.map((place) => (
            <PlaceChip
              key={place.id}
              name={place.name}
              active={place.id === selectedId}
              onPress={() => setSelectedId(place.id)}
            />
          ))}
        </View>
        {!hydrated ? (
          <EmptyState loading />
        ) : selectedPlace ? (
          <AlertResults
            place={selectedPlace}
            alerts={alerts}
            feed={feed}
            onRemove={() => void removeSelectedPlace()}
          />
        ) : (
          <EmptyState />
        )}
        {selectedPlace ? (
          <AlertPreferences
            preferences={preferences}
            registrationStatus={push.status}
            registrationError={push.error}
            onToggle={(enabled, next) => void (enabled ? push.enable(next) : push.disable(next))}
            onChange={(next) => void push.updatePreferences(next)}
          />
        ) : null}
        <SavedPlaceForm enabled={hydrated} onAdd={addPlace} onSaved={(place) => setSelectedId(place.id)} />
      </View>
    </Screen>
  );
}

function SafetyNote() {
  const { theme } = useTheme();
  return (
    <View style={[styles.safetyNote, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Ionicons name="location-outline" size={24} color={theme.cyan} />
      <View style={styles.flex}>
        <Text style={[styles.noteTitle, { color: theme.text }]}>Choose the places that matter</Text>
        <Text style={[styles.noteText, { color: theme.textMuted }]}>Hurricane Alley checks official NWS alert coverage for each coordinate. It does not use the forecast cone to decide whether a warning applies.</Text>
      </View>
    </View>
  );
}

function PlaceChip({ name, active, onPress }: { name: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.placeChip, {
        backgroundColor: active ? theme.cyan : theme.surface,
        borderColor: active ? theme.cyan : theme.border,
      }]}
    >
      <Ionicons name="pin" size={16} color={active ? "#003638" : theme.cyan} />
      <Text style={[styles.placeChipText, { color: active ? "#003638" : theme.text }]}>{name}</Text>
    </Pressable>
  );
}

function EmptyState({ loading = false }: { loading?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Ionicons name={loading ? "sync-outline" : "notifications-outline"} size={34} color={theme.cyan} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        {loading ? "Loading saved places" : "Add a place to check official alerts"}
      </Text>
      {!loading ? <Text style={[styles.emptyText, { color: theme.textMuted }]}>No account or continuous location tracking is required.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: 18, paddingBottom: 20 },
  flex: { flex: 1 },
  safetyNote: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", gap: 12 },
  noteTitle: { fontSize: 16, fontWeight: "800" },
  noteText: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  placeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  placeChip: { minHeight: 42, borderWidth: 1, borderRadius: 21, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 7 },
  placeChipText: { fontSize: 13, fontWeight: "700" },
  empty: { borderWidth: 1, borderRadius: 18, padding: 26, alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: 10, textAlign: "center" },
  emptyText: { fontSize: 13, lineHeight: 19, marginTop: 5, textAlign: "center" },
});
