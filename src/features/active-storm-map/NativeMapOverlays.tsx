import { Pressable, Text, View } from "react-native";
import type { LiveStorm } from "../../types";
import { satelliteTimeLabel } from "../../utils/satellite";
import { WIND_ZONE_STYLES, windFieldFrameLabel } from "../../utils/windFields";
import { nativeStyles as styles } from "./nativeStyles";
import type { MapLayer } from "./types";

export function NativeMapOverlays({ storm, layer, hasRadarCoverage, windFrame,
  activeTrackIndex, timelineMaxIndex, cardTime, cardStrength, cardPosition,
  satellite, onLayer, onPrevious, onNext }: {
  storm: LiveStorm; layer: MapLayer; hasRadarCoverage: boolean;
  windFrame: NonNullable<LiveStorm["officialWindFields"]>["frames"][number] | undefined;
  activeTrackIndex: number; timelineMaxIndex: number; cardTime: string; cardStrength: string; cardPosition: string;
  satellite: ReturnType<typeof import("../../utils/satellite").satelliteImageryForStorm>;
  onLayer: (layer: MapLayer) => void; onPrevious: () => void; onNext: () => void;
}) {
  return (
    <>
      <View style={styles.layerControl}>
        {(["Map", "Satellite", "Radar", "Wind"] as const).map((option) => {
          const active = layer === option;
          return <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: active }}
            onPress={(event) => { event.stopPropagation(); onLayer(option); }}
            style={[styles.layerButton, active && styles.layerButtonActive]}>
            <Text style={[styles.layerText, active && styles.layerTextActive]}>{option}</Text>
          </Pressable>;
        })}
      </View>
      {layer === "Radar" ? <View pointerEvents="none" style={styles.radarCoverageNotice}>
        <Text style={[styles.radarCoverageTitle, hasRadarCoverage && styles.radarCoverageTitleActive]}>
          {hasRadarCoverage ? "OBSERVED RADAR LOADED" : "NO GROUND-RADAR COVERAGE"}
        </Text>
        <Text style={styles.radarCoverageBody}>{hasRadarCoverage
          ? "Blank areas may be clear or beyond a radar station's range."
          : "This storm is offshore. Use Satellite for full storm imagery."}</Text>
      </View> : null}
      {layer !== "Radar" && timelineMaxIndex > 0 ? <View style={styles.forecastCard}>
        <View style={styles.forecastCardHeader}>
          <TimelineButton label="Previous forecast point" disabled={activeTrackIndex === 0} glyph="‹" onPress={onPrevious} />
          <View pointerEvents="none" style={styles.windTimeReadout}>
            <Text style={styles.windTimeLabel}>{layer === "Wind" && windFrame ? windFieldFrameLabel(windFrame) : cardTime}</Text>
          </View>
          <TimelineButton label="Next forecast point" disabled={activeTrackIndex >= timelineMaxIndex} glyph="›" onPress={onNext} />
        </View>
        <View pointerEvents="none" style={styles.forecastCardBody}>
          <Text style={styles.forecastCardStrength}>{cardStrength}</Text>
          <Text style={styles.forecastCardPosition}>{cardPosition}</Text>
        </View>
      </View> : null}
      {layer === "Wind" && windFrame ? <View pointerEvents="none" style={styles.windLegend}>
        {[
          { color: WIND_ZONE_STYLES[34].fillColor, force: "Tropical storm", speed: "34 KT · 39 MPH" },
          { color: WIND_ZONE_STYLES[50].fillColor, force: "Strong tropical storm", speed: "50 KT · 58 MPH" },
          { color: WIND_ZONE_STYLES[64].fillColor, force: "Hurricane force", speed: "64 KT · 74 MPH" },
        ].map((item) => <View key={item.speed} style={styles.windLegendItem}>
          <View style={[styles.windLegendSwatch, { backgroundColor: item.color }]} />
          <View><Text style={styles.windLegendSpeed}>{item.speed}</Text><Text style={styles.windLegendForce}>{item.force}</Text></View>
        </View>)}
      </View> : null}
      <View pointerEvents="none" style={styles.sourceBadge}>
        <Text style={[styles.sourceText, layer === "Radar" && !hasRadarCoverage && styles.sourceTextWarning]}>
          {sourceLabel(storm, layer, hasRadarCoverage, Boolean(windFrame), satellite)}
        </Text>
      </View>
    </>
  );
}

function TimelineButton({ label, disabled, glyph, onPress }: { label: string; disabled: boolean; glyph: string; onPress: () => void }) {
  return <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={(event) => { event.stopPropagation(); onPress(); }} style={[styles.windTimeButton, disabled && styles.windTimeButtonDisabled]}>
    <Text style={styles.windTimeButtonText}>{glyph}</Text>
  </Pressable>;
}

function sourceLabel(storm: LiveStorm, layer: MapLayer, radar: boolean, wind: boolean,
  satellite: ReturnType<typeof import("../../utils/satellite").satelliteImageryForStorm>) {
  if (layer === "Satellite") return `NHC TRACK · ${satellite.satellite} ${satelliteTimeLabel(satellite.observationTime)} UTC`;
  if (layer === "Radar") return radar ? "NOAA MRMS RADAR · OBSERVED · LATEST AVAILABLE" : "NOAA RADAR · STORM OUTSIDE GROUND-RADAR RANGE";
  if (layer === "Wind") return wind ? "OFFICIAL NHC WIND RADII · 34/50/64 KT" : "OFFICIAL NHC WIND RADII UNAVAILABLE";
  return storm.officialCone ? "OFFICIAL NHC CONE + TRACK" : "OFFICIAL NHC TRACK";
}
