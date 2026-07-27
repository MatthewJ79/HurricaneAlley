import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen, ScreenHeader } from "../components/Chrome";
import { Eyebrow, PrimaryButton, Section } from "../components/Primitives";
import { kitSections } from "../data/demo";
import { useTheme } from "../theme/ThemeProvider";

export function KitScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const allItems = useMemo(() => kitSections.flatMap((section) => section.items), []);
  const [complete, setComplete] = useState<string[]>(["Backup water filter"]);
  const toggle = (item: string) => setComplete((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  return (
    <Screen footerSpace={false}>
      <ScreenHeader title="72-Hour Kit" onBack={onBack} />
      <View style={[styles.landfall, { backgroundColor: theme.emergency }]}>
        <Ionicons name="warning-outline" size={20} color="#FFFFFF" />
        <Text style={styles.landfallText}>Hurricane Helene — Cat 4 landfall in ~18 hrs</Text>
      </View>
      <View style={[styles.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.ring, { borderColor: theme.surfaceMuted, borderTopColor: theme.cyan }]}>
          <Text style={[styles.percent, { color: theme.cyan }]}>{Math.round((complete.length / allItems.length) * 100)}%</Text>
        </View>
        <View>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>{complete.length} of {allItems.length} items ready</Text>
          <Text style={[styles.summaryCopy, { color: theme.textMuted }]}>Finish before landfall window</Text>
        </View>
      </View>
      <Section style={styles.checklist}>
        {kitSections.map((section) => (
          <View key={section.title} style={styles.checkSection}>
            <Eyebrow>{section.title}</Eyebrow>
            <View style={[styles.checkGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {section.items.map((item, index) => {
                const checked = complete.includes(item);
                return (
                  <Pressable
                    key={item}
                    onPress={() => toggle(item)}
                    style={[styles.checkRow, index > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}
                  >
                    <View style={[styles.checkCircle, { borderColor: checked ? theme.cyan : theme.border, backgroundColor: checked ? theme.cyan : "transparent" }]}>
                      {checked ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
                    </View>
                    <Text style={[styles.checkText, { color: checked ? theme.textMuted : theme.text }, checked && styles.checkedText]}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <PrimaryButton onPress={() => setComplete(allItems)}>I’m ready — mark all complete</PrimaryButton>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  landfall: { minHeight: 42, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", gap: 10 },
  landfallText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  summary: { width: "auto", margin: 24, padding: 18, borderWidth: 1, borderRadius: 22, flexDirection: "row", alignItems: "center", gap: 20 },
  ring: { width: 68, height: 68, borderWidth: 7, borderRadius: 34, alignItems: "center", justifyContent: "center", transform: [{ rotate: "22deg" }] },
  percent: { fontSize: 12, fontWeight: "800", transform: [{ rotate: "-22deg" }] },
  summaryTitle: { fontSize: 17, fontWeight: "800" },
  summaryCopy: { marginTop: 4, fontSize: 12 },
  checklist: { gap: 22 },
  checkSection: { gap: 8 },
  checkGroup: { borderWidth: 1, borderRadius: 15, overflow: "hidden" },
  checkRow: { minHeight: 52, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  checkCircle: { width: 24, height: 24, borderWidth: 2, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  checkText: { flex: 1, fontSize: 13 },
  checkedText: { textDecorationLine: "line-through" },
});
