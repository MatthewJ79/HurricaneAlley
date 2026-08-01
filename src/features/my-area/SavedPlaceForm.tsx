import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { SavedPlace } from "../../types";

export function SavedPlaceForm({ enabled, onAdd, onSaved }: {
  enabled: boolean;
  onAdd: (place: Omit<SavedPlace, "id">) => SavedPlace;
  onSaved: (place: SavedPlace) => void;
}) {
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const save = () => {
    const point = { latitude: Number(latitude), longitude: Number(longitude) };
    if (!name.trim()) return setError("Enter a name such as Home or Mom's house.");
    if (!validPoint(point)) return setError("Enter a valid latitude and longitude.");
    const saved = onAdd({ name: name.trim(), ...point });
    onSaved(saved);
    setName("");
    setLatitude("");
    setLongitude("");
    setError(null);
  };

  const locate = async () => {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setError("Location permission was not granted. You can enter coordinates manually.");
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(current.coords.latitude.toFixed(5));
      setLongitude(current.coords.longitude.toFixed(5));
      if (!name.trim()) setName("Current location");
    } catch {
      setError("Your location could not be read. Enter coordinates manually.");
    } finally {
      setLocating(false);
    }
  };

  const inputStyle = [styles.input, {
    color: theme.text,
    borderColor: theme.border,
    backgroundColor: theme.background,
  }];
  return (
    <View pointerEvents={enabled ? "auto" : "none"} style={[styles.form, {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      opacity: enabled ? 1 : 0.55,
    }]}>
      <Text style={[styles.title, { color: theme.text }]}>Add a saved place</Text>
      <Text style={[styles.description, { color: theme.textMuted }]}>Use your current position once or enter coordinates manually. Hurricane Alley sends only the selected coordinates to its alert service.</Text>
      <TextInput accessibilityLabel="Place name" placeholder="Place name, for example Home" placeholderTextColor={theme.textFaint} value={name} onChangeText={setName} style={inputStyle} />
      <View style={styles.coordinateRow}>
        <TextInput accessibilityLabel="Latitude" keyboardType="decimal-pad" placeholder="Latitude" placeholderTextColor={theme.textFaint} value={latitude} onChangeText={setLatitude} style={[...inputStyle, styles.coordinateInput]} />
        <TextInput accessibilityLabel="Longitude" keyboardType="decimal-pad" placeholder="Longitude" placeholderTextColor={theme.textFaint} value={longitude} onChangeText={setLongitude} style={[...inputStyle, styles.coordinateInput]} />
      </View>
      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.redBright }]}>{error}</Text> : null}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={locate} disabled={locating} style={[styles.secondaryButton, { borderColor: theme.cyan }]}>
          <Ionicons name="locate-outline" size={18} color={theme.cyan} />
          <Text style={[styles.secondaryText, { color: theme.cyan }]}>{locating ? "Locating..." : "Use my location"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={save} style={[styles.primaryButton, { backgroundColor: theme.cyan }]}>
          <Ionicons name="add" size={20} color="#003638" />
          <Text style={styles.primaryText}>Save place</Text>
        </Pressable>
      </View>
      <Text style={[styles.note, { color: theme.textFaint }]}>Saved locally on this device. Saved places are not synced to an account.</Text>
    </View>
  );
}

function validPoint(point: { latitude: number; longitude: number }) {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude) &&
    point.latitude >= -90 && point.latitude <= 90 &&
    point.longitude >= -180 && point.longitude <= 180;
}

const styles = StyleSheet.create({
  form: { borderWidth: 1, borderRadius: 18, padding: 18 },
  title: { fontSize: 19, fontWeight: "800" },
  description: { fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 12 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontSize: 15, marginTop: 9 },
  coordinateRow: { flexDirection: "row", gap: 9 },
  coordinateInput: { flex: 1 },
  error: { fontSize: 13, lineHeight: 18, marginTop: 9 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 14 },
  secondaryButton: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  secondaryText: { fontSize: 13, fontWeight: "800" },
  primaryButton: { minHeight: 46, borderRadius: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  primaryText: { color: "#003638", fontSize: 13, fontWeight: "900" },
  note: { fontSize: 11, lineHeight: 16, marginTop: 10 },
});

