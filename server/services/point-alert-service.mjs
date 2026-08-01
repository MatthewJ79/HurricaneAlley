import { fetchPointAlerts } from "../nws-alerts.mjs";
import { withRequestTimeout } from "../lib/timeout.mjs";

export class PointAlertService {
  cache = new Map();

  constructor({ cacheTtlMs = 60_000, timeoutMs = 15_000 } = {}) {
    this.cacheTtlMs = cacheTtlMs;
    this.timeoutMs = timeoutMs;
  }

  key(point) {
    return `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`;
  }

  async alertsForPoint(point) {
    const key = this.key(point);
    const cached = this.cache.get(key);
    const attemptedAt = new Date().toISOString();
    if (cached && Date.now() - cached.cachedAt < this.cacheTtlMs) {
      return {
        ...cached.data,
        status: "live",
        stale: false,
        lastAttemptAt: attemptedAt,
        lastError: null,
      };
    }
    try {
      const data = await withRequestTimeout(
        (signal) => fetchPointAlerts({ ...point, signal }),
        this.timeoutMs,
      );
      this.cache.set(key, { cachedAt: Date.now(), data });
      return {
        ...data,
        status: "live",
        stale: false,
        lastAttemptAt: attemptedAt,
        lastError: null,
      };
    } catch (error) {
      if (!cached) throw error;
      return {
        ...cached.data,
        status: "cached",
        stale: true,
        lastAttemptAt: attemptedAt,
        lastError: String(error?.message ?? error),
      };
    }
  }
}

