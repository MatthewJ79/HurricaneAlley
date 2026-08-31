import type { OfficialAlert, SavedPlace } from "../types";
import { API_BASE_URL } from "./storms";

export type AlertApiResponse = {
  status: "live" | "cached";
  stale: boolean;
  source: {
    name: string;
    url: string;
    fetchedAt: string;
  };
  location: { latitude: number; longitude: number } | null;
  area?: string;
  alerts: OfficialAlert[];
  lastAttemptAt: string;
  lastError: string | null;
};

export async function getAlertsForPlace(
  place: SavedPlace,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    lat: String(place.latitude),
    lon: String(place.longitude),
  });
  const response = await fetch(`${API_BASE_URL}/v1/alerts?${params}`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Hurricane Alley alerts API returned ${response.status}`);
  }
  return (await response.json()) as AlertApiResponse;
}

export async function getAlertsForArea(area: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ area });
  const response = await fetch(`${API_BASE_URL}/v1/alerts?${params}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Hurricane Alley regional alerts API returned ${response.status}`);
  }
  return (await response.json()) as AlertApiResponse;
}

