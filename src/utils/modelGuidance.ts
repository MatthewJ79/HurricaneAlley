import type { LiveStorm } from "../types";

export const MODEL_COLORS: Record<string, string> = {
  AEMI: "#3B82F6",
  AVNI: "#22C55E",
  CTCI: "#F59E0B",
  GDMI: "#A855F7",
  HCCA: "#EF4444",
  HFAI: "#06B6D4",
  HFBI: "#EC4899",
  HMNI: "#84CC16",
  HWFI: "#F97316",
  IVCN: "#64748B",
  NNIC: "#14B8A6",
  TVCN: "#F8FAFC",
};

export function modelColor(aid: string) {
  return MODEL_COLORS[aid] ?? "#94A3B8";
}

export function mappableGuidance(storm: LiveStorm) {
  return (storm.modelGuidance?.aids ?? [])
    .map((model) => ({
      ...model,
      points: model.points.filter(
        (point) =>
          Number.isFinite(point.latitude) &&
          Number.isFinite(point.longitude) &&
          !(point.latitude === 0 && point.longitude === 0),
      ),
    }))
    .filter((model) => model.points.length > 1);
}

export function continuousTrackCoordinates(
  points: Array<{ latitude: number; longitude: number }>,
  referenceLongitude?: number | null,
) {
  let previousLongitude =
    referenceLongitude ?? points[0]?.longitude ?? 0;

  return points.map((point) => {
    let longitude = point.longitude;
    while (longitude - previousLongitude > 180) longitude -= 360;
    while (longitude - previousLongitude < -180) longitude += 360;
    previousLongitude = longitude;
    return {
      latitude: point.latitude,
      longitude,
    };
  });
}
