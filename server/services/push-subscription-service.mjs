import { runAlertMonitor } from "../alert-monitor.mjs";
import { fetchPointAlerts } from "../nws-alerts.mjs";
import { sendExpoPushMessages } from "../push-delivery.mjs";
import {
  findAuthorizedSubscription,
  publicSubscriptionStatus,
  readPushSubscriptions,
  removePushSubscription,
  upsertPushSubscription,
  writePushSubscriptions,
} from "../push-store.mjs";
import { withRequestTimeout } from "../lib/timeout.mjs";

export class PushSubscriptionService {
  subscriptions = [];
  monitorInFlight = null;

  constructor({ deliveryEnabled = false, timeoutMs = 15_000, logger = console } = {}) {
    this.deliveryEnabled = deliveryEnabled;
    this.timeoutMs = timeoutMs;
    this.logger = logger;
  }

  async initialize() {
    this.subscriptions = await readPushSubscriptions();
    if (this.deliveryEnabled) void this.refreshMonitor();
  }

  async register(input) {
    const result = upsertPushSubscription(this.subscriptions, input);
    this.subscriptions = result.subscriptions;
    await writePushSubscriptions(this.subscriptions);
    if (this.deliveryEnabled) void this.refreshMonitor();
    return {
      statusCode: result.managementSecret ? 201 : 200,
      body: {
        subscription: publicSubscriptionStatus(result.subscription, this.deliveryEnabled),
        managementSecret: result.managementSecret,
      },
    };
  }

  status(id, secret) {
    const subscription = findAuthorizedSubscription(this.subscriptions, id, secret);
    return subscription
      ? publicSubscriptionStatus(subscription, this.deliveryEnabled)
      : null;
  }

  async remove(id, secret) {
    const result = removePushSubscription(this.subscriptions, id, secret);
    this.subscriptions = result.subscriptions;
    await writePushSubscriptions(this.subscriptions);
    return result.removed;
  }

  async refreshMonitor() {
    if (!this.deliveryEnabled || this.monitorInFlight) return this.monitorInFlight;
    this.monitorInFlight = runAlertMonitor(this.subscriptions, {
      deliveryEnabled: true,
      fetchAlerts: ({ latitude, longitude }) => withRequestTimeout(
        (signal) => fetchPointAlerts({ latitude, longitude, signal }),
        this.timeoutMs,
      ),
      sendMessages: (messages) => withRequestTimeout(
        (signal) => sendExpoPushMessages(messages, { signal }),
        Math.max(30_000, this.timeoutMs),
      ),
    })
      .then(async (subscriptions) => {
        this.subscriptions = subscriptions;
        await writePushSubscriptions(subscriptions);
      })
      .catch((error) => this.logger.error(`[Push] Monitor failed: ${error.message}`))
      .finally(() => {
        this.monitorInFlight = null;
      });
    return this.monitorInFlight;
  }
}

