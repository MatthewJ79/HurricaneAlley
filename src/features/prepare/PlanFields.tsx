import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { PrepareFields } from "./plan";
import { styles } from "./styles";

export function PlanFields({ fields, entries, saveMessage, onChange, onSave }: {
  fields: PrepareFields;
  entries: Array<[keyof PrepareFields, string, string]>;
  saveMessage: string;
  onChange: (field: keyof PrepareFields, value: string) => void;
  onSave: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.planFields, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.fieldsGrid}>
        {entries.map(([field, label, placeholder]) => <View key={field} style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>
          <TextInput value={fields[field]} onChangeText={(value) => onChange(field, value)}
            placeholder={placeholder} placeholderTextColor={theme.textFaint}
            style={[styles.fieldInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} />
        </View>)}
      </View>
      <View style={styles.saveRow}>
        <Text style={[styles.saveMessage, { color: theme.cyan }]}>{saveMessage || "Changes are saved locally as you type."}</Text>
        <Pressable accessibilityRole="button" onPress={onSave} style={[styles.saveButton, { backgroundColor: theme.cyan }]}>
          <Ionicons name="save-outline" size={17} color="#003638" /><Text style={styles.saveButtonText}>Save details</Text>
        </Pressable>
      </View>
    </View>
  );
}
