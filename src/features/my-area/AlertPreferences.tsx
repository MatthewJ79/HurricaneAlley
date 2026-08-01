import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { PushRegistrationState } from "../../hooks/usePushRegistration";
import { useTheme } from "../../theme/ThemeProvider";
import type { AlertPreferences as Preferences } from "../../types";

const LEVELS: Preferences["minimumSeverity"][] = [
  "Extreme",
  "Severe",
  "Moderate",
  "Any",
];

export function AlertPreferences({
  preferences,
  registrationStatus,
  registrationError,
  onToggle,
  onChange,
}: {
  preferences: Preferences;
  registrationStatus: PushRegistrationState;
  registrationError: string | null;
  onToggle: (enabled: boolean, preferences: Preferences) => void;
  onChange: (preferences: Preferences) => void;
}) {
  const { theme } = useTheme();
  const working = ["registering", "removing"].includes(registrationStatus);
  const statusText = notificationStatus(registrationStatus, registrationError);
  return (
    <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.heading}>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: theme.text }]}>Notification preferences</Text>
          <Text style={[styles.description, { color: theme.textMuted }]}>Push is an additional channel, not a replacement for Wireless Emergency Alerts, NOAA Weather Radio, or local instructions.</Text>
        </View>
        <Switch
          accessibilityLabel="Enable push notifications for this place"
          value={preferences.pushEnabledWhenAvailable}
          disabled={working}
          onValueChange={(enabled) => onToggle(enabled, {
            ...preferences,
            pushEnabledWhenAvailable: enabled,
          })}
          trackColor={{ false: theme.surfaceMuted, true: theme.cyan }}
          thumbColor="#FFFFFF"
        />
      </View>
      <Text
        accessibilityRole={registrationStatus === "error" ? "alert" : undefined}
        style={[styles.status, { color: statusColor(registrationStatus, theme) }]}
      >
        {statusText}
      </Text>
      <Text style={[styles.label, { color: theme.text }]}>Minimum severity</Text>
      <View style={styles.choices}>
        {LEVELS.map((level) => {
          const active = level === preferences.minimumSeverity;
          return (
            <Pressable
              key={level}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => onChange({ ...preferences, minimumSeverity: level })}
              style={[styles.choice, {
                backgroundColor: active ? theme.cyan : theme.background,
                borderColor: active ? theme.cyan : theme.border,
              }]}
            >
              <Text style={[styles.choiceText, { color: active ? "#003638" : theme.text }]}>{level}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.heading}>
        <View style={styles.flex}>
          <Text style={[styles.label, { color: theme.text }]}>Updates and cancellations</Text>
          <Text style={[styles.help, { color: theme.textMuted }]}>Include official changes after the original alert.</Text>
        </View>
        <Switch
          accessibilityLabel="Include alert updates and cancellations"
          value={preferences.includeUpdates}
          onValueChange={(includeUpdates) => onChange({ ...preferences, includeUpdates })}
          trackColor={{ false: theme.surfaceMuted, true: theme.cyan }}
          thumbColor="#FFFFFF"
        />
      </View>
    </View>
  );
}

function notificationStatus(status: PushRegistrationState, error: string | null) {
  return {
    idle: "Notifications are off for this place.",
    registering: "Requesting permission and registering this device...",
    registered: "This device is registered for monitored push delivery.",
    "delivery-paused": "This device is registered, but server delivery is paused until production push is enabled.",
    removing: "Removing this device subscription...",
    error: error ?? "Notification setup needs attention.",
  }[status];
}

function statusColor(status: PushRegistrationState, theme: ReturnType<typeof useTheme>["theme"]) {
  if (status === "error") return theme.redBright;
  if (status === "delivery-paused") return theme.warning;
  return theme.textMuted;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  panel: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 13 },
  heading: { flexDirection: "row", alignItems: "center", gap: 16 },
  title: { fontSize: 19, fontWeight: "800" },
  description: { fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 12 },
  status: { fontSize: 12, lineHeight: 18, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "800" },
  help: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { minHeight: 39, borderWidth: 1, borderRadius: 20, paddingHorizontal: 13, alignItems: "center", justifyContent: "center" },
  choiceText: { fontSize: 12, fontWeight: "800" },
});

