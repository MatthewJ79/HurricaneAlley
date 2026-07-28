import { ScrollView, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { LiveStorm } from "../types";

export function StormSelector({
  storms,
  selectedStormId,
  onSelect,
  compact = false,
}: {
  storms: LiveStorm[];
  selectedStormId: string | null;
  onSelect: (stormId: string) => void;
  compact?: boolean;
}) {
  const { theme } = useTheme();
  if (storms.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        compact && styles.compactContent,
      ]}
      style={[styles.scroll, compact && styles.compactScroll]}
    >
      {storms.map((storm) => {
        const selected = storm.id === selectedStormId;
        return (
          <Pressable
            key={storm.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`Show ${storm.classification} ${storm.name}`}
            onPress={() => onSelect(storm.id)}
            style={[
              styles.option,
              compact && styles.compactOption,
              {
                borderColor: selected ? theme.cyan : theme.border,
                backgroundColor: selected ? `${theme.cyan}1A` : theme.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.name,
                { color: selected ? theme.cyan : theme.text },
              ]}
            >
              {storm.name}
            </Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {storm.classification.toUpperCase()} ·{" "}
              {storm.wind.mph === null ? "—" : `${storm.wind.mph} MPH`}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { height: 69, maxHeight: 69, marginBottom: 14, flexGrow: 0 },
  content: { height: 55, paddingHorizontal: 20, gap: 9 },
  compactScroll: { width: 292, height: 46, maxHeight: 46, marginBottom: 0 },
  compactContent: { height: 42, paddingHorizontal: 0, gap: 7 },
  option: {
    minWidth: 132,
    minHeight: 55,
    justifyContent: "center",
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: 13,
  },
  compactOption: { minWidth: 132, minHeight: 42, borderRadius: 10 },
  name: { fontSize: 12, fontWeight: "800" },
  meta: { marginTop: 4, fontSize: 8, fontWeight: "700" },
});
