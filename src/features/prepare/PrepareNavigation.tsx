import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { PrepareSectionId } from "../../data/preparedness";
import { useTheme } from "../../theme/ThemeProvider";
import { groupsForSection, type StoredPreparePlan } from "./plan";
import { styles } from "./styles";

export const sections: Array<{
  id: PrepareSectionId; label: string; description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}> = [
  { id: "supplies", label: "Supplies", description: "72-hour kit and household essentials", icon: "bag-handle-outline" },
  { id: "evacuation", label: "Evacuation", description: "Destinations, routes, transport, and departure", icon: "navigate-outline" },
  { id: "communication", label: "Communication", description: "Contacts, meeting points, and check-ins", icon: "call-outline" },
  { id: "documents", label: "Documents", description: "Identification, insurance, and recovery records", icon: "document-text-outline" },
  { id: "personal", label: "My list", description: "Add anything unique to your household", icon: "add-circle-outline" },
];

export function PrepareProgress({ percent, completed, total, sectionCompleted, sectionTotal, desktop }: {
  percent: number; completed: number; total: number; sectionCompleted: number; sectionTotal: number; desktop: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.progressCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.progressRing, {
        borderColor: theme.surfaceMuted, borderTopColor: theme.cyan,
        borderRightColor: percent >= 50 ? theme.cyan : theme.surfaceMuted,
        borderBottomColor: percent >= 75 ? theme.cyan : theme.surfaceMuted,
      }]}><Text style={[styles.percent, { color: theme.cyan }]}>{percent}%</Text></View>
      <View style={styles.progressCopy}>
        <Text style={[styles.ready, { color: theme.text }]}>{completed} of {total} readiness items complete</Text>
        <Text style={[styles.finish, { color: theme.textMuted }]}>Your plan is saved locally in this browser as you make changes.</Text>
      </View>
      {desktop ? <View style={styles.progressActions}>
        <Text style={[styles.sectionProgress, { color: theme.text }]}>{sectionCompleted}/{sectionTotal}</Text>
        <Text style={[styles.sectionProgressLabel, { color: theme.textFaint }]}>THIS SECTION</Text>
      </View> : null}
    </View>
  );
}

export function PrepareNavigation({ section, plan, desktop, onChange }: {
  section: PrepareSectionId; plan: StoredPreparePlan; desktop: boolean;
  onChange: (section: PrepareSectionId) => void;
}) {
  const { theme } = useTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.sectionNav, desktop && styles.sectionNavDesktop,
      { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {sections.map((item) => {
        const active = item.id === section;
        const ids = item.id === "personal" ? plan.customItems.map((entry) => entry.id)
          : groupsForSection(item.id).flatMap((group) => group.items.map((entry) => entry.id));
        const done = ids.filter((id) => plan.completed.includes(id)).length;
        return (
          <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: active }}
            onPress={() => onChange(item.id)} style={[styles.sectionTab, desktop && styles.sectionTabDesktop,
              active && { backgroundColor: theme.cyan }]}>
            <Ionicons name={item.icon} size={20} color={active ? "#003638" : theme.cyan} />
            <View style={styles.sectionTabCopy}>
              <Text style={[styles.sectionTabTitle, { color: active ? "#003638" : theme.text }]}>{item.label}</Text>
              {desktop ? <Text numberOfLines={2} style={[styles.sectionTabDescription,
                { color: active ? "rgba(0,54,56,.78)" : theme.textMuted }]}>{item.description}</Text> : null}
            </View>
            <Text style={[styles.sectionTabCount, { color: active ? "#003638" : theme.textFaint }]}>{done}/{ids.length}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
