import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAlertSnapshot,
  classifyAlertLifecycle,
} from "../src/utils/alertLifecycle.ts";

function alert(overrides = {}) {
  return {
    id: "alert-1",
    event: "Hurricane Warning",
    headline: "Warning headline",
    description: "Dangerous conditions expected.",
    instruction: "Follow instructions from local officials.",
    areaDescription: "Test County",
    severity: "Extreme",
    urgency: "Immediate",
    certainty: "Likely",
    status: "Actual",
    messageType: "Alert",
    response: "Evacuate",
    category: ["Met"],
    sentAt: "2026-07-31T12:00:00.000Z",
    effectiveAt: "2026-07-31T12:00:00.000Z",
    onsetAt: "2026-07-31T18:00:00.000Z",
    expiresAt: "2026-08-01T12:00:00.000Z",
    endsAt: null,
    senderName: "NWS Test",
    sourceUrl: "https://api.weather.gov/alerts/alert-1",
    affectedZones: [],
    references: [],
    ...overrides,
  };
}

test("first retrieval establishes a baseline without generating notifications", () => {
  assert.deepEqual(classifyAlertLifecycle(null, [alert()]), []);
});

test("classifies new and changed alerts", () => {
  const snapshot = { alerts: [alert()], fetchedAt: "2026-07-31T12:01:00.000Z" };
  const events = classifyAlertLifecycle(
    snapshot,
    [alert({ instruction: "Evacuate now." }), alert({ id: "alert-2", event: "Flash Flood Warning" })],
    new Date("2026-07-31T13:00:00.000Z"),
  );
  assert.deepEqual(events.map((event) => event.kind), ["updated", "new"]);
});

test("uses CAP references to classify replacement messages and cancellations", () => {
  const snapshot = { alerts: [alert()], fetchedAt: "2026-07-31T12:01:00.000Z" };
  const update = alert({ id: "alert-2", messageType: "Update", references: ["alert-1"] });
  const cancel = alert({ id: "alert-3", messageType: "Cancel", references: ["alert-1"] });
  assert.equal(classifyAlertLifecycle(snapshot, [update])[0]?.kind, "updated");
  assert.equal(classifyAlertLifecycle(snapshot, [cancel])[0]?.kind, "cancelled");
});

test("only declares a missing prior alert expired after its official expiration", () => {
  const prior = alert({ expiresAt: "2026-07-31T14:00:00.000Z" });
  const snapshot = { alerts: [prior], fetchedAt: "2026-07-31T12:01:00.000Z" };
  assert.deepEqual(
    classifyAlertLifecycle(snapshot, [], new Date("2026-07-31T13:00:00.000Z")),
    [],
  );
  assert.equal(
    classifyAlertLifecycle(snapshot, [], new Date("2026-07-31T15:00:00.000Z"))[0]?.kind,
    "expired",
  );
});

test("retains an unseen unexpired alert until its official expiration", () => {
  const prior = alert({ expiresAt: "2026-07-31T14:00:00.000Z" });
  const snapshot = { alerts: [prior], fetchedAt: "2026-07-31T12:01:00.000Z" };
  assert.equal(
    buildAlertSnapshot(snapshot, [], "2026-07-31T13:00:00.000Z", new Date("2026-07-31T13:00:00.000Z")).alerts.length,
    1,
  );
  assert.equal(
    buildAlertSnapshot(snapshot, [], "2026-07-31T15:00:00.000Z", new Date("2026-07-31T15:00:00.000Z")).alerts.length,
    0,
  );
});
