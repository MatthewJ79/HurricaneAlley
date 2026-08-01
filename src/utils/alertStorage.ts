import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AlertSnapshot, SavedPlace } from "../types";

export const SAVED_PLACES_KEY = "hurricane-alley.saved-places.v2";
const LEGACY_SAVED_PLACES_KEY = "hurricane-alley.saved-places.v1";
const ALERT_SNAPSHOT_PREFIX = "hurricane-alley.alert-snapshot.v1.";

export async function readSavedPlaces(): Promise<SavedPlace[]> {
  try {
    let raw = await AsyncStorage.getItem(SAVED_PLACES_KEY);
    if (!raw) {
      raw = await AsyncStorage.getItem(LEGACY_SAVED_PLACES_KEY);
      if (raw) await AsyncStorage.setItem(SAVED_PLACES_KEY, raw);
    }
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? (value as SavedPlace[]) : [];
  } catch {
    return [];
  }
}

export async function writeSavedPlaces(places: SavedPlace[]) {
  await AsyncStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(places));
}

export async function readAlertSnapshot(placeId: string) {
  try {
    const raw = await AsyncStorage.getItem(`${ALERT_SNAPSHOT_PREFIX}${placeId}`);
    if (!raw) return null;
    return JSON.parse(raw) as AlertSnapshot;
  } catch {
    return null;
  }
}

export async function writeAlertSnapshot(
  placeId: string,
  snapshot: AlertSnapshot,
) {
  await AsyncStorage.setItem(
    `${ALERT_SNAPSHOT_PREFIX}${placeId}`,
    JSON.stringify(snapshot),
  );
}

export async function removeAlertSnapshot(placeId: string) {
  await AsyncStorage.removeItem(`${ALERT_SNAPSHOT_PREFIX}${placeId}`);
}

