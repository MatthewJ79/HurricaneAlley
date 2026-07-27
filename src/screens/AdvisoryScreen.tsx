import { StyleSheet, Text, View } from "react-native";
import { Screen, ScreenHeader } from "../components/Chrome";
import { Eyebrow, Section } from "../components/Primitives";
import { StormMap } from "../components/StormMap";
import { useTheme } from "../theme/ThemeProvider";

export function AdvisoryScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  return (
    <Screen footerSpace={false}>
      <ScreenHeader title="Advisory #31" subtitle="5:00 AM EDT · released 12m ago" onBack={onBack} />
      <View style={[styles.major, { backgroundColor: theme.demo }]}>
        <Text style={styles.majorText}>MAJOR CHANGES THIS ADVISORY</Text>
      </View>
      <Section style={styles.content}>
        <Eyebrow>Section 1: Track shift</Eyebrow>
        <View style={styles.comparison}>
          <View style={styles.comparePane}>
            <View style={styles.compareMap}><StormMap height={100} /></View>
            <Eyebrow>Previous</Eyebrow>
          </View>
          <View style={styles.comparePane}>
            <View style={styles.compareMap}><StormMap height={100} /></View>
            <Eyebrow color={theme.cyan}>Current (+35 mi east)</Eyebrow>
          </View>
        </View>
        <Eyebrow>Section 2: Intensity</Eyebrow>
        <View style={[styles.intensity, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.oldWind, { color: theme.textMuted }]}>130</Text>
          <Text style={[styles.arrow, { color: theme.redBright }]}>↟</Text>
          <Text style={[styles.newWind, { color: theme.redBright }]}>145 MPH</Text>
          <View style={[styles.gain, { borderColor: `${theme.cyan}77` }]}>
            <Text style={[styles.gainText, { color: theme.cyan }]}>+15 MPH</Text>
          </View>
        </View>
        <View style={styles.sectionGap}><Eyebrow>Section 3: Watches & warnings</Eyebrow></View>
        <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.detailTitle, { color: theme.text }]}>New Warning Extension</Text>
          <Text style={[styles.detailText, { color: theme.textMuted }]}>• Levy County added{"\n"}• Dixie County added{"\n"}• Taylor County added</Text>
        </View>
        <View style={styles.sectionGap}><Eyebrow>Section 4: Model spread</Eyebrow></View>
        <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.detailTitle, { color: theme.text }]}>Narrowed 34 miles</Text>
          <Text style={[styles.detailText, { color: theme.cyan }]}>Spread: 88 mi (down 34 mi from 122 mi)</Text>
        </View>
        <Text style={[styles.next, { color: theme.textFaint }]}>NEXT ADVISORY · 8:00 AM EDT</Text>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  major: { minHeight: 42, alignItems: "center", justifyContent: "center" },
  majorText: { color: "#111111", fontSize: 10, fontWeight: "800" },
  content: { paddingTop: 28 },
  comparison: { marginTop: 12, marginBottom: 28, flexDirection: "row", gap: 12 },
  comparePane: { flex: 1, gap: 7 },
  compareMap: { borderRadius: 8, overflow: "hidden" },
  intensity: { marginTop: 12, minHeight: 62, paddingHorizontal: 16, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 11 },
  oldWind: { fontSize: 20, fontWeight: "600", textDecorationLine: "line-through" },
  arrow: { fontSize: 24, fontWeight: "800" },
  newWind: { fontSize: 20, fontWeight: "800" },
  gain: { marginLeft: "auto", padding: 7, borderWidth: 1, borderRadius: 5 },
  gainText: { fontSize: 11, fontWeight: "800" },
  sectionGap: { marginTop: 30, marginBottom: 10 },
  detailCard: { padding: 16, borderWidth: 1, borderRadius: 14 },
  detailTitle: { fontSize: 17, fontWeight: "800" },
  detailText: { marginTop: 10, fontSize: 11, lineHeight: 20 },
  next: { marginVertical: 32, textAlign: "center", fontSize: 9, fontWeight: "700" },
});
