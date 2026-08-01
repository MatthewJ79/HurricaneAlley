import { useEffect, useState } from "react";
import { getAlertsForPlace } from "../api/alerts";
import type { AlertFeedState, SavedPlace } from "../types";
import {
  buildAlertSnapshot,
  classifyAlertLifecycle,
} from "../utils/alertLifecycle";
import {
  readAlertSnapshot,
  writeAlertSnapshot,
} from "../utils/alertStorage";

const REFRESH_INTERVAL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 12_000;

const emptyState: AlertFeedState = {
  status: "idle",
  stale: false,
  alerts: [],
  fetchedAt: null,
  error: null,
  lifecycleEvents: [],
};

export function usePlaceAlerts(place: SavedPlace | null) {
  const [state, setState] = useState<AlertFeedState>(emptyState);

  useEffect(() => {
    if (!place) {
      setState(emptyState);
      return;
    }

    let mounted = true;
    let activeController: AbortController | null = null;
    let previousSnapshot = null as Awaited<ReturnType<typeof readAlertSnapshot>>;
    setState({ ...emptyState, status: "loading" });

    const hydrate = async () => {
      previousSnapshot = await readAlertSnapshot(place.id);
      if (!mounted || !previousSnapshot) return;
      setState({
        status: "cached",
        stale: true,
        alerts: previousSnapshot.alerts,
        fetchedAt: previousSnapshot.fetchedAt,
        error: "Showing alerts stored on this device while current alerts are checked",
        lifecycleEvents: [],
      });
    };

    const load = async () => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      setState((current) => ({
        ...current,
        status: current.alerts.length ? current.status : "loading",
      }));

      try {
        const result = await getAlertsForPlace(place, controller.signal);
        if (!mounted) return;
        const lifecycleEvents = result.stale
          ? []
          : classifyAlertLifecycle(previousSnapshot, result.alerts);
        setState({
          status: result.stale ? "cached" : "live",
          stale: result.stale,
          alerts: result.alerts,
          fetchedAt: result.source.fetchedAt,
          error: result.lastError,
          lifecycleEvents,
        });
        if (!result.stale) {
          previousSnapshot = buildAlertSnapshot(
            previousSnapshot,
            result.alerts,
            result.source.fetchedAt,
          );
          await writeAlertSnapshot(place.id, previousSnapshot);
        }
      } catch (error) {
        if (!mounted) return;
        setState((current) => ({
          ...current,
          status: current.alerts.length ? "cached" : "unavailable",
          stale: true,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load official alerts",
        }));
      } finally {
        clearTimeout(timeout);
      }
    };

    let interval: ReturnType<typeof setInterval> | null = null;
    void hydrate().then(() => {
      if (!mounted) return;
      void load();
      interval = setInterval(load, REFRESH_INTERVAL_MS);
    });
    return () => {
      mounted = false;
      activeController?.abort();
      if (interval) clearInterval(interval);
    };
  }, [place?.id, place?.latitude, place?.longitude]);

  return state;
}
