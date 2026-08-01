import type { LngLatBounds, StyleSpecification } from "@maplibre/maplibre-react-native";
import { Image } from "react-native";
import type { LiveStorm } from "../../types";
import { formatForecastTime } from "../../utils/forecast";
import { satelliteImageryForStorm } from "../../utils/satellite";

const CYCLONE_ICON = require("../../../assets/hurricane-icon-red-outlined.png");

export function satelliteStyle(storm: LiveStorm): StyleSpecification {
  const satellite = satelliteImageryForStorm(storm);
  return {
    version: 8,
    sources: {
      "nasa-satellite-base": { type: "raster", tiles: ["https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=BlueMarble_NextGeneration&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level8&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image%2Fjpeg"], tileSize: 256, maxzoom: 9, attribution: "NASA EOSDIS GIBS" },
      "nasa-satellite-true-color": { type: "raster", tiles: [satellite.tileUrl], tileSize: 256, maxzoom: 7, attribution: `NASA ${satellite.satellite} GeoColor · ${satellite.observationTime ?? "latest"}` },
    },
    layers: [
      { id: "satellite-base", type: "raster", source: "nasa-satellite-base" },
      { id: "satellite-true-color", type: "raster", source: "nasa-satellite-true-color" },
    ],
  };
}

export function CycloneSymbol({ size }: { size: number }) {
  return <Image accessible accessibilityRole="image" source={CYCLONE_ICON} resizeMode="contain" style={{ width: size, height: size }} />;
}

export function forecastPointColor(windKnots: number) {
  if (windKnots >= 64) return "#EF4444";
  if (windKnots >= 50) return "#F59E0B";
  if (windKnots >= 34) return "#2DD4BF";
  return "#94A3B8";
}

export function compactForecastTime(validAt: string | null) {
  return formatForecastTime(validAt).replace(",", "").replace(" UTC", "");
}

export function forecastCalloutCoordinate(point: { latitude: number; longitude: number }, section: number[][] | undefined, index: number): [number, number] {
  const edge = section?.[index % 2];
  if (!edge || edge[0] === undefined || edge[1] === undefined) return [point.longitude, point.latitude + (index % 2 === 0 ? 0.8 : -0.8)];
  const latitudeScale = Math.max(0.2, Math.cos((point.latitude * Math.PI) / 180));
  const deltaLongitude = (edge[0] - point.longitude) * latitudeScale;
  const deltaLatitude = edge[1] - point.latitude;
  const distance = Math.max(0.01, Math.hypot(deltaLongitude, deltaLatitude));
  const beyondCone = Math.max(0.55, distance * 0.25);
  return [edge[0] + (deltaLongitude / distance / latitudeScale) * beyondCone, edge[1] + (deltaLatitude / distance) * beyondCone];
}

export function mapBounds(storm: LiveStorm): LngLatBounds {
  const points: Array<[number, number]> = [];
  if (storm.center.longitude !== null && storm.center.latitude !== null) points.push([storm.center.longitude, storm.center.latitude]);
  for (const point of storm.forecastPoints ?? []) points.push([point.longitude, point.latitude]);
  if (!points.length) return [-100, 5, -20, 50];
  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  return [Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)];
}
