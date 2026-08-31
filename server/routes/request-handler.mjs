import { CORS_HEADERS, json } from "../lib/http.mjs";
import { handlePushRoute } from "./push-routes.mjs";
import { handleSatelliteRoute } from "./satellite-route.mjs";
import { handleStormRoute } from "./storm-routes.mjs";

const ROUTES = [
  "/health",
  "/v1/storms",
  "/v1/storms/:id",
  "/v1/alerts?lat=:latitude&lon=:longitude|area=:state",
  "POST /v1/push/subscriptions",
  "GET|DELETE /v1/push/subscriptions/:id",
  "/v1/satellite/:source/:time/:z/:y/:x.png",
];

export function createRequestHandler({ repository, stormFeed, alertService, pushService }) {
  return async (request, response) => {
    if (request.method === "OPTIONS") {
      response.writeHead(204, CORS_HEADERS);
      response.end();
      return;
    }
    if (!["GET", "POST", "DELETE"].includes(request.method ?? "")) {
      json(response, 405, { error: "Method not allowed" });
      return;
    }

    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    if (await handlePushRoute(request, response, url, pushService)) return;
    if (request.method !== "GET") {
      json(response, 405, { error: "Method not allowed" });
      return;
    }

    if (url.pathname === "/health") {
      json(response, stormFeed.snapshot ? 200 : 503, {
        ok: Boolean(stormFeed.snapshot),
        status: stormFeed.snapshot?.status ?? "unavailable",
        stormCount: stormFeed.snapshot?.storms?.length ?? 0,
        lastAttemptAt: stormFeed.lastAttemptAt,
        lastSuccessfulFetchAt: stormFeed.snapshot?.source?.fetchedAt ?? null,
        lastError: stormFeed.lastError,
        storage: await repository.health(),
        push: {
          configuredSubscriptions: pushService.subscriptions.length,
          deliveryEnabled: pushService.deliveryEnabled,
        },
      });
      return;
    }
    if (await handleStormRoute(response, url, stormFeed, alertService)) return;
    if (await handleSatelliteRoute(response, url)) return;
    json(response, 404, { error: "Not found", routes: ROUTES });
  };
}

