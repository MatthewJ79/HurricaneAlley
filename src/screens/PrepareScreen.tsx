import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Screen, ScreenHeader } from "../components/Chrome";
import {
  allBuiltInItems,
  communicationGroups,
  documentGroups,
  evacuationGroups,
  suppliesGroups,
  type PrepareChecklistGroup,
  type PrepareSectionId,
} from "../data/preparedness";
import { useTheme } from "../theme/ThemeProvider";

type CustomItem = { id: string; label: string };
type PrepareFields = {
  destinationPrimary: string;
  destinationBackup: string;
  departureTrigger: string;
  contactName: string;
  contactPhone: string;
  meetingPoint: string;
  documentLocation: string;
  insuranceContact: string;
};
type StoredPreparePlan = {
  completed: string[];
  customItems: CustomItem[];
  fields: PrepareFields;
};

const STORAGE_KEY = "hurricane-alley-prepare-v1";
const defaultFields: PrepareFields = {
  destinationPrimary: "",
  destinationBackup: "",
  departureTrigger: "",
  contactName: "",
  contactPhone: "",
  meetingPoint: "",
  documentLocation: "",
  insuranceContact: "",
};

const sections: Array<{
  id: PrepareSectionId;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}> = [
  {
    id: "supplies",
    label: "Supplies",
    description: "72-hour kit and household essentials",
    icon: "bag-handle-outline",
  },
  {
    id: "evacuation",
    label: "Evacuation",
    description: "Destinations, routes, transport, and departure",
    icon: "navigate-outline",
  },
  {
    id: "communication",
    label: "Communication",
    description: "Contacts, meeting points, and check-ins",
    icon: "call-outline",
  },
  {
    id: "documents",
    label: "Documents",
    description: "Identification, insurance, and recovery records",
    icon: "document-text-outline",
  },
  {
    id: "personal",
    label: "My list",
    description: "Add anything unique to your household",
    icon: "add-circle-outline",
  },
];

