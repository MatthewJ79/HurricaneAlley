import { StyleSheet, Text, View } from "react-native";
import { Screen, ScreenHeader } from "../components/Chrome";
import { InfoAction, PrimaryButton, Section, SectionTitle } from "../components/Primitives";
import { useTheme } from "../theme/ThemeProvider";
import type { ScreenName } from "../types";

export function PrepareScreen({ navigate }: { navigate: (screen: ScreenName) => void }) {
  const { theme } = useTheme();
  return (
    <Screen>
      <ScreenHeader title="Prepare" subtitle="Your household readiness plan" />
      <View style={[styles.progressCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.progressRing, { borderColor: theme.surfaceMuted, borderTopColor: theme.cyan }]}>
          <Text style={[styles.percent, { color: theme.cyan }]}>20%</Text>
        </View>
        <View style={styles.progressCopy}>
          <Text style={[styles.ready, { color: theme.text }]}>7 of 34 items ready</Text>
          <Text style={[styles.finish, { color: theme.textMuted }]}>Finish before the landfall window</Text>
        </View>
      </View>
      <Section>
        <SectionTitle title="Household readiness" eyebrow="Use official local instructions first" />
        <View style={styles.actions}>
          <InfoAction icon="bag-handle-outline" label="Supplies" value="72-hour emergency kit" onPress={() => navigate("kit")} />
          <InfoAction icon="location-outline" label="Evacuation" value="Save two evacuation destinations" />
          <InfoAction icon="call-outline" label="Communication" value="Choose an out-of-area contact" />
          <InfoAction icon="document-text-outline" label="Documents" value="Create a waterproof grab folder" />
        </View>
        <View style={styles.button}>
          <PrimaryButton onPress={() => navigate("kit")}>Open 72-hour kit</PrimaryButton>
        </View>
        <Text style={[styles.note, { color: theme.textMuted }]}>
          Preparedness guidance is general. Always follow instructions from your local emergency management agency.
        </Text>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressCard: { width: "auto", marginHorizontal: 20, padding: 20, borderWidth: 1, borderRadius: 22, flexDirection: "row", alignItems: "center", gap: 20 },
  progressRing: { width: 70, height: 70, borderWidth: 7, borderRadius: 35, alignItems: "center", justifyContent: "center", transform: [{ rotate: "25deg" }] },
  percent: { fontSize: 12, fontWeight: "800", transform: [{ rotate: "-25deg" }] },
  progressCopy: { flex: 1 },
  ready: { fontSize: 17, fontWeight: "800" },
  finish: { marginTop: 4, fontSize: 12 },
  actions: { gap: 10 },
  button: { marginTop: 18 },
  note: { marginTop: 18, textAlign: "center", fontSize: 10, lineHeight: 15 },
});
