import { GeoJSONSource, Layer, Marker, RasterSource } from "@maplibre/maplibre-react-native";
import { Fragment } from "react";
import { Text, View } from "react-native";
import type { LiveStorm } from "../../types";
import { forecastPositionLabel, forecastStrengthLabel, formatForecastTime } from "../../utils/forecast";
import { RADAR_ATTRIBUTION, RADAR_WMS_LAYERS, radarTileUrl } from "../../utils/radar";
import { WIND_ZONE_STYLES } from "../../utils/windFields";
import { compactForecastTime, CycloneSymbol, forecastCalloutCoordinate, forecastPointColor } from "./nativeUtils";
import { nativeStyles as styles } from "./nativeStyles";
import type { MapLayer } from "./types";

export function NativeStormLayers({ storm, layer, center, coordinates, coneSections, visibleForecast,
  activeTrackIndex, selectedForecast, windFrame, windFrameIndex, height, compactCalloutIndexes,
  onSelectForecast, onSelectCurrent }: {
  storm: LiveStorm; layer: MapLayer; center: [number, number]; coordinates: Array<[number, number]>;
  coneSections: number[][][]; visibleForecast: NonNullable<LiveStorm["forecastPoints"]>;
  activeTrackIndex: number; selectedForecast: NonNullable<LiveStorm["forecastPoints"]>[number] | null;
  windFrame: NonNullable<LiveStorm["officialWindFields"]>["frames"][number] | undefined;
  windFrameIndex: number; height: number; compactCalloutIndexes: Set<number>;
  onSelectForecast: (index: number) => void; onSelectCurrent: () => void;
}) {
  const track: GeoJSON.Feature<GeoJSON.LineString> = { type: "Feature", properties: { source: "NOAA National Hurricane Center" }, geometry: { type: "LineString", coordinates } };
  const sectionLines: GeoJSON.Feature<GeoJSON.MultiLineString> = { type: "Feature", properties: { source: "NOAA National Hurricane Center" }, geometry: { type: "MultiLineString", coordinates: coneSections } };
  return <>
    {layer === "Radar" ? RADAR_WMS_LAYERS.map((radarLayer) => <RasterSource key={radarLayer.id}
      id={`noaa-radar-${radarLayer.id}`} tiles={[radarTileUrl(radarLayer)]} tileSize={256} minzoom={1} maxzoom={12} attribution={RADAR_ATTRIBUTION}>
      <Layer id={`noaa-radar-layer-${radarLayer.id}`} type="raster" paint={{ "raster-opacity": 0.76 }} />
    </RasterSource>) : null}
    {layer === "Wind" && windFrame ? windFrame.zones.map((zone) => {
      const style = WIND_ZONE_STYLES[zone.thresholdKnots];
      return <GeoJSONSource key={`${windFrameIndex}-${zone.thresholdKnots}`} id={`nhc-wind-${storm.id}-${zone.thresholdKnots}`} data={zone.feature as GeoJSON.Feature}>
        <Layer id={`nhc-wind-fill-${storm.id}-${zone.thresholdKnots}`} type="fill" paint={{ "fill-color": style.fillColor, "fill-opacity": style.fillOpacity }} />
        <Layer id={`nhc-wind-line-${storm.id}-${zone.thresholdKnots}`} type="line" paint={{ "line-color": style.color, "line-opacity": 0.95, "line-width": 2 }} />
      </GeoJSONSource>;
    }) : null}
    {storm.officialCone ? <GeoJSONSource id={`nhc-cone-${storm.id}`} data={storm.officialCone.feature as GeoJSON.Feature}>
      <Layer id={`nhc-cone-fill-${storm.id}`} type="fill" paint={{ "fill-color": "#DDFBFF", "fill-opacity": layer === "Map" ? 0.46 : 0.36 }} />
      <Layer id={`nhc-cone-line-${storm.id}`} type="line" paint={{ "line-color": "#007C91", "line-width": 2 }} />
    </GeoJSONSource> : null}
    {coneSections.length ? <GeoJSONSource id={`nhc-cone-sections-${storm.id}`} data={sectionLines}>
      <Layer id={`nhc-cone-sections-line-${storm.id}`} type="line" paint={{ "line-color": "#536A73", "line-width": 2, "line-opacity": 0.92 }} />
    </GeoJSONSource> : null}
    {coordinates.length > 1 ? <GeoJSONSource id={`nhc-track-${storm.id}`} data={track}>
      <Layer id={`nhc-track-line-${storm.id}`} type="line" paint={{ "line-color": "#00AFC1", "line-width": 3, "line-dasharray": [1.5, 1.5] }} />
    </GeoJSONSource> : null}
    {visibleForecast.map((point, index) => <ForecastMarker key={`${point.validAt ?? "forecast"}-${index}`}
      storm={storm} point={point} index={index} section={coneSections[index]} active={activeTrackIndex === index + 1}
      showCallout={layer !== "Radar" && (layer === "Wind" ? activeTrackIndex === index + 1 : height >= 300 || compactCalloutIndexes.has(index))}
      onSelect={() => onSelectForecast(index + 1)} />)}
    {layer !== "Wind" ? <Marker id={`${storm.id}-current`}
      lngLat={selectedForecast ? [selectedForecast.longitude, selectedForecast.latitude] : center} anchor="center"
      accessibilityLabel={selectedForecast ? `${storm.name} forecast center for ${formatForecastTime(selectedForecast.validAt)}: ${forecastStrengthLabel(selectedForecast)}` : `Current NHC center of ${storm.name}`}>
      <CycloneSymbol size={selectedForecast ? 34 : 42} />
    </Marker> : <Marker id={`${storm.id}-wind-center`} lngLat={center} anchor="center" onPress={onSelectCurrent}
      accessibilityLabel={`Current NHC center of ${storm.name}`}>
      <View style={[styles.windCenterDot, activeTrackIndex === 0 && styles.forecastDotSelected]} />
    </Marker>}
  </>;
}

