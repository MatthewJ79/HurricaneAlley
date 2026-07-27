import http from "node:http";
import {
  enrichStormCone,
  enrichStormForecast,
  enrichStormModels,
  fetchCurrentStorms,
} from "./nhc.mjs";
import { readCache, writeCache } from "./store.mjs";

const PORT = Number(process.env.PORT ?? 8787);
const POLL_INTERVAL_MS = Number(process.env.NHC_POLL_INTERVAL_MS ?? 120_000);
const REQUEST_TIMEOUT_MS = Number(process.env.NHC_REQUEST_TIMEOUT_MS ?? 15_000);

let snapshot = null;
let validators = { etag: null, lastModified: null };
let refreshInFlight = null;
let lastAttemptAt = null;
let lastError = null;

function json(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(body)}\n`);
}

async function refresh() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    lastAttemptAt = new Date().toISOString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const result = await fetchCurrentStorms({
        signal: controller.signal,
        etag: validators.etag,
        lastModified: validators.lastModified,
      });

      if (!result.notModified) {
        validators = {
          etag: result.etag,
          lastModified: result.lastModified,
        };
        const storms = await Promise.all(
          result.data.storms.map(async (storm) => {
            let enriched = storm;
            try {
              enriched = await enrichStormForecast(enriched, {
                signal: controller.signal,
              });
            } catch (error) {
              console.error(
                `[NHC] Forecast enrichment failed for ${storm.id}: ${error.message}`,
              );
              enriched = { ...enriched, forecastPoints: [] };
            }

            try {
              enriched = await enrichStormCone(enriched, {
                signal: controller.signal,
              });
            } catch (error) {
              console.error(
                `[NHC] Cone enrichment failed for ${storm.id}: ${error.message}`,
              );
              enriched = { ...enriched, officialCone: null };
            }

            try {
              return await enrichStormModels(enriched, {
                signal: controller.signal,
              });
            } catch (error) {
              console.error(
                `[NHC] Model guidance enrichment failed for ${storm.id}: ${error.message}`,
              );
              return { ...enriched, modelGuidance: null };
            }
          }),
        );
        snapshot = {
          ...result.data,
          storms,
          status: "live",
          stale: false,
        };
        await writeCache(snapshot);
      } else if (snapshot) {
        snapshot = { ...snapshot, status: "live", stale: false };
      }

      lastError = null;
      return snapshot;
    } catch (error) {
      lastError =
        error?.name === "AbortError"
          ? `NHC request timed out after ${REQUEST_TIMEOUT_MS}ms`
          : String(error?.message ?? error);

      if (snapshot) {
        snapshot = { ...snapshot, status: "cached", stale: true };
      }

      console.error(`[NHC] ${lastError}`);
      return snapshot;
    } finally {
      clearTimeout(timeout);
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function start() {
  snapshot = await readCache();
  if (snapshot) snapshot = { ...snapshot, status: "cached", stale: true };

  await refresh();
  setInterval(refresh, POLL_INTERVAL_MS).unref();

  const server = http.createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Origin": "*",
      });
      response.end();
      return;
    }

    if (request.method !== "GET") {
      json(response, 405, { error: "Method not allowed" });
      return;
    }

    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

    if (url.pathname === "/health") {
      json(response, snapshot ? 200 : 503, {
        ok: Boolean(snapshot),
        status: snapshot?.status ?? "unavailable",
        stormCount: snapshot?.storms?.length ?? 0,
        lastAttemptAt,
        lastSuccessfulFetchAt: snapshot?.source?.fetchedAt ?? null,
        lastError,
      });
      return;
    }

    if (url.pathname === "/v1/storms") {
      if (!snapshot) {
        json(response, 503, {
          error: "Storm data is temporarily unavailable",
          lastAttemptAt,
          lastError,
        });
        return;
      }

      json(response, 200, snapshot);
      return;
    }

    const stormMatch = url.pathname.match(/^\/v1\/storms\/([a-z0-9]+)$/i);
    if (stormMatch) {
      const storm = snapshot?.storms?.find(
        (candidate) =>
          candidate.id.toLowerCase() === stormMatch[1].toLowerCase(),
      );

      if (!storm) {
        json(response, 404, { error: "Storm not found" });
        return;
      }

      json(response, 200, {
        source: snapshot.source,
        status: snapshot.status,
        stale: snapshot.stale,
        storm,
      });
      return;
    }

    json(response, 404, {
      error: "Not found",
      routes: ["/health", "/v1/storms", "/v1/storms/:id"],
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Hurricane Alley API listening on http://localhost:${PORT}`);
    console.log(`NHC poll interval: ${POLL_INTERVAL_MS}ms`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
