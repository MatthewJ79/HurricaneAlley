import { Camera, Map } from "@maplibre/maplibre-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { NativeMapOverlays } from "../features/active-storm-map/NativeMapOverlays";
import { NativeStormLayers } from "../features/active-storm-map/NativeStormLayers";
import { mapBounds, satelliteStyle } from "../features/active-storm-map/nativeUtils";
import { nativeStyles as styles } from "../features/active-storm-map/nativeStyles";
import type { MapLayer } from "../features/active-storm-map/types";
import type { LiveStorm } from "../types";
import { coneCrossSections } from "../utils/coneSections";
import { forecastPositionLabel, forecastStrengthLabel, formatForecastTime } from "../utils/forecast";
import { stormHasRadarCoverage } from "../utils/radar";
import { satelliteImageryForStorm } from "../utils/satellite";

const STREET_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function ActiveStormMap({ storm, height = 184, interactive = false }: {
  storm: LiveStorm; height?: number; interactive?: boolean;
}) {
  const [layer, setLayer] = useState<MapLayer>("Map");
  const [windFrameIndex, setWindFrameIndex] = useState(0);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const satellite = satelliteImageryForStorm(storm);
  const hasRadarCoverage = stormHasRadarCoverage(storm);
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
  const visibleForecast = forecast.slice(0, layer === "Wind" ? Math.max(0, windFrames.length - 1) : undefined);
  const compactCalloutIndexes = new Set([0, Math.floor((visibleForecast.length - 1) / 2),
    visibleForecast.length - 1, Math.max(0, activeTrackIndex - 1)]);

  useEffect(() => { setWindFrameIndex(0); setSelectedTrackIndex(0); }, [storm.id]);
  const center: [number, number] = [storm.center.longitude ?? -70, storm.center.latitude ?? 25];
  const coordinates: Array<[number, number]> = [center,
    ...(storm.forecastPoints?.map((point) => [point.longitude, point.latitude] as [number, number]) ?? [])];
  const selectForecast = (index: number) => layer === "Wind" ? setWindFrameIndex(index) : setSelectedTrackIndex(index);
  const moveTimeline = (delta: number) => {
    if (layer === "Wind") setWindFrameIndex((current) => Math.max(0, Math.min(timelineMaxIndex, current + delta)));
    else setSelectedTrackIndex((current) => Math.max(0, Math.min(timelineMaxIndex, current + delta)));
  };

  return (
    <View accessibilityLabel={`Real map showing the current location and official NHC forecast track for ${storm.name}`}
      style={[styles.container, { height }]}>
      <Map style={styles.map} mapStyle={layer === "Satellite" ? satelliteStyle(storm) : STREET_STYLE}
        attribution logo={false} compass={false} dragPan={interactive} touchZoom={interactive}
        doubleTapZoom={interactive} touchRotate={false} touchPitch={interactive}>
        <Camera initialViewState={{ bounds: mapBounds(storm), padding: { top: 46, right: 44, bottom: 46, left: 44 } }} />
        <NativeStormLayers storm={storm} layer={layer} center={center} coordinates={coordinates}
          coneSections={coneCrossSections(storm)} visibleForecast={visibleForecast} activeTrackIndex={activeTrackIndex}
          selectedForecast={selectedForecast} windFrame={windFrame} windFrameIndex={selectedWindFrameIndex}
          height={height} compactCalloutIndexes={compactCalloutIndexes} onSelectForecast={selectForecast}
          onSelectCurrent={() => setWindFrameIndex(0)} />
      </Map>
      <NativeMapOverlays storm={storm} layer={layer} hasRadarCoverage={hasRadarCoverage} windFrame={windFrame}
        activeTrackIndex={activeTrackIndex} timelineMaxIndex={timelineMaxIndex} cardTime={cardTime}
        cardStrength={cardStrength} cardPosition={cardPosition} satellite={satellite} onLayer={setLayer}
        onPrevious={() => moveTimeline(-1)} onNext={() => moveTimeline(1)} />
    </View>
  );
}