function ForecastMarker({ storm, point, index, section, active, showCallout, onSelect }: {
  storm: LiveStorm; point: NonNullable<LiveStorm["forecastPoints"]>[number]; index: number;
  section?: number[][]; active: boolean; showCallout: boolean; onSelect: () => void;
}) {
  const validAt = formatForecastTime(point.validAt);
  const strength = forecastStrengthLabel(point);
  const position = forecastPositionLabel(point.latitude, point.longitude);
  const callout = forecastCalloutCoordinate(point, section, index);
  const leader: GeoJSON.Feature<GeoJSON.LineString> = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[point.longitude, point.latitude], callout] } };
  return <Fragment>
    {showCallout ? <GeoJSONSource id={`${storm.id}-forecast-callout-leader-${index}`} data={leader}>
      <Layer id={`${storm.id}-forecast-callout-line-${index}`} type="line" paint={{ "line-color": forecastPointColor(point.windKnots), "line-opacity": 0.92, "line-width": 2 }} />
    </GeoJSONSource> : null}
    <Marker id={`${storm.id}-forecast-${index}`} lngLat={[point.longitude, point.latitude]} anchor="center" onPress={onSelect}
      accessibilityLabel={`${storm.name} official NHC forecast for ${validAt}: ${strength}, ${position}`}>
      <View style={[styles.forecastDot, { backgroundColor: forecastPointColor(point.windKnots) }, active && styles.forecastDotSelected]} />
    </Marker>
    {showCallout ? <Marker id={`${storm.id}-forecast-callout-${index}`} lngLat={callout} anchor="center" onPress={onSelect}>
      <View style={styles.forecastCalloutStack}><View style={[styles.forecastCallout,
        { borderLeftColor: forecastPointColor(point.windKnots) }, active && styles.forecastCalloutSelected]}>
        <Text style={styles.forecastCalloutTime}>{compactForecastTime(point.validAt)}</Text>
        <Text style={styles.forecastCalloutStrength}>{strength}</Text>
      </View></View>
    </Marker> : null}
  </Fragment>;
}
