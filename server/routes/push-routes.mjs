import { bearerSecret, json, readJsonBody } from "../lib/http.mjs";

const SUBSCRIPTION_PATH = /^\/v1\/push\/subscriptions\/([a-f0-9-]+)$/i;

export async function handlePushRoute(request, response, url, service) {
  if (url.pathname === "/v1/push/subscriptions" && request.method === "POST") {
    try {
      const result = await service.register(await readJsonBody(request));
      json(response, result.statusCode, result.body);
    } catch (error) {
      json(response, error.statusCode ?? 400, { error: error.message });
    }
    return true;
  }

  const match = url.pathname.match(SUBSCRIPTION_PATH);
  if (!match) return false;
  if (request.method === "GET") {
    const subscription = service.status(match[1], bearerSecret(request));
    json(
      response,
      subscription ? 200 : 404,
      subscription ? { subscription } : { error: "Subscription not found" },
    );
    return true;
  }
  if (request.method === "DELETE") {
    try {
      const removed = await service.remove(match[1], bearerSecret(request));
      json(response, removed ? 200 : 404, { removed });
    } catch (error) {
      json(response, error.statusCode ?? 400, { error: error.message });
    }
    return true;
  }
  return false;
}

