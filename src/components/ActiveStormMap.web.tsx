import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { NativeMapOverlays as MapOverlays } from "../features/active-storm-map/NativeMapOverlays";
import { nativeStyles as styles } from "../features/active-storm-map/nativeStyles";
import type { MapLayer } from "../features/active-storm-map/types";
import { useLeafletStormMap } from "../features/active-storm-map/useLeafletStormMap";
import { initialMapLayer, persistMapLayer } from "../features/active-storm-map/webUtils";
import "../leaflet.css";
import type { LiveStorm } from "../types";
import { forecastPositionLabel, forecastStrengthLabel, formatForecastTime } from "../utils/forecast";
import { stormHasRadarCoverage } from "../utils/radar";
import { satelliteImageryForStorm } from "../utils/satellite";

export function ActiveStormMap({ storm, height = 184, interactive = false }: {
  storm: LiveStorm; height?: number; interactive?: boolean;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [layer, setLayer] = useState<MapLayer>(initialMapLayer);
  const [windFrameIndex, setWindFrameIndex] = useState(0);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const forecast = storm.forecastPoints ?? [];
  const windFrames = storm.officialWindFields?.frames ?? [];
  const selectedWindFrameIndex = Math.min(windFrameIndex, Math.max(0, windFrames.length - 1));
  const windFrame = windFrames[selectedWindFrameIndex];
  const activeTrackIndex = layer === "Wind" ? selectedWindFrameIndex : selectedTrackIndex;
  const timelineMaxIndex = layer === "Wind" ? Math.max(0, windFrames.length - 1) : forecast.length;
  const selectedForecast = activeTrackIndex > 0 ? forecast[activeTrackIndex - 1] ?? null : null;
  const cardTime = selectedForecast ? formatForecastTime(selectedForecast.validAt) : "NOW";
  const cardStrength = selectedForecast ? forecastStrengthLabel(selectedForecast)
    : storm.wind.mph === null ? storm.classification : `${storm.wind.mph} MPH · ${storm.classification.toUpperCase()}`;
  const cardPosition = forecastPositionLabel(selectedForecast?.latitude ?? storm.center.latitude ?? 0,
    selectedForecast?.longitude ?? storm.center.longitude ?? 0);
  const onTrack = useCallback((index: number) => setSelectedTrackIndex(index), []);
  const onWind = useCallback((index: number) => setWindFrameIndex(index), []);

  useEffect(() => { setWindFrameIndex(0); setSelectedTrackIndex(0); }, [storm.id]);
  useLeafletStormMap({ containerRef, storm, layer, height, interactive, activeTrackIndex,
    windFrameIndex, windFramesLength: windFrames.length, onTrack, onWind });

  const chooseLayer = (next: MapLayer) => { setLayer(next); persistMapLayer(next); };
  const moveTimeline = (delta: number) => {
    if (layer === "Wind") setWindFrameIndex((current) => Math.max(0, Math.min(timelineMaxIndex, current + delta)));
    else setSelectedTrackIndex((current) => Math.max(0, Math.min(timelineMaxIndex, current + delta)));
  };
  return (
    <View accessibilityLabel={`Real map showing the current location and official NHC forecast track for ${storm.name}`}
      style={[styles.container, { height }]}>
      <View ref={(node) => { containerRef.current = node as unknown as HTMLElement | null; }} style={styles.map} />
      <MapOverlays storm={storm} layer={layer} hasRadarCoverage={stormHasRadarCoverage(storm)} windFrame={windFrame}
        activeTrackIndex={activeTrackIndex} timelineMaxIndex={timelineMaxIndex} cardTime={cardTime}
        cardStrength={cardStrength} cardPosition={cardPosition} satellite={satelliteImageryForStorm(storm)}
        onLayer={chooseLayer} onPrevious={() => moveTimeline(-1)} onNext={() => moveTimeline(1)} />
    </View>
  );
}
