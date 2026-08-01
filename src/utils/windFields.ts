import type { LiveStorm } from "../types";

export const WIND_ZONE_STYLES = {
  34: { color: "#0EA5A8", fillColor: "#2DD4BF", fillOpacity: 0.23 },
  50: { color: "#D97706", fillColor: "#F59E0B", fillOpacity: 0.3 },
  64: { color: "#DC2626", fillColor: "#EF4444", fillOpacity: 0.38 },
} as const;

export function windFieldFrameLabel(
  frame: NonNullable<LiveStorm["officialWindFields"]>["frames"][number],
) {
  if (frame.forecastHour === 0) return "NOW";
  if (!frame.validAt) {
    return frame.forecastHour === null ? "FORECAST" : `+${frame.forecastHour}H`;
  }
  return new Date(frame.validAt)
    .toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      timeZone: "UTC",
      hour12: true,
    })
    .toUpperCase()
    .concat(" UTC");
}
