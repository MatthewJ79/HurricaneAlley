import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeCurrentStorms,
  normalizeStorm,
  parseAtcfAidDeck,
  parseConeKml,
  parseForecastAdvisory,
  parseWindRadiiKml,
} from "./nhc.mjs";

const rawStorm = {
  id: "ep072026",
  name: "Genevieve",
  classification: "HU",
  intensity: "120",
  pressure: "947",
  latitude: "13.9N",
  longitude: "110.3W",
  latitudeNumeric: 13.9,
  longitudeNumeric: -110.3,
  movementDir: 295,
  movementSpeed: 14,
  lastUpdate: "2026-07-26T21:00:00.000Z",
  forecastTrack: {
    advNum: "010",
    issuance: "2026-07-26T21:00:00.000Z",
    zipFile: "https://example.test/track.zip",
  },
};

test("normalizes NHC units and product links", () => {
  const storm = normalizeStorm(rawStorm);

  assert.equal(storm.id, "ep072026");
  assert.equal(storm.basin, "Eastern Pacific");
  assert.equal(storm.classification, "Hurricane");
  assert.equal(storm.wind.knots, 120);
  assert.equal(storm.wind.mph, 138);
  assert.equal(storm.movement.speedMph, 16);
  assert.equal(storm.products.forecastTrack.advisoryNumber, "010");
  assert.equal(
    storm.products.forecastTrack.zipUrl,
    "https://example.test/track.zip",
  );
});

test("normalizes the current storms envelope", () => {
  const result = normalizeCurrentStorms(
    { activeStorms: [rawStorm] },
    new Date("2026-07-26T22:00:00.000Z"),
  );

  assert.equal(result.storms.length, 1);
  assert.equal(result.source.fetchedAt, "2026-07-26T22:00:00.000Z");
});

test("rejects malformed NHC responses", () => {
  assert.throws(
    () => normalizeCurrentStorms({ storms: [] }),
    /missing activeStorms/,
  );
});

test("parses official forecast and outlook points", () => {
  const advisory = `
    <pre>
    FORECAST VALID 27/0600Z 14.8N 111.7W
    MAX WIND 130 KT...GUSTS 160 KT.

    OUTLOOK VALID 31/1800Z 22.0N 128.7W...POST-TROP/REMNT LOW
    MAX WIND  55 KT...GUSTS  65 KT.
    </pre>
  `;
  const points = parseForecastAdvisory(
    advisory,
    "2026-07-26T21:00:00.000Z",
  );

  assert.equal(points.length, 2);
  assert.deepEqual(points[0], {
    validAt: "2026-07-27T06:00:00.000Z",
    latitude: 14.8,
    longitude: -111.7,
    windKnots: 130,
    windMph: 150,
    status: null,
  });
  assert.equal(points[1].status, "...POST-TROP/REMNT LOW");
});

test("parses the official NHC KML cone polygon without deriving geometry", () => {
  const feature = parseConeKml(`<?xml version="1.0"?>
    <kml><Document><Placemark><Polygon><outerBoundaryIs><LinearRing>
      <coordinates>
        -81.0,24.0,0 -80.0,24.0,0 -80.0,25.0,0 -81.0,24.0,0
      </coordinates>
    </LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>`);

  assert.equal(feature.geometry.type, "Polygon");
  assert.deepEqual(feature.geometry.coordinates[0], [
    [-81, 24],
    [-80, 24],
    [-80, 25],
    [-81, 24],
  ]);
  assert.equal(feature.properties.source, "NOAA National Hurricane Center");
});

test("groups official NHC wind radii by forecast position and threshold", () => {
  const frames = parseWindRadiiKml(`<?xml version="1.0"?>
    <kml><Document><Folder>
      <Placemark><name>34</name><Polygon><outerBoundaryIs><LinearRing>
        <coordinates>-82,24 -80,24 -80,26 -82,24</coordinates>
      </LinearRing></outerBoundaryIs></Polygon></Placemark>
      <Placemark><name>50</name><Polygon><outerBoundaryIs><LinearRing>
        <coordinates>-81.5,24.5 -80.5,24.5 -80.5,25.5 -81.5,24.5</coordinates>
      </LinearRing></outerBoundaryIs></Polygon></Placemark>
      <Placemark><name>64</name><Polygon><outerBoundaryIs><LinearRing>
        <coordinates>-81.2,24.8 -80.8,24.8 -80.8,25.2 -81.2,24.8</coordinates>
      </LinearRing></outerBoundaryIs></Polygon></Placemark>
      <Placemark><name>34</name><Polygon><outerBoundaryIs><LinearRing>
        <coordinates>-84,26 -82,26 -82,28 -84,26</coordinates>
      </LinearRing></outerBoundaryIs></Polygon></Placemark>
    </Folder></Document></kml>`);

  assert.equal(frames.length, 2);
  assert.deepEqual(
    frames[0].map((zone) => zone.thresholdKnots),
    [34, 50, 64],
  );
  assert.equal(frames[1][0].thresholdMph, 39);
  assert.equal(frames[1][0].feature.geometry.type, "Polygon");
});

test("parses the latest official ATCF public guidance cycle", () => {
  const guidance = parseAtcfAidDeck(
    [
      "EP, 06, 2026072618, 03, HFAI,  72, 180N, 1300W, 90, 970",
      "EP, 06, 2026072700, 03, HFAI,   0, 150N, 1150W, 95, 965",
      "EP, 06, 2026072700, 03, HFAI,  72, 185N, 1310W, 80, 975",
      "EP, 06, 2026072700, 03, HFAI,  72, 185N, 1310W, 80, 975",
      "EP, 06, 2026072700, 03, TVCN,  72, 190N, 1305W,  0,   0",
      "EP, 06, 2026072700, 03, TEST,  72, 190N, 1305W, 80, 980",
    ].join("\n"),
    "ep062026",
  );

  assert.equal(guidance.cycleAt, "2026-07-27T00:00:00.000Z");
  assert.equal(guidance.aids.length, 2);
  assert.equal(guidance.aids[0].aid, "HFAI");
  assert.equal(guidance.aids[0].points.length, 2);
  assert.deepEqual(guidance.aids[0].points[1], {
    forecastHour: 72,
    validAt: "2026-07-30T00:00:00.000Z",
    latitude: 18.5,
    longitude: -131,
    windKnots: 80,
    windMph: 92,
    pressureMb: 975,
  });
});
