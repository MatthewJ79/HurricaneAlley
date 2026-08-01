import type { LiveStorm } from "../../types";

export function formatStormMotion(storm: LiveStorm) {
  const degrees = storm.movement.directionDegrees;
  const speed = storm.movement.speedMph;
  if (degrees === null && speed === null) return "—";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const direction =
    degrees === null
      ? ""
      : directions[Math.round(degrees / 45) % directions.length];
  return `${direction}${direction && speed !== null ? " " : ""}${
    speed === null ? "" : `${speed} MPH`
  }`;
}

export function formatStormUpdated(value: string | null) {
  if (!value) return "time unavailable";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

