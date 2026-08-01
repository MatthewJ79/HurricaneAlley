const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const SEVERITY_RANK = {
  Extreme: 0,
  Severe: 1,
  Moderate: 2,
  Minor: 3,
  Unknown: 4,
};

export function preferenceAllowsEvent(subscription, lifecycleEvent) {
  if (
    lifecycleEvent.kind !== "new" &&
    !subscription.preferences.includeUpdates
  ) {
    return false;
  }
  if (["cancelled", "expired"].includes(lifecycleEvent.kind)) return true;
  const threshold = subscription.preferences.minimumSeverity;
  if (threshold === "Any") return true;
  return (
    (SEVERITY_RANK[lifecycleEvent.alert.severity] ?? 5) <=
    (SEVERITY_RANK[threshold] ?? 1)
  );
}

export function pushMessageForEvent(subscription, lifecycleEvent) {
  const alert = lifecycleEvent.alert;
  const verb = {
    new: "New",
    updated: "Updated",
    cancelled: "Cancelled",
    expired: "Expired",
  }[lifecycleEvent.kind];
  const ended = ["cancelled", "expired"].includes(lifecycleEvent.kind);
  const instruction = alert.instruction ?? alert.headline ?? alert.description;
  const body = ended
    ? `${subscription.place.name}: this ${alert.event} was ${lifecycleEvent.kind}. Review current official conditions.`
    : instruction
      ? `${subscription.place.name}: ${String(instruction).replace(/\s+/g, " ").slice(0, 180)}`
      : `${subscription.place.name} is associated with this official alert.`;
  const expirationTime = new Date(alert.endsAt ?? alert.expiresAt ?? "").getTime();
  const message = {
    to: subscription.pushToken,
    sound: "default",
    channelId: "official-alerts",
    title: `${verb}: ${alert.event}`,
    body,
    priority: ["Extreme", "Severe"].includes(alert.severity)
      ? "high"
      : "default",
    data: {
      screen: "my-area",
      placeId: subscription.place.id,
      alertId: alert.id,
      lifecycle: lifecycleEvent.kind,
      sourceUrl: alert.sourceUrl,
    },
  };
  if (!ended && Number.isFinite(expirationTime)) {
    message.expiration = Math.floor(expirationTime / 1000);
  }
  return message;
}

export async function sendExpoPushMessages(
  messages,
  { fetchImpl = fetch, signal } = {},
) {
  if (messages.length === 0) return [];
  const response = await fetchImpl(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Expo push service returned HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload?.data)) {
    throw new TypeError("Expo push service returned an invalid response");
  }
  return payload.data;
}
