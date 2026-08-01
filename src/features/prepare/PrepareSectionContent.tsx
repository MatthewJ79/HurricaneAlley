import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";
import type { PrepareChecklistGroup, PrepareSectionId } from "../../data/preparedness";
import { useTheme } from "../../theme/ThemeProvider";
import { ChecklistGroup, ChecklistRow } from "./Checklist";
import type { PrepareFields, StoredPreparePlan } from "./plan";
import { PlanFields } from "./PlanFields";
import { sections } from "./PrepareNavigation";
import { styles } from "./styles";

export function PrepareSectionContent({ section, plan, activeGroups, sectionItemIds,
  groupWidth, desktop, newItem, saveMessage, onMarkComplete, onToggle, onRemove,
  onNewItem, onAddItem, onFieldChange, onSaveMessage }: {
  section: PrepareSectionId; plan: StoredPreparePlan; activeGroups: PrepareChecklistGroup[];
  sectionItemIds: string[]; groupWidth: number; desktop: boolean; newItem: string; saveMessage: string;
  onMarkComplete: () => void; onToggle: (id: string) => void; onRemove: (id: string) => void;
  onNewItem: (value: string) => void; onAddItem: () => void;
  onFieldChange: (field: keyof PrepareFields, value: string) => void; onSaveMessage: (value: string) => void;
}) {
  const { theme } = useTheme();
  const metadata = sections.find((item) => item.id === section);
  return (
    <View style={styles.sectionContent}>
      <View style={[styles.sectionHeading, !desktop && styles.sectionHeadingMobile]}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{metadata?.label}</Text>
          <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>{metadata?.description}</Text>
        </View>
        {sectionItemIds.length ? <Pressable accessibilityRole="button" onPress={onMarkComplete}
          style={[styles.completeButton, { borderColor: theme.cyan }]}>
          <Ionicons name="checkmark-done-outline" size={17} color={theme.cyan} />
          <Text style={[styles.completeButtonText, { color: theme.cyan }]}>{desktop ? "Mark section complete" : "Complete all"}</Text>
        </Pressable> : null}
      </View>

      {section === "evacuation" ? <PlanFields fields={plan.fields} entries={[
        ["destinationPrimary", "Primary destination", "Address, hotel, shelter, or household"],
        ["destinationBackup", "Backup destination", "Choose a different direction when possible"],
        ["departureTrigger", "Departure trigger", "For example: local order issued or route conditions worsen"],
      ]} saveMessage={saveMessage} onChange={onFieldChange} onSave={() => onSaveMessage("Evacuation details saved on this device.")} /> : null}
      {section === "communication" ? <PlanFields fields={plan.fields} entries={[
        ["contactName", "Out-of-area contact", "Name"], ["contactPhone", "Contact phone", "Phone number"],
        ["meetingPoint", "Household meeting point", "Location outside the immediate hazard area"],
      ]} saveMessage={saveMessage} onChange={onFieldChange} onSave={() => onSaveMessage("Communication plan saved on this device.")} /> : null}
      {section === "documents" ? <PlanFields fields={plan.fields} entries={[
        ["documentLocation", "Grab-folder location", "Where everyone can find it quickly"],
        ["insuranceContact", "Primary insurance contact", "Company, policy contact, or claim number"],
      ]} saveMessage={saveMessage} onChange={onFieldChange} onSave={() => onSaveMessage("Document details saved on this device.")} /> : null}

      {section === "personal" ? <PersonalComposer value={newItem} onChange={onNewItem} onAdd={onAddItem} /> : null}
      {section === "personal" ? (
        <View style={styles.customList}>
          {plan.customItems.length ? plan.customItems.map((item) => <ChecklistRow key={item.id} {...item}
            checked={plan.completed.includes(item.id)} onToggle={onToggle} onRemove={onRemove} />) : (
            <View style={[styles.emptyList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="list-outline" size={28} color={theme.cyan} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Your personal list is empty</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Add your first household-specific preparedness item above.</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.groupGrid}>{activeGroups.map((group) => <ChecklistGroup key={group.title}
          group={group} width={groupWidth} completed={plan.completed} onToggle={onToggle} />)}</View>
      )}
      <View style={[styles.safetyNote, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="information-circle-outline" size={22} color={theme.cyan} />
        <Text style={[styles.safetyNoteText, { color: theme.textMuted }]}>Preparedness guidance is general. Follow current instructions from your local emergency-management agency, NWS office, and public-safety officials.</Text>
      </View>
    </View>
  );
}

function PersonalComposer({ value, onChange, onAdd }: { value: string; onChange: (value: string) => void; onAdd: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.customComposer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.composerTitle, { color: theme.text }]}>Add a household-specific item</Text>
      <Text style={[styles.composerText, { color: theme.textMuted }]}>Add medical devices, accessibility needs, family responsibilities, property tasks, or anything else unique to your plan.</Text>
      <View style={styles.composerRow}>
        <TextInput accessibilityLabel="New personal preparedness item" value={value} onChangeText={onChange}
          onSubmitEditing={onAdd} placeholder="Example: Charge wheelchair backup battery" placeholderTextColor={theme.textFaint}
          style={[styles.composerInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} />
        <Pressable accessibilityRole="button" onPress={onAdd} style={[styles.addButton, { backgroundColor: theme.cyan }]}>
          <Ionicons name="add" size={20} color="#003638" /><Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}
