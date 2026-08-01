export const RADAR_ATTRIBUTION =
  "NOAA/NWS Multi-Radar Multi-Sensor (MRMS)";

export const RADAR_WMS_LAYERS = [
  {
    id: "conus",
    layer: "conus_bref_qcd",
    url: "https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows",
  },
  {
    id: "caribbean",
    layer: "carib_bref_qcd",
    url: "https://opengeo.ncep.noaa.gov/geoserver/carib/carib_bref_qcd/ows",
  },
  {
    id: "hawaii",
    layer: "hawaii_bref_qcd",
    url: "https://opengeo.ncep.noaa.gov/geoserver/hawaii/hawaii_bref_qcd/ows",
  },
] as const;

export function radarTileUrl({
  url,
  layer,
}: (typeof RADAR_WMS_LAYERS)[number]) {
  return (
    `${url}?service=WMS&version=1.1.1&request=GetMap` +
    `&layers=${layer}&styles=radar_reflectivity` +
    "&format=image/png&transparent=true&height=256&width=256" +
    "&srs=EPSG:3857&bbox={bbox-epsg-3857}"
  );
}

const RADAR_COVERAGE_BOUNDS = [
  { west: -130, east: -60, south: 20, north: 55 },
  { west: -90, east: -60, south: 10, north: 25 },
  { west: -164, east: -151, south: 15, north: 26 },
] as const;

export function stormHasRadarCoverage(storm: LiveStorm) {
  const { latitude, longitude } = storm.center;
  if (latitude === null || longitude === null) return false;
  return RADAR_COVERAGE_BOUNDS.some(
    ({ west, east, south, north }) =>
      longitude >= west &&
      longitude <= east &&
      latitude >= south &&
      latitude <= north,
  );
}
import type { LiveStorm } from "../types";
