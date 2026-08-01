import type { Theme } from "../../theme/tokens";
import type { LiveStorm } from "../../types";
import type { ReportView } from "./types";

export function productUrl(
  product: LiveStorm["products"][keyof LiveStorm["products"]] | undefined,
) {
  return product?.url ?? product?.kmzUrl ?? product?.zipUrl ?? null;
}

export function forecastTone(windKnots: number, theme: Theme) {
  if (windKnots >= 64) return theme.redBright;
  if (windKnots >= 34) return theme.warning;
  return theme.cyan;
}

export function formatMotion(storm: LiveStorm) {
  const degrees = storm.movement.directionDegrees;
  const speed = storm.movement.speedMph;
  if (degrees === null && speed === null) return "—";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const direction = degrees === null ? "" : directions[Math.round(degrees / 45) % 8];
  return `${direction}${direction && speed !== null ? " " : ""}${
    speed === null ? "" : `${speed} MPH`
  }`;
}

export function formatUpdated(value: string | null) {
  if (!value) return "time unavailable";
  return new Date(value).toLocaleString([], {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function formatCycle(value: string | null | undefined) {
  if (!value) return "Cycle pending";
  return new Date(value).toLocaleString([], {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZoneName: "short",
  });
}

export function initialReportView(): ReportView {
  if (typeof window === "undefined") return "Summary";
  const requested = new URLSearchParams(window.location.search).get("reportView") ??
    new URLSearchParams(window.location.search).get("screen");
  if (requested === "track" || requested === "forecast") return "Summary";
  if (requested === "data" || requested === "models") return "Models";
  if (requested === "alerts") return "Alerts";
  return "Summary";
}

export function distanceMiles(
  left: { latitude: number; longitude: number },
  right: { latitude: number; longitude: number },
) {
  const radians = Math.PI / 180;
  const latitudeDelta = (right.latitude - left.latitude) * radians;
  const longitudeDelta = ((((right.longitude - left.longitude) + 540) % 360) - 180) * radians;
  const leftLatitude = left.latitude * radians;
  const rightLatitude = right.latitude * radians;
  const haversine = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(haversine));
}
