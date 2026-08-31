import { Readable } from "node:stream";

import { createRequestHandler } from "../../server/routes/request-handler.mjs";
import { PointAlertService } from "../../server/services/point-alert-service.mjs";
import { PushSubscriptionService } from "../../server/services/push-subscription-service.mjs";
import { StormFeedService } from "../../server/services/storm-feed-service.mjs";

class MemoryStormRepository {
  mode = "memory";
  snapshot = null;

  async readCurrentSnapshot() {
    return this.snapshot;
  }

  async writeCurrentSnapshot(snapshot) {
    this.snapshot = snapshot;
  }

  async health() {
    return { mode: this.mode, ok: true };
  }

  async close() {}
}

let requestHandlerPromise;

async function createNetlifyRequestHandler() {
  const repository = new MemoryStormRepository();
  const timeoutMs = Number(process.env.NHC_REQUEST_TIMEOUT_MS ?? 15_000);
  const stormFeed = new StormFeedService(repository, { timeoutMs });
  const alertService = new PointAlertService({
    cacheTtlMs: Number(process.env.NWS_ALERT_CACHE_TTL_MS ?? 60_000),
    timeoutMs,
  });
  const pushService = new PushSubscriptionService({
    deliveryEnabled: false,
    timeoutMs,
  });

  await Promise.all([stormFeed.initialize(), pushService.initialize()]);
  return createRequestHandler({ repository, stormFeed, alertService, pushService });
}

function getRequestHandler() {
  requestHandlerPromise ??= createNetlifyRequestHandler();
  return requestHandlerPromise;
}

function requestFromEvent(event) {
  const requestPath = event.path.replace(/^\/api(?=\/|$)/, "") || "/";
  const query = event.rawQuery ? `?${event.rawQuery}` : "";
  const body = event.body
    ? Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8")
    : Buffer.alloc(0);
  const request = Readable.from(body.length ? [body] : []);
  request.method = event.httpMethod;
  request.url = `${requestPath}${query}`;
  request.headers = {
    ...event.headers,
    host: event.headers?.host ?? "localhost",
  };
  return request;
}

function captureResponse() {
  let statusCode = 200;
  let headers = {};
  const chunks = [];

  return {
    writeHead(status, nextHeaders = {}) {
      statusCode = status;
      headers = nextHeaders;
    },
    end(chunk) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    },
    result() {
      const body = Buffer.concat(chunks);
      const contentType = headers["Content-Type"] ?? headers["content-type"] ?? "";
      const isText = contentType.includes("json") || contentType.startsWith("text/");
      return {
        statusCode,
        headers,
        body: isText ? body.toString("utf8") : body.toString("base64"),
        isBase64Encoded: !isText,
      };
    },
  };
}

export async function handler(event) {
  const requestHandler = await getRequestHandler();
  const response = captureResponse();
  await requestHandler(requestFromEvent(event), response);
  return response.result();
}
