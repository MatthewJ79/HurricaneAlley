import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeNwsAlerts,
  parseAlertPoint,
} from "./nws-alerts.mjs";

test("validates an alert lookup point", () => {
  assert.deepEqual(parseAlertPoint("25.7617", "-80.1918"), {
    latitude: 25.7617,
    longitude: -80.1918,
  });
  assert.throws(() => parseAlertPoint("91", "-80"), /valid latitude/);
  assert.throws(() => parseAlertPoint("25", "west"), /valid latitude/);
  assert.throws(() => parseAlertPoint(null, null), /valid latitude/);
});

test("normalizes official NWS alert fields needed for lifecycle handling", () => {
  const result = normalizeNwsAlerts(
    {
      features: [
        {
          id: "https://api.weather.gov/alerts/abc",
          properties: {
            event: "Hurricane Warning",
            headline: "Hurricane Warning issued July 31",
            description: "Hurricane conditions are expected.",
            instruction: "Follow evacuation instructions from local officials.",
            areaDesc: "Coastal Test County",
            severity: "Extreme",
            urgency: "Immediate",
            certainty: "Likely",
            status: "Actual",
            messageType: "Alert",
            sent: "2026-07-31T12:00:00-04:00",
            expires: "2026-08-01T00:00:00-04:00",
            senderName: "NWS Miami FL",
            affectedZones: ["https://api.weather.gov/zones/forecast/FLZ001"],
            references: ["prior-alert-id"],
          },
        },
      ],
    },
    { latitude: 25.7617, longitude: -80.1918 },
    new Date("2026-07-31T16:01:00.000Z"),
  );

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].event, "Hurricane Warning");
  assert.equal(result.alerts[0].severity, "Extreme");
  assert.equal(result.alerts[0].senderName, "NWS Miami FL");
  assert.deepEqual(result.alerts[0].references, ["prior-alert-id"]);
  assert.equal(result.source.fetchedAt, "2026-07-31T16:01:00.000Z");
});

test("rejects malformed NWS alert envelopes", () => {
  assert.throws(
    () => normalizeNwsAlerts({}, { latitude: 25, longitude: -80 }),
    /missing features/,
  );
});
