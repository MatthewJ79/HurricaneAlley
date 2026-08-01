import type { LiveStorm } from "../types";
import { API_BASE_URL } from "../api/storms";

export function satelliteImageryForStorm(storm: LiveStorm) {
  const longitude = storm.center.longitude;
  const west = longitude !== null && longitude < -105;
  const satellite = west ? "GOES-WEST" : "GOES-EAST";
  const source = west ? "west" : "east";

  return {
    observationTime: null,
    satellite,
    tileUrl:
      `${API_BASE_URL}/v1/satellite/${source}/` +
      "latest/{z}/{y}/{x}.png",
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
