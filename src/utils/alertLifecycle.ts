import type {
  AlertLifecycleEvent,
  AlertSnapshot,
  OfficialAlert,
} from "../types";

function alertFingerprint(alert: OfficialAlert) {
  return JSON.stringify({
    event: alert.event,
    headline: alert.headline,
    description: alert.description,
    instruction: alert.instruction,
    areaDescription: alert.areaDescription,
    severity: alert.severity,
    urgency: alert.urgency,
    certainty: alert.certainty,
    status: alert.status,
    messageType: alert.messageType,
    response: alert.response,
    effectiveAt: alert.effectiveAt,
    onsetAt: alert.onsetAt,
    expiresAt: alert.expiresAt,
    endsAt: alert.endsAt,
  });
}

function isExpired(alert: OfficialAlert, now: Date) {
  const expiration = alert.endsAt ?? alert.expiresAt;
  if (!expiration) return false;
  const time = new Date(expiration).getTime();
  return Number.isFinite(time) && time <= now.getTime();
}

function lifecycleEvent(
  kind: AlertLifecycleEvent["kind"],
  alert: OfficialAlert,
  observedAt: string,
): AlertLifecycleEvent {
  return { kind, alertId: alert.id, event: alert.event, observedAt };
}

export function classifyAlertLifecycle(
  previousSnapshot: AlertSnapshot | null,
  currentAlerts: OfficialAlert[],
  now = new Date(),
) {
  if (!previousSnapshot) return [];

  const observedAt = now.toISOString();
  const previousById = new Map(
    previousSnapshot.alerts.map((alert) => [alert.id, alert]),
  );
  const currentRelatedIds = new Set<string>();
  const events: AlertLifecycleEvent[] = [];

  for (const current of currentAlerts) {
    const directlyPrevious = previousById.get(current.id);
    const referencedPrevious = current.references
      .map((id) => previousById.get(id))
      .find((alert): alert is OfficialAlert => Boolean(alert));
    const previous = directlyPrevious ?? referencedPrevious;
    if (previous) currentRelatedIds.add(previous.id);

    if (current.messageType?.toLowerCase() === "cancel") {
      events.push(lifecycleEvent("cancelled", current, observedAt));
    } else if (!previous) {
      events.push(lifecycleEvent("new", current, observedAt));
    } else if (
      current.id !== previous.id ||
      alertFingerprint(current) !== alertFingerprint(previous)
    ) {
      events.push(lifecycleEvent("updated", current, observedAt));
    }
  }

  for (const previous of previousSnapshot.alerts) {
    if (
      !currentRelatedIds.has(previous.id) &&
      !currentAlerts.some((alert) => alert.id === previous.id) &&
      isExpired(previous, now)
    ) {
      events.push(lifecycleEvent("expired", previous, observedAt));
    }
  }

  return events;
}

export function buildAlertSnapshot(
  previousSnapshot: AlertSnapshot | null,
  currentAlerts: OfficialAlert[],
  fetchedAt: string,
  now = new Date(),
): AlertSnapshot {
  if (!previousSnapshot) return { alerts: currentAlerts, fetchedAt };

  const replacedIds = new Set(
    currentAlerts.flatMap((alert) => [alert.id, ...alert.references]),
  );
  const retained = previousSnapshot.alerts.filter(
    (alert) => !replacedIds.has(alert.id) && !isExpired(alert, now),
  );
  return { alerts: [...currentAlerts, ...retained], fetchedAt };
}
