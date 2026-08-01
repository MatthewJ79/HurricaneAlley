import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizePushSubscription,
  removePushSubscription,
  upsertPushSubscription,
} from "./push-store.mjs";
import {
  preferenceAllowsEvent,
  pushMessageForEvent,
} from "./push-delivery.mjs";
import { runAlertMonitor } from "./alert-monitor.mjs";

const registration = {
  installationId: "installation-123",
  pushToken: "ExponentPushToken[test-token]",
  platform: "android",
  place: {
    id: "home",
    name: "Home",
    latitude: 25.7617,
    longitude: -80.1918,
  },
  preferences: { minimumSeverity: "Severe", includeUpdates: true },
};

function officialAlert(overrides = {}) {
  return {
    id: "alert-1",
    event: "Hurricane Warning",
    headline: "Hurricane Warning issued",
    description: "Hurricane conditions are expected.",
    instruction: "Follow instructions from local officials.",
    areaDescription: "Test County",
    severity: "Extreme",
    urgency: "Immediate",
    certainty: "Likely",
    status: "Actual",
    messageType: "Alert",
    response: "Evacuate",
    sentAt: "2026-07-31T12:00:00.000Z",
    effectiveAt: "2026-07-31T12:00:00.000Z",
    onsetAt: null,
    expiresAt: "2026-08-01T12:00:00.000Z",
    endsAt: null,
    senderName: "NWS Miami FL",
    sourceUrl: "https://api.weather.gov/alerts/alert-1",
    affectedZones: [],
    references: [],
    ...overrides,
  };
}

test("validates and creates an authenticated push subscription", () => {
  assert.equal(normalizePushSubscription(registration).place.name, "Home");
  const created = upsertPushSubscription([], registration, new Date("2026-07-31T12:00:00Z"));
  assert.equal(created.subscriptions.length, 1);
  assert.ok(created.managementSecret);
  assert.equal(created.subscription.lastSnapshot, null);

  const removed = removePushSubscription(
    created.subscriptions,
    created.subscription.id,
    created.managementSecret,
  );
  assert.equal(removed.removed, true);
  assert.equal(removed.subscriptions.length, 0);
});

test("rejects invalid tokens and unauthorized subscription changes", () => {
  assert.throws(
    () => normalizePushSubscription({ ...registration, pushToken: "not-a-token" }),
    /Expo push token/,
  );
  const created = upsertPushSubscription([], registration);
  assert.throws(
    () => upsertPushSubscription(created.subscriptions, {
      ...registration,
      subscriptionId: created.subscription.id,
      managementSecret: "wrong-secret",
    }),
    /credentials/,
  );
});

test("applies severity preferences and creates action-oriented messages", () => {
  const subscription = {
    ...registration,
    preferences: { minimumSeverity: "Severe", includeUpdates: false },
  };
  const minor = { kind: "new", alert: officialAlert({ severity: "Minor" }) };
  const severe = { kind: "new", alert: officialAlert({ severity: "Severe" }) };
  const cancelled = { kind: "cancelled", alert: officialAlert() };
  assert.equal(preferenceAllowsEvent(subscription, minor), false);
  assert.equal(preferenceAllowsEvent(subscription, severe), true);
  assert.equal(preferenceAllowsEvent(subscription, cancelled), false);
  const message = pushMessageForEvent(subscription, severe);
  assert.equal(message.title, "New: Hurricane Warning");
  assert.match(message.body, /^Home:/);
  assert.equal(message.data.screen, "my-area");
  assert.equal(message.channelId, "official-alerts");
  assert.ok(message.expiration);

  const endedMessage = pushMessageForEvent(subscription, {
    kind: "expired",
    alert: officialAlert({ instruction: "Evacuate now." }),
  });
  assert.match(endedMessage.body, /was expired/);
  assert.doesNotMatch(endedMessage.body, /Evacuate now/);
  assert.equal(endedMessage.expiration, undefined);
});

test("monitor establishes a baseline, deduplicates points, then delivers updates", async () => {
  const created = upsertPushSubscription([], registration);
  const second = upsertPushSubscription(created.subscriptions, {
    ...registration,
    installationId: "installation-456",
    pushToken: "ExponentPushToken[second-token]",
    place: { ...registration.place, id: "work", name: "Work" },
  });
  let fetchCount = 0;
  let currentAlert = officialAlert();
  const fetchAlerts = async ({ latitude, longitude }) => {
    fetchCount += 1;
    return {
      source: { fetchedAt: "2026-07-31T12:00:00.000Z" },
      location: { latitude, longitude },
      alerts: [currentAlert],
    };
  };
  const sent = [];
  const sendMessages = async (messages) => {
    sent.push(...messages);
    return messages.map(() => ({ status: "ok", id: "ticket" }));
  };

  await runAlertMonitor(second.subscriptions, {
    deliveryEnabled: true,
    fetchAlerts,
    sendMessages,
    now: new Date("2026-07-31T12:01:00Z"),
  });
  assert.equal(fetchCount, 1);
  assert.equal(sent.length, 0);

  currentAlert = officialAlert({ instruction: "Evacuate now." });
  await runAlertMonitor(second.subscriptions, {
    deliveryEnabled: true,
    fetchAlerts,
    sendMessages,
    now: new Date("2026-07-31T12:02:00Z"),
  });
  assert.equal(fetchCount, 2);
  assert.equal(sent.length, 2);
  assert.equal(second.subscriptions[0].pendingEvents.length, 0);
});

test("monitor does no network work while delivery is disabled", async () => {
  const created = upsertPushSubscription([], registration);
  let called = false;
  await runAlertMonitor(created.subscriptions, {
    deliveryEnabled: false,
    fetchAlerts: async () => {
      called = true;
    },
  });
  assert.equal(called, false);
});
