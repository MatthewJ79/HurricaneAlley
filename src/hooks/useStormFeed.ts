import { useEffect, useState } from "react";
import { getActiveStorms } from "../api/storms";
import type { StormFeedState } from "../types";

const REFRESH_INTERVAL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

const initialState: StormFeedState = {
  status: "loading",
  storms: [],
  fetchedAt: null,
  error: null,
};

export function useStormFeed() {
  const [state, setState] = useState<StormFeedState>(initialState);

  useEffect(() => {
    let mounted = true;
    let activeController: AbortController | null = null;

    const load = async () => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const result = await getActiveStorms(controller.signal);
        if (!mounted) return;
        setState({
          status: result.stale ? "cached" : "live",
          storms: result.storms,
          fetchedAt: result.source.fetchedAt,
          error: null,
        });
      } catch (error) {
        if (!mounted) return;
        setState((current) => ({
          ...current,
          status: current.storms.length > 0 ? "cached" : "unavailable",
          error:
            error instanceof Error
              ? error.message
              : "Unable to load current storms",
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
  }, []);

  return state;
}
