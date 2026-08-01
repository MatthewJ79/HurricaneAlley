import { Pressable, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { LiveStorm } from "../../types";
import { mappableGuidance, modelColor } from "../../utils/modelGuidance";
import { distanceMiles } from "./formatters";
import { SectionHeading } from "./SectionHeading";
import { styles } from "./styles";
import type { GuidancePoint, ModelView } from "./types";

export function ModelsPanel({ storm, models, modelView, selectedAid, guidanceWidth,
  compact = false, onSetModelView, onSelectAid }: {
  storm: LiveStorm;
  models: ReturnType<typeof mappableGuidance>;
  modelView: ModelView;
  selectedAid: string | null;
  guidanceWidth: number;
  compact?: boolean;
  onSetModelView: (view: ModelView) => void;
  onSelectAid: (aid: string) => void;
}) {
  const { theme } = useTheme();
  return (
    <>
      <View style={[styles.modelControls, compact && styles.modelControlsCompact]}>
        <View style={styles.modelViewRow}>
          {(["All tracks", "Agreement", "Individual"] as const).map((option) => {
            const active = option === modelView;
            return (
              <Pressable key={option} onPress={() => onSetModelView(option)} style={[
                styles.smallTag,
                { borderColor: active ? theme.cyan : theme.border, backgroundColor: active ? `${theme.cyan}1C` : theme.surface },
              ]}>
                <Text style={[styles.smallTagText, { color: active ? theme.cyan : theme.textMuted }]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.aidRow}>
          {models.map((model) => (
            <Pressable key={model.aid} onPress={() => onSelectAid(model.aid)} style={[
              styles.aidTag,
              { borderColor: modelView === "Individual" && selectedAid === model.aid ? modelColor(model.aid) : theme.border },
            ]}>
              <View style={[styles.aidLine, { backgroundColor: modelColor(model.aid) }]} />
              <Text style={[styles.aidTagText, { color: theme.textMuted }]}>{model.aid === "AVNI" ? "GFS · AVNI" : model.aid}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {modelView === "Agreement" ? <AgreementSummary models={models} /> : null}
      <SectionHeading title="Forecast guidance" meta="Official public ATCF records" />
      <View style={styles.guidanceGrid}>
        {(storm.modelGuidance?.aids ?? []).map((model) => <GuidanceRow key={model.aid} model={model} width={guidanceWidth} />)}
      </View>
      <Text style={[styles.disclaimer, { color: theme.textMuted }]}>Model guidance is not the official forecast. Use the NHC forecast and discussion for decisions.</Text>
    </>
  );
}

function AgreementSummary({ models }: { models: ReturnType<typeof mappableGuidance> }) {
  const { theme } = useTheme();
  const endpoints = models.map((model) => model.points.find((point) => point.forecastHour === 72))
    .filter((point): point is GuidancePoint => point !== undefined);
  let spreadMiles = 0;
  for (let left = 0; left < endpoints.length; left += 1) {
    for (let right = left + 1; right < endpoints.length; right += 1) {
      spreadMiles = Math.max(spreadMiles, distanceMiles(endpoints[left]!, endpoints[right]!));
    }
  }
  const agreement = spreadMiles <= 75 ? "TIGHT" : spreadMiles <= 150 ? "MODERATE" : "WIDE";
  const color = agreement === "TIGHT" ? theme.cyan : agreement === "MODERATE" ? theme.amber : theme.redBright;
  return (
    <View style={[styles.agreement, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.agreementTitle, { color }]}>{agreement} AGREEMENT</Text>
      <Text style={[styles.agreementValue, { color: theme.text }]}>{Math.round(spreadMiles)} MI MAX SPREAD · {endpoints.length} AIDS AT 72H</Text>
      <Text style={[styles.agreementNote, { color: theme.textMuted }]}>APP-CALCULATED DISPERSION · NOT AN NHC FORECAST</Text>
    </View>
  );
}

function GuidanceRow({ model, width }: {
  model: NonNullable<LiveStorm["modelGuidance"]>["aids"][number]; width: number;
}) {
  const { theme } = useTheme();
  const point72 = model.points.find((point) => point.forecastHour === 72) ?? [...model.points].reverse().find((point) => point.forecastHour <= 72);
  const last = model.points.at(-1);
  return (
    <View style={[styles.guidanceRow, { width, backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.guidanceColor, { backgroundColor: modelColor(model.aid) }]} />
      <Text style={styles.guidanceAid}>{model.aid}</Text>
      <Text numberOfLines={1} style={[styles.guidanceName, { color: theme.text }]}>{model.name}</Text>
      <Text style={[styles.guidanceStat, { color: theme.textMuted }]}>
        {point72?.windMph === null || point72?.windMph === undefined ? "72H —" : `72H ${point72.windMph} MPH`}{last ? ` · ${last.forecastHour}H` : ""}
      </Text>
    </View>
  );
}
