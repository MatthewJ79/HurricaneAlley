import {
  enrichStormCone,
  enrichStormForecast,
  enrichStormModels,
  enrichStormWindFields,
  fetchCurrentStorms,
} from "../nhc.mjs";
import { prewarmStormSatelliteTiles } from "../satellite.mjs";
import { withRequestTimeout } from "../lib/timeout.mjs";

export class StormFeedService {
  snapshot = null;
  validators = { etag: null, lastModified: null };
  refreshInFlight = null;
  lastAttemptAt = null;
  lastError = null;

  constructor(repository, { timeoutMs = 15_000, logger = console } = {}) {
    this.repository = repository;
    this.timeoutMs = timeoutMs;
    this.logger = logger;
  }

  async initialize() {
    this.snapshot = await this.repository.readCurrentSnapshot();
    if (this.snapshot) {
      this.snapshot = { ...this.snapshot, status: "cached", stale: true };
    }
    return this.refresh();
  }

  async enrichStorm(storm) {
    let enriched = storm;
    enriched = await this.tryEnrichment(
      enriched,
      "Forecast",
      (signal) => enrichStormForecast(enriched, { signal }),
      (value) => ({ ...value, forecastPoints: [] }),
    );
    enriched = await this.tryEnrichment(
      enriched,
      "Cone",
      (signal) => enrichStormCone(enriched, { signal }),
      (value) => ({ ...value, officialCone: null }),
    );
    enriched = await this.tryEnrichment(
      enriched,
      "Wind-field",
      (signal) => enrichStormWindFields(enriched, { signal }),
      (value) => ({ ...value, officialWindFields: null }),
    );
    return this.tryEnrichment(
      enriched,
      "Model guidance",
      (signal) => enrichStormModels(enriched, { signal }),
      (value) => ({ ...value, modelGuidance: null }),
      Math.max(30_000, this.timeoutMs),
    );
  }

  async tryEnrichment(storm, label, callback, fallback, timeout = this.timeoutMs) {
    try {
      return await withRequestTimeout(callback, timeout);
    } catch (error) {
      this.logger.error(`[NHC] ${label} enrichment failed for ${storm.id}: ${error.message}`);
      return fallback(storm);
    }
  }

  async refresh() {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.performRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  async performRefresh() {
    this.lastAttemptAt = new Date().toISOString();
    try {
      const result = await withRequestTimeout(
        (signal) => fetchCurrentStorms({ signal, ...this.validators }),
        this.timeoutMs,
      );
      if (result.notModified) {
        if (this.snapshot) this.snapshot = { ...this.snapshot, status: "live", stale: false };
      } else {
        this.validators = { etag: result.etag, lastModified: result.lastModified };
        const storms = await Promise.all(
          result.data.storms.map((storm) => this.enrichStorm(storm)),
        );
        this.snapshot = { ...result.data, storms, status: "live", stale: false };
        await this.repository.writeCurrentSnapshot(this.snapshot);
        void prewarmStormSatelliteTiles(storms).catch((error) => {
          this.logger.error(`[Satellite] Prewarm failed: ${error.message}`);
        });
      }
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.name === "AbortError"
        ? `NHC request timed out after ${this.timeoutMs}ms`
        : String(error?.message ?? error);
      if (this.snapshot) this.snapshot = { ...this.snapshot, status: "cached", stale: true };
      this.logger.error(`[NHC] ${this.lastError}`);
    }
    return this.snapshot;
  }
}
