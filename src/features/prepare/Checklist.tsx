import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PrepareChecklistGroup } from "../../data/preparedness";
import { useTheme } from "../../theme/ThemeProvider";
import { styles } from "./styles";

export function ChecklistGroup({ group, width, completed, onToggle }: {
  group: PrepareChecklistGroup; width: number; completed: string[]; onToggle: (id: string) => void;
}) {
  const { theme } = useTheme();
  const done = group.items.filter((item) => completed.includes(item.id)).length;
  return (
    <View style={[styles.checkGroup, { width, backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.checkGroupHeading, { borderBottomColor: theme.border }]}>
        <Text style={[styles.checkGroupTitle, { color: theme.text }]}>{group.title}</Text>
        <Text style={[styles.checkGroupCount, { color: theme.cyan }]}>{done}/{group.items.length}</Text>
      </View>
      {group.items.map((item, index) => <ChecklistRow key={item.id} {...item}
        checked={completed.includes(item.id)} onToggle={onToggle} bordered={index > 0} />)}
    </View>
  );
}

export function ChecklistRow({ id, label, detail, checked, bordered = false, onToggle, onRemove }: {
  id: string; label: string; detail?: string; checked: boolean; bordered?: boolean;
  onToggle: (id: string) => void; onRemove?: (id: string) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.checkRow,
      bordered && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth },
      { backgroundColor: theme.surface },
      onRemove && { borderColor: theme.border, borderWidth: 1, borderRadius: 10 },
    ]}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onToggle(id)}
        style={[styles.checkCircle, { borderColor: checked ? theme.cyan : theme.border, backgroundColor: checked ? theme.cyan : "transparent" }]}>
        {checked ? <Ionicons name="checkmark" size={16} color="#003638" /> : null}
      </Pressable>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onToggle(id)} style={styles.checkCopy}>
        <Text style={[styles.checkText, { color: checked ? theme.textMuted : theme.text }, checked && styles.checkedText]}>{label}</Text>
        {detail ? <Text style={[styles.checkDetail, { color: theme.textMuted }]}>{detail}</Text> : null}
      </Pressable>
      {onRemove ? <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${label}`} onPress={() => onRemove(id)} hitSlop={8}>
        <Ionicons name="trash-outline" size={19} color={theme.redBright} />
      </Pressable> : null}
    </View>
  );
}
