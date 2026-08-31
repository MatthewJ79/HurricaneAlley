import type { LiveStorm, OfficialAlert, SavedPlace } from "../types";

export function alertAreaForStorm(storm: LiveStorm) {
  if (storm.basin === "Central Pacific") return { code: "HI", label: "Hawaii" };
  return null;
}

export function alertActionLabel(alert: OfficialAlert) {
  const response = alert.response?.trim();
  if (response && response !== "None") return response;
  return "Read official guidance";
}

export function pointMatchesAlert(place: SavedPlace, alert: OfficialAlert) {
  if (!alert.geometry) return false;
  const point: [number, number] = [place.longitude, place.latitude];
  if (alert.geometry.type === "Polygon") {
    return polygonContainsPoint(alert.geometry.coordinates, point);
  }
  return alert.geometry.coordinates.some((polygon) => polygonContainsPoint(polygon, point));
}

function polygonContainsPoint(polygon: number[][][], point: [number, number]) {
  const outer = polygon[0];
  if (!outer || !ringContainsPoint(outer, point)) return false;
  return !polygon.slice(1).some((hole) => ringContainsPoint(hole, point));
}

function ringContainsPoint(ring: number[][], [x, y]: [number, number]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index];
    const prior = ring[previous];
    if (!current || !prior) continue;
    const xi = current[0];
    const yi = current[1];
    const xj = prior[0];
    const yj = prior[1];
    if (![xi, yi, xj, yj].every((value) => typeof value === "number" && Number.isFinite(value))) continue;
    if (xi === undefined || yi === undefined || xj === undefined || yj === undefined) continue;
    const intersects = yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function alertColor(alert: OfficialAlert) {
  if (alert.severity === "Extreme") return "#D61F2C";
  if (alert.severity === "Severe") return "#F07B00";
  if (alert.severity === "Moderate") return "#E2A400";
  return "#1786A6";
}
