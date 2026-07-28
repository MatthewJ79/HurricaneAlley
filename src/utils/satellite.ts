import type { LiveStorm } from "../types";
import { API_BASE_URL } from "../api/storms";

const TEN_MINUTES_MS = 10 * 60 * 1000;

export function satelliteImageryForStorm(storm: LiveStorm) {
  const longitude = storm.center.longitude;
  const west = longitude !== null && longitude < -105;
  const satellite = west ? "GOES-WEST" : "GOES-EAST";
  const sourceTime = storm.updatedAt ?? storm.officialCone?.issuedAt;
  const observationTime = sourceTime
    ? new Date(
        Math.floor(new Date(sourceTime).getTime() / TEN_MINUTES_MS) *
          TEN_MINUTES_MS,
      )
        .toISOString()
        .replace(".000", "")
    : null;
  const source = west ? "west" : "east";

  return {
    observationTime,
    satellite,
    tileUrl:
      `${API_BASE_URL}/v1/satellite/${source}/` +
      `${encodeURIComponent(observationTime ?? "latest")}/` +
      "{z}/{y}/{x}.png",
  };
}

export function satelliteTimeLabel(observationTime: string | null) {
  if (!observationTime) return "LATEST";
  return new Date(observationTime)
    .toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
      hour12: false,
    })
    .replace("24:", "00:");
}
