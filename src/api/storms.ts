import { Platform } from "react-native";
import type { LiveStorm } from "../types";

type StormApiResponse = {
  status: "live" | "cached";
  stale: boolean;
  source: { fetchedAt: string };
  storms: LiveStorm[];
};

function defaultApiBaseUrl() {
  if (Platform.OS === "android") return "http://10.0.2.2:8787";
  if (Platform.OS === "web") return "http://127.0.0.1:8787";
  return "http://localhost:8787";
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl();

export async function getActiveStorms(signal?: AbortSignal) {
  const response = await fetch(
    `${API_BASE_URL}/v1/storms?requestTime=${Date.now()}`,
    {
    headers: { Accept: "application/json" },
    signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Hurricane Alley API returned ${response.status}`);
  }

  return (await response.json()) as StormApiResponse;
}