export function PrepareScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const contentWidth = desktop ? Math.min(width * 0.8, 1200) : width - 40;
  const workspaceWidth = desktop ? contentWidth - 230 : contentWidth;
  const groupWidth = desktop ? (workspaceWidth - 10) / 2 : workspaceWidth;
  const [section, setSection] = useState<PrepareSectionId>(
    sectionFromLocation,
  );
  const [plan, setPlan] = useState<StoredPreparePlan>(loadPlan);
  const [newItem, setNewItem] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => setSection(sectionFromLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const allItemIds = useMemo(
    () => [
      ...allBuiltInItems.map((item) => item.id),
      ...plan.customItems.map((item) => item.id),
    ],
    [plan.customItems],
  );
  const completedCount = allItemIds.filter((id) =>
    plan.completed.includes(id),
  ).length;
  const percent =
    allItemIds.length === 0
      ? 0
      : Math.round((completedCount / allItemIds.length) * 100);
  const activeGroups = groupsForSection(section);
  const sectionItemIds =
    section === "personal"
      ? plan.customItems.map((item) => item.id)
      : activeGroups.flatMap((group) => group.items.map((item) => item.id));
  const sectionCompleted = sectionItemIds.filter((id) =>
    plan.completed.includes(id),
  ).length;

  const chooseSection = (next: PrepareSectionId) => {
    setSection(next);
    setSaveMessage("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("screen", "prepare");
      url.searchParams.set("prepareSection", next);
      window.history.pushState({ screen: "prepare", prepareSection: next }, "", url);
    }
  };

  const toggleItem = (id: string) => {
    setPlan((current) => ({
      ...current,
      completed: current.completed.includes(id)
        ? current.completed.filter((candidate) => candidate !== id)
        : [...current.completed, id],
    }));
  };

  const markSectionComplete = () => {
    setPlan((current) => ({
      ...current,
      completed: Array.from(
        new Set([...current.completed, ...sectionItemIds]),
      ),
    }));
  };

  const addCustomItem = () => {
    const label = newItem.trim();
    if (!label) return;
    const id = `custom-${Date.now()}`;
    setPlan((current) => ({
      ...current,
      customItems: [...current.customItems, { id, label }],
    }));
    setNewItem("");
  };

  const removeCustomItem = (id: string) => {
    setPlan((current) => ({
      ...current,
      customItems: current.customItems.filter((item) => item.id !== id),
      completed: current.completed.filter((candidate) => candidate !== id),
    }));
  };

  const updateField = (field: keyof PrepareFields, value: string) => {
    setPlan((current) => ({
      ...current,
      fields: { ...current.fields, [field]: value },
    }));
    setSaveMessage("");
  };

  return (
    <Screen stickyHeader>
      <ScreenHeader
        title="Prepare"
        subtitle="Your household hurricane readiness plan"
        onBack={onBack}
        compact={desktop}
        contentWidth={desktop ? contentWidth : undefined}
      />

      <View style={[styles.content, { width: contentWidth }]}>
        <View
          style={[
            styles.progressCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View
            style={[
              styles.progressRing,
              {
                borderColor: theme.surfaceMuted,
                borderTopColor: theme.cyan,
                borderRightColor: percent >= 50 ? theme.cyan : theme.surfaceMuted,
                borderBottomColor:
                  percent >= 75 ? theme.cyan : theme.surfaceMuted,
              },
            ]}
          >
            <Text style={[styles.percent, { color: theme.cyan }]}>
              {percent}%
            </Text>
          </View>
          <View style={styles.progressCopy}>
            <Text style={[styles.ready, { color: theme.text }]}>
              {completedCount} of {allItemIds.length} readiness items complete
            </Text>
            <Text style={[styles.finish, { color: theme.textMuted }]}>
              Your plan is saved locally in this browser as you make changes.
            </Text>
          </View>
          {desktop ? (
            <View style={styles.progressActions}>
              <Text style={[styles.sectionProgress, { color: theme.text }]}>
                {sectionCompleted}/{sectionItemIds.length}
              </Text>
              <Text
                style={[
                  styles.sectionProgressLabel,
                  { color: theme.textFaint },
                ]}
              >
                THIS SECTION
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.workspace, desktop && styles.workspaceDesktop]}>
          <View
            accessibilityRole="tablist"
            style={[
              styles.sectionNav,
              desktop && styles.sectionNavDesktop,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            {sections.map((item) => {
              const active = item.id === section;
              const itemIds =
                item.id === "personal"
                  ? plan.customItems.map((custom) => custom.id)
                  : groupsForSection(item.id).flatMap((group) =>
                      group.items.map((entry) => entry.id),
                    );
              const done = itemIds.filter((id) =>
                plan.completed.includes(id),
              ).length;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => chooseSection(item.id)}
                  style={[
                    styles.sectionTab,
                    desktop && styles.sectionTabDesktop,
                    active && { backgroundColor: theme.cyan },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={active ? "#003638" : theme.cyan}
                  />
                  <View style={styles.sectionTabCopy}>
                    <Text
                      style={[
                        styles.sectionTabTitle,
                        { color: active ? "#003638" : theme.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {desktop ? (
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.sectionTabDescription,
                          {
                            color: active
                              ? "rgba(0,54,56,.78)"
                              : theme.textMuted,
                          },
                        ]}
                      >
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.sectionTabCount,
                      { color: active ? "#003638" : theme.textFaint },
                    ]}
                  >
                    {done}/{itemIds.length}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sectionContent}>
            <View
              style={[
                styles.sectionHeading,
                !desktop && styles.sectionHeadingMobile,
              ]}
            >
              <View style={styles.sectionHeadingCopy}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {sections.find((item) => item.id === section)?.label}
                </Text>
                <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
                  {sections.find((item) => item.id === section)?.description}
                </Text>
              </View>
              {sectionItemIds.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={markSectionComplete}
                  style={[styles.completeButton, { borderColor: theme.cyan }]}
                >
                  <Ionicons name="checkmark-done-outline" size={17} color={theme.cyan} />
                  <Text style={[styles.completeButtonText, { color: theme.cyan }]}>
                    {desktop ? "Mark section complete" : "Complete all"}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {section === "evacuation" ? (
              <PlanFields
                fields={plan.fields}
                entries={[
                  ["destinationPrimary", "Primary destination", "Address, hotel, shelter, or household"],
                  ["destinationBackup", "Backup destination", "Choose a different direction when possible"],
                  ["departureTrigger", "Departure trigger", "For example: local order issued or route conditions worsen"],
                ]}
                saveMessage={saveMessage}
                onChange={updateField}
                onSave={() => setSaveMessage("Evacuation details saved on this device.")}
              />
            ) : null}

            {section === "communication" ? (
              <PlanFields
                fields={plan.fields}
                entries={[
                  ["contactName", "Out-of-area contact", "Name"],
                  ["contactPhone", "Contact phone", "Phone number"],
                  ["meetingPoint", "Household meeting point", "Location outside the immediate hazard area"],
                ]}
                saveMessage={saveMessage}
                onChange={updateField}
                onSave={() => setSaveMessage("Communication plan saved on this device.")}
              />
            ) : null}

            {section === "documents" ? (
              <PlanFields
                fields={plan.fields}
                entries={[
                  ["documentLocation", "Grab-folder location", "Where everyone can find it quickly"],
                  ["insuranceContact", "Primary insurance contact", "Company, policy contact, or claim number"],
                ]}
                saveMessage={saveMessage}
                onChange={updateField}
                onSave={() => setSaveMessage("Document details saved on this device.")}
              />
            ) : null}

            {section === "personal" ? (
              <View
                style={[
                  styles.customComposer,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.composerTitle, { color: theme.text }]}>
                  Add a household-specific item
                </Text>
                <Text style={[styles.composerText, { color: theme.textMuted }]}>
                  Add medical devices, accessibility needs, family responsibilities,
                  property tasks, or anything else unique to your plan.
                </Text>
                <View style={styles.composerRow}>
                  <TextInput
                    accessibilityLabel="New personal preparedness item"
                    value={newItem}
                    onChangeText={setNewItem}
                    onSubmitEditing={addCustomItem}
                    placeholder="Example: Charge wheelchair backup battery"
                    placeholderTextColor={theme.textFaint}
                    style={[
                      styles.composerInput,
                      {
                        color: theme.text,
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={addCustomItem}
                    style={[styles.addButton, { backgroundColor: theme.cyan }]}
                  >
                    <Ionicons name="add" size={20} color="#003638" />
                    <Text style={styles.addButtonText}>Add</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {section === "personal" ? (
              <View style={styles.customList}>
                {plan.customItems.length ? (
                  plan.customItems.map((item) => (
                    <ChecklistRow
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      checked={plan.completed.includes(item.id)}
                      onToggle={toggleItem}
                      onRemove={removeCustomItem}
                    />
                  ))
                ) : (
                  <View
                    style={[
                      styles.emptyList,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                  >
                    <Ionicons name="list-outline" size={28} color={theme.cyan} />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>
                      Your personal list is empty
                    </Text>
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                      Add your first household-specific preparedness item above.
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.groupGrid}>
                {activeGroups.map((group) => (
                  <ChecklistGroup
                    key={group.title}
                    group={group}
                    width={groupWidth}
                    completed={plan.completed}
                    onToggle={toggleItem}
                  />
                ))}
              </View>
            )}

            <View
              style={[
                styles.safetyNote,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Ionicons name="information-circle-outline" size={22} color={theme.cyan} />
              <Text style={[styles.safetyNoteText, { color: theme.textMuted }]}>
                Preparedness guidance is general. Follow current instructions from
                your local emergency-management agency, NWS office, and public-safety
                officials.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}

function ChecklistGroup({
  group,
  width,
  completed,
  onToggle,
}: {
  group: PrepareChecklistGroup;
  width: number;
  completed: string[];
  onToggle: (id: string) => void;
}) {
  const { theme } = useTheme();
  const done = group.items.filter((item) => completed.includes(item.id)).length;
  return (
    <View
      style={[
        styles.checkGroup,
        { width, backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={[styles.checkGroupHeading, { borderBottomColor: theme.border }]}>
        <Text style={[styles.checkGroupTitle, { color: theme.text }]}>
          {group.title}
        </Text>
        <Text style={[styles.checkGroupCount, { color: theme.cyan }]}>
          {done}/{group.items.length}
        </Text>
      </View>
      {group.items.map((item, index) => (
        <ChecklistRow
          key={item.id}
          id={item.id}
          label={item.label}
          detail={item.detail}
          checked={completed.includes(item.id)}
          onToggle={onToggle}
          bordered={index > 0}
        />
      ))}
    </View>
  );
}

function ChecklistRow({
  id,
  label,
  detail,
  checked,
  bordered = false,
  onToggle,
  onRemove,
}: {
  id: string;
  label: string;
  detail?: string;
  checked: boolean;
  bordered?: boolean;
  onToggle: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.checkRow,
        bordered && {
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        !onRemove && { backgroundColor: theme.surface },
        onRemove && {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 10,
        },
      ]}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => onToggle(id)}
        style={[
          styles.checkCircle,
          {
            borderColor: checked ? theme.cyan : theme.border,
            backgroundColor: checked ? theme.cyan : "transparent",
          },
        ]}
      >
        {checked ? <Ionicons name="checkmark" size={16} color="#003638" /> : null}
      </Pressable>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => onToggle(id)}
        style={styles.checkCopy}
      >
        <Text
          style={[
            styles.checkText,
            { color: checked ? theme.textMuted : theme.text },
            checked && styles.checkedText,
          ]}
        >
          {label}
        </Text>
        {detail ? (
          <Text style={[styles.checkDetail, { color: theme.textMuted }]}>
            {detail}
          </Text>
        ) : null}
      </Pressable>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          onPress={() => onRemove(id)}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={19} color={theme.redBright} />
        </Pressable>
      ) : null}
    </View>
  );
}

function PlanFields({
  fields,
  entries,
  saveMessage,
  onChange,
  onSave,
}: {
  fields: PrepareFields;
  entries: Array<[keyof PrepareFields, string, string]>;
  saveMessage: string;
  onChange: (field: keyof PrepareFields, value: string) => void;
  onSave: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.planFields,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={styles.fieldsGrid}>
        {entries.map(([field, label, placeholder]) => (
          <View key={field} style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>
            <TextInput
              value={fields[field]}
              onChangeText={(value) => onChange(field, value)}
              placeholder={placeholder}
              placeholderTextColor={theme.textFaint}
              style={[
                styles.fieldInput,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.saveRow}>
        <Text style={[styles.saveMessage, { color: theme.cyan }]}>
          {saveMessage || "Changes are saved locally as you type."}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onSave}
          style={[styles.saveButton, { backgroundColor: theme.cyan }]}
        >
          <Ionicons name="save-outline" size={17} color="#003638" />
          <Text style={styles.saveButtonText}>Save details</Text>
        </Pressable>
      </View>
    </View>
  );
}

function groupsForSection(section: PrepareSectionId) {
  if (section === "supplies") return suppliesGroups;
  if (section === "evacuation") return evacuationGroups;
  if (section === "communication") return communicationGroups;
  if (section === "documents") return documentGroups;
  return [];
}

function sectionFromLocation(): PrepareSectionId {
  if (typeof window === "undefined") return "supplies";
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("prepareSection");
  if (
    requested === "supplies" ||
    requested === "evacuation" ||
    requested === "communication" ||
    requested === "documents" ||
    requested === "personal"
  ) {
    return requested;
  }
  return "supplies";
}

function loadPlan(): StoredPreparePlan {
  if (typeof window === "undefined") {
    return { completed: [], customItems: [], fields: defaultFields };
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { completed: [], customItems: [], fields: defaultFields };
    }
    const parsed = JSON.parse(stored) as Partial<StoredPreparePlan>;
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      customItems: Array.isArray(parsed.customItems) ? parsed.customItems : [],
      fields: { ...defaultFields, ...(parsed.fields ?? {}) },
    };
  } catch {
    return { completed: [], customItems: [], fields: defaultFields };
  }
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", paddingBottom: 24 },
  progressCard: {
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  progressRing: {
    width: 64,
    height: 64,
    borderWidth: 6,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  percent: { fontSize: 14, fontWeight: "800" },
  progressCopy: { minWidth: 0, flex: 1 },
  ready: { fontSize: 16, fontWeight: "800" },
  finish: { marginTop: 4, fontSize: 10, lineHeight: 14 },
  progressActions: { alignItems: "flex-end" },
  sectionProgress: {
    fontSize: 18,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  sectionProgressLabel: { marginTop: 2, fontSize: 7, fontWeight: "800" },
  workspace: { gap: 10 },
  workspaceDesktop: { flexDirection: "row", alignItems: "flex-start" },
  sectionNav: {
    padding: 5,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  sectionNavDesktop: { width: 220, flexDirection: "column", flexWrap: "nowrap" },
  sectionTab: {
    minWidth: 150,
    minHeight: 48,
    flex: 1,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTabDesktop: { minWidth: 0, minHeight: 72, flex: 0 },
  sectionTabCopy: { minWidth: 0, flex: 1 },
  sectionTabTitle: { fontSize: 11, fontWeight: "800" },
  sectionTabDescription: { marginTop: 3, fontSize: 8, lineHeight: 11 },
  sectionTabCount: { fontSize: 8, fontWeight: "800" },
  sectionContent: { minWidth: 0, flex: 1 },
  sectionHeading: {
    minHeight: 54,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionHeadingMobile: {
    alignItems: "flex-start",
    flexDirection: "column",
  },
  sectionHeadingCopy: { minWidth: 0, flex: 1 },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  sectionDescription: { marginTop: 3, fontSize: 10 },
  completeButton: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  completeButtonText: { fontSize: 8, fontWeight: "800", textTransform: "uppercase" },
  groupGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  checkGroup: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  checkGroupHeading: {
    minHeight: 43,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkGroupTitle: { fontSize: 12, fontWeight: "800" },
  checkGroupCount: { fontSize: 9, fontWeight: "800" },
  checkRow: {
    minHeight: 54,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCopy: { minWidth: 0, flex: 1 },
  checkText: { fontSize: 11, lineHeight: 15, fontWeight: "700" },
  checkDetail: { marginTop: 3, fontSize: 8, lineHeight: 12 },
  checkedText: { textDecorationLine: "line-through" },
  planFields: {
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  fieldsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  field: { minWidth: 190, flex: 1 },
  fieldLabel: { marginBottom: 5, fontSize: 9, fontWeight: "800" },
  fieldInput: {
    minHeight: 42,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 11,
  },
  saveRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  saveMessage: { minWidth: 0, flex: 1, fontSize: 8, fontWeight: "700" },
  saveButton: {
    minHeight: 38,
    paddingHorizontal: 11,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  saveButtonText: { color: "#003638", fontSize: 9, fontWeight: "800" },
  customComposer: { padding: 14, borderWidth: 1, borderRadius: 12 },
  composerTitle: { fontSize: 14, fontWeight: "800" },
  composerText: { marginTop: 5, fontSize: 9, lineHeight: 14 },
  composerRow: { marginTop: 11, flexDirection: "row", gap: 8 },
  composerInput: {
    minWidth: 0,
    minHeight: 44,
    flex: 1,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 11,
  },
  addButton: {
    minWidth: 82,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addButtonText: { color: "#003638", fontSize: 10, fontWeight: "800" },
  customList: { marginTop: 10, gap: 7 },
  emptyList: {
    padding: 24,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
  },
  emptyTitle: { marginTop: 8, fontSize: 14, fontWeight: "800" },
  emptyText: { marginTop: 5, fontSize: 9, textAlign: "center" },
  safetyNote: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  safetyNoteText: { minWidth: 0, flex: 1, fontSize: 9, lineHeight: 14 },
});
