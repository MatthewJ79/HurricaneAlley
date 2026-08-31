import { useEffect, useState } from "react";
import { getAlertsForArea } from "../api/alerts";
import type { AlertFeedState } from "../types";

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

export function useRegionalAlerts(area: string | null) {
  const [state, setState] = useState<AlertFeedState>(emptyState);

  useEffect(() => {
    if (!area) {
      setState(emptyState);
      return;
    }
    let mounted = true;
    let activeController: AbortController | null = null;

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
        const result = await getAlertsForArea(area, controller.signal);
        if (!mounted) return;
        setState({
          status: result.stale ? "cached" : "live",
          stale: result.stale,
          alerts: result.alerts,
          fetchedAt: result.source.fetchedAt,
          error: result.lastError,
          lifecycleEvents: [],
        });
      } catch (error) {
        if (!mounted) return;
        setState((current) => ({
          ...current,
          status: current.alerts.length ? "cached" : "unavailable",
          stale: true,
          error: error instanceof Error ? error.message : "Unable to load regional alerts",
        }));
      } finally {
        clearTimeout(timeout);
      }
    };

    void load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      mounted = false;
      activeController?.abort();
      clearInterval(interval);
    };
  }, [area]);

  return state;
}
