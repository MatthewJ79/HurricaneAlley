import http from "node:http";
import { createStormRepository } from "./repositories/index.mjs";
import { createRequestHandler } from "./routes/request-handler.mjs";
import { PointAlertService } from "./services/point-alert-service.mjs";
import { PushSubscriptionService } from "./services/push-subscription-service.mjs";
import { StormFeedService } from "./services/storm-feed-service.mjs";

const config = {
  port: Number(process.env.PORT ?? 8787),
  stormPollMs: Number(process.env.NHC_POLL_INTERVAL_MS ?? 120_000),
  requestTimeoutMs: Number(process.env.NHC_REQUEST_TIMEOUT_MS ?? 15_000),
  alertCacheTtlMs: Number(process.env.NWS_ALERT_CACHE_TTL_MS ?? 60_000),
  pushPollMs: Number(process.env.PUSH_MONITOR_INTERVAL_MS ?? 60_000),
  pushEnabled: process.env.PUSH_DELIVERY_ENABLED === "true",
};

async function start() {
  const repository = createStormRepository();
  const stormFeed = new StormFeedService(repository, {
    timeoutMs: config.requestTimeoutMs,
  });
  const alertService = new PointAlertService({
    cacheTtlMs: config.alertCacheTtlMs,
    timeoutMs: config.requestTimeoutMs,
  });
  const pushService = new PushSubscriptionService({
    deliveryEnabled: config.pushEnabled,
    timeoutMs: config.requestTimeoutMs,
  });

  await Promise.all([stormFeed.initialize(), pushService.initialize()]);
  setInterval(() => void stormFeed.refresh(), config.stormPollMs).unref();
  if (config.pushEnabled) {
    setInterval(() => void pushService.refreshMonitor(), config.pushPollMs).unref();
  }

  const server = http.createServer(
    createRequestHandler({ repository, stormFeed, alertService, pushService }),
  );
  server.listen(config.port, "0.0.0.0", () => {
    console.log(`Hurricane Alley API listening on http://localhost:${config.port}`);
    console.log(`NHC poll interval: ${config.stormPollMs}ms`);
    console.log(`Storage mode: ${repository.mode}`);
  });

  const shutdown = (signal) => {
    console.log(`Received ${signal}; shutting down`);
    server.close(() => void repository.close());
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
