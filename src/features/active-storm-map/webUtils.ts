import type { MapLayer } from "./types";

const CYCLONE_ICON = require("../../../assets/hurricane-icon-red-outlined.png") as { uri: string };
export const STREET_TILES = process.env.EXPO_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const STREET_ATTRIBUTION = process.env.EXPO_PUBLIC_MAP_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const SATELLITE_BASE_TILES = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=BlueMarble_NextGeneration&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level8&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image%2Fjpeg";

export function initialMapLayer(): MapLayer {
  const requested = new URLSearchParams(window.location.search).get("mapLayer");
  if (requested === "satellite") return "Satellite";
  if (requested === "radar") return "Radar";
  if (requested === "wind") return "Wind";
  return "Map";
}
export function persistMapLayer(layer: MapLayer) {
  const url = new URL(window.location.href);
  if (layer === "Map") url.searchParams.delete("mapLayer");
  else url.searchParams.set("mapLayer", layer.toLowerCase());
  window.history.replaceState(window.history.state, "", url);
}
export function cycloneHtml(size: number, label: string) {
  return `<img role="img" aria-label="${escapeText(label)}" src="${CYCLONE_ICON.uri}" style="display:block;width:${size}px;height:${size}px;object-fit:contain;filter:drop-shadow(0 2px 3px rgba(0,0,0,.62));" />`;
}
export function forecastPointColor(windKnots: number) {
  if (windKnots >= 64) return "#EF4444";
  if (windKnots >= 50) return "#F59E0B";
  if (windKnots >= 34) return "#2DD4BF";
  return "#94A3B8";
}
function escapeText(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
export function forecastCalloutHtml(color: string, selected: boolean, strength: string, time: string) {
  return `<div class="forecast-callout-card${selected ? " forecast-callout-card--selected" : ""}" style="--forecast-accent:${color}"><span>${escapeText(time.replace(",", "").replace(" UTC", ""))}</span><strong>${escapeText(strength)}</strong></div>`;
}
