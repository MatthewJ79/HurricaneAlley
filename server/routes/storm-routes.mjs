import { json } from "../lib/http.mjs";
import { parseAlertPoint } from "../nws-alerts.mjs";

export async function handleStormRoute(response, url, stormFeed, alertService) {
  if (url.pathname === "/v1/storms") {
    if (!stormFeed.snapshot) {
      json(response, 503, {
        error: "Storm data is temporarily unavailable",
        lastAttemptAt: stormFeed.lastAttemptAt,
        lastError: stormFeed.lastError,
      });
    } else {
      json(response, 200, stormFeed.snapshot);
    }
    return true;
  }

  if (url.pathname === "/v1/alerts") {
    let point;
    try {
      point = parseAlertPoint(
        url.searchParams.get("lat"),
        url.searchParams.get("lon"),
      );
    } catch (error) {
      json(response, 400, { error: error.message });
      return true;
    }
    try {
      json(response, 200, await alertService.alertsForPoint(point));
    } catch (error) {
      json(response, 502, {
        error: "Official alerts are temporarily unavailable",
        lastAttemptAt: new Date().toISOString(),
        detail: String(error?.message ?? error),
      });
    }
    return true;
  }

  const match = url.pathname.match(/^\/v1\/storms\/([a-z0-9]+)$/i);
  if (!match) return false;
  const storm = stormFeed.snapshot?.storms?.find(
    (candidate) => candidate.id.toLowerCase() === match[1].toLowerCase(),
  );
  if (!storm) {
    json(response, 404, { error: "Storm not found" });
  } else {
    json(response, 200, {
      source: stormFeed.snapshot.source,
      status: stormFeed.snapshot.status,
      stale: stormFeed.snapshot.stale,
      storm,
    });
  }
  return true;
}

