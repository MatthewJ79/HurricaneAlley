import { Ionicons } from "@expo/vector-icons";
import type { PropsWithChildren } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export function Section({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.section, style]}>{children}</View>;
}

export function Eyebrow({ children, color }: PropsWithChildren<{ color?: string }>) {
  const { theme } = useTheme();
  return <Text style={[styles.eyebrow, { color: color ?? theme.textFaint }]}>{children}</Text>;
}

export function SectionTitle({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <View>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Text style={[styles.h2, { color: theme.text }]}>{title}</Text>
      </View>
      {action ? <Text style={[styles.actionLabel, { color: theme.cyan }]}>{action}</Text> : null}
    </View>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.surfaceMuted }]}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.segment, active && { backgroundColor: theme.cyan }]}
          >
            <Text style={[styles.segmentText, { color: active ? "#003638" : theme.textMuted }]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function InfoAction({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.infoAction, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: theme.surfaceMuted }]}>
        <Ionicons name={icon} size={21} color={theme.cyan} />
      </View>
      <View style={styles.infoCopy}>
        <Eyebrow>{label}</Eyebrow>
        <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={21} color={theme.textFaint} />
    </Pressable>
  );
}

export function PrimaryButton({
  children,
  emergency = false,
  onPress,
}: PropsWithChildren<{ emergency?: boolean; onPress?: () => void }>) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.primaryButton, { backgroundColor: emergency ? theme.emergency : theme.cyan }]}
    >
      <Text style={[styles.primaryButtonText, { color: emergency ? theme.white : "#003638" }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { width: "auto", paddingHorizontal: 20, paddingBottom: 24 },
  eyebrow: { fontSize: 9, lineHeight: 13, fontWeight: "700", letterSpacing: 0.2, textTransform: "uppercase" },
  sectionTitle: { marginTop: 18, marginBottom: 14, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  h2: { marginTop: 3, fontSize: 19, lineHeight: 25, fontWeight: "800", letterSpacing: -0.35 },
  actionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  segmented: { width: "auto", marginHorizontal: 20, marginBottom: 14, borderRadius: 24, padding: 4, flexDirection: "row" },
  segment: { flex: 1, minHeight: 34, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  segmentText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  infoAction: { minHeight: 82, borderWidth: 1, borderRadius: 15, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  infoCopy: { flex: 1 },
  infoValue: { marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  primaryButton: { minHeight: 50, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  primaryButtonText: { fontSize: 15, fontWeight: "800", textTransform: "uppercase" },
});
