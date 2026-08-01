import { useEffect, useState } from "react";
import type { AlertPreferences, SavedPlace } from "../types";
import {
  readSavedPlaces,
  removeAlertSnapshot,
  writeSavedPlaces,
} from "../utils/alertStorage";

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  pushEnabledWhenAvailable: false,
  minimumSeverity: "Severe",
  includeUpdates: true,
};

export function useSavedPlaces() {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    void readSavedPlaces().then((saved) => {
      if (!mounted) return;
      setPlaces(saved);
      setHydrated(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void writeSavedPlaces(places);
  }, [hydrated, places]);

  const addPlace = (place: Omit<SavedPlace, "id">) => {
    const saved = {
      ...place,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      alertPreferences: DEFAULT_ALERT_PREFERENCES,
    };
    setPlaces((current) => [...current, saved]);
    return saved;
  };

  const removePlace = (id: string) => {
    setPlaces((current) => current.filter((place) => place.id !== id));
    void removeAlertSnapshot(id);
  };

  const updatePlace = (id: string, updates: Partial<SavedPlace>) => {
    setPlaces((current) =>
      current.map((place) =>
        place.id === id ? { ...place, ...updates, id: place.id } : place,
      ),
    );
  };

  return { places, hydrated, addPlace, removePlace, updatePlace };
}
