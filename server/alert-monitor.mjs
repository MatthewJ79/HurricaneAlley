import { createHash } from "node:crypto";
import { fetchPointAlerts } from "./nws-alerts.mjs";
import {
  preferenceAllowsEvent,
  pushMessageForEvent,
  sendExpoPushMessages,
} from "./push-delivery.mjs";

function fingerprint(alert) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        id: alert.id,
        headline: alert.headline,
        description: alert.description,
        instruction: alert.instruction,
        severity: alert.severity,
        urgency: alert.urgency,
        messageType: alert.messageType,
        expiresAt: alert.expiresAt,
      }),
    )
    .digest("hex");
}

function expired(alert, now) {
  const value = alert.endsAt ?? alert.expiresAt;
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time <= now.getTime();
}

export function classifyServerLifecycle(previousSnapshot, currentAlerts, now = new Date()) {
  if (!previousSnapshot) return [];
  const previousById = new Map(previousSnapshot.alerts.map((alert) => [alert.id, alert]));
  const related = new Set();
  const events = [];
  for (const alert of currentAlerts) {
    const previous = previousById.get(alert.id) ?? alert.references
      .map((id) => previousById.get(id))
      .find(Boolean);
    if (previous) related.add(previous.id);
    let kind = null;
    if (alert.messageType?.toLowerCase() === "cancel") kind = "cancelled";
    else if (!previous) kind = "new";
    else if (alert.id !== previous.id || fingerprint(alert) !== fingerprint(previous)) kind = "updated";
    if (kind) events.push({ kind, alert, key: `${kind}:${alert.id}:${fingerprint(alert)}` });
  }
  for (const alert of previousSnapshot.alerts) {
    if (!related.has(alert.id) && !currentAlerts.some((item) => item.id === alert.id) && expired(alert, now)) {
      events.push({ kind: "expired", alert, key: `expired:${alert.id}:${alert.expiresAt ?? alert.endsAt}` });
    }
  }
  return events;
}

export function nextServerSnapshot(previousSnapshot, currentAlerts, fetchedAt, now = new Date()) {
  if (!previousSnapshot) return { alerts: currentAlerts, fetchedAt };
  const replaced = new Set(currentAlerts.flatMap((alert) => [alert.id, ...alert.references]));
  const retained = previousSnapshot.alerts.filter((alert) => !replaced.has(alert.id) && !expired(alert, now));
  return { alerts: [...currentAlerts, ...retained], fetchedAt };
}

function pointKey(subscription) {
  return `${subscription.place.latitude.toFixed(4)},${subscription.place.longitude.toFixed(4)}`;
}

export async function runAlertMonitor(subscriptions, {
  deliveryEnabled,
  fetchAlerts = fetchPointAlerts,
  sendMessages = sendExpoPushMessages,
  now = new Date(),
} = {}) {
  if (!deliveryEnabled || subscriptions.length === 0) return subscriptions;
  const pointResults = new Map();

  for (const subscription of subscriptions) {
    const key = pointKey(subscription);
    if (!pointResults.has(key)) {
      try {
        pointResults.set(key, {
          data: await fetchAlerts({
            latitude: subscription.place.latitude,
            longitude: subscription.place.longitude,
          }),
          error: null,
        });
      } catch (error) {
        pointResults.set(key, {
          data: null,
          error: String(error?.message ?? error),
        });
      }
    }
    const pointResult = pointResults.get(key);
    if (pointResult.error) {
      subscription.lastCheckAt = now.toISOString();
      subscription.lastError = pointResult.error;
      continue;
    }
    const result = pointResult.data;
    const events = classifyServerLifecycle(subscription.lastSnapshot, result.alerts, now)
      .filter((event) => preferenceAllowsEvent(subscription, event));
    const existingKeys = new Set(subscription.pendingEvents.map((event) => event.key));
    subscription.pendingEvents.push(...events.filter((event) => !existingKeys.has(event.key)));
    subscription.lastSnapshot = nextServerSnapshot(
      subscription.lastSnapshot,
      result.alerts,
      result.source.fetchedAt,
      now,
    );
    subscription.lastCheckAt = now.toISOString();
    subscription.lastError = null;
  }

  for (const subscription of subscriptions) {
    if (subscription.pendingEvents.length === 0) continue;
    try {
      const tickets = await sendMessages(
        subscription.pendingEvents.map((event) => pushMessageForEvent(subscription, event)),
      );
      const retained = subscription.pendingEvents.filter(
        (_event, index) => tickets[index]?.status !== "ok",
      );
      subscription.pendingEvents = retained;
      subscription.lastDeliveryAt = now.toISOString();
      subscription.lastError = retained.length
        ? "One or more push messages were rejected"
        : null;
    } catch (error) {
      subscription.lastError = String(error?.message ?? error);
    }
  }
  return subscriptions;
}
