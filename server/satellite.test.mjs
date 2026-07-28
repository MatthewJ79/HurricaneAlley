import assert from "node:assert/strict";
import test from "node:test";
import { satelliteTileRequest } from "./satellite.mjs";

test("builds an allowlisted time-matched GOES tile request", () => {
  const request = satelliteTileRequest({
    source: "west",
    time: "2026-07-27T21%3A00%3A00Z",
    zoom: "4",
    row: "7",
    column: "2",
  });

  assert.equal(request.immutable, true);
  assert.match(request.url, /GOES-West_ABI_GeoColor/);
  assert.match(request.url, /2026-07-27T21:00:00Z/);
});

test("rejects unknown layers and out-of-range coordinates", () => {
  assert.equal(
    satelliteTileRequest({
      source: "other",
      time: "latest",
      zoom: "4",
      row: "7",
      column: "2",
    }),
    null,
  );
  assert.equal(
    satelliteTileRequest({
      source: "west",
      time: "latest",
      zoom: "4",
      row: "18",
      column: "2",
    }),
    null,
  );
});
