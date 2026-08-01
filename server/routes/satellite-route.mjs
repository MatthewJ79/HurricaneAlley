import { getSatelliteTile, satelliteTileRequest } from "../satellite.mjs";
import { json } from "../lib/http.mjs";

const SATELLITE_PATH =
  /^\/v1\/satellite\/(east|west)\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\.png$/;

export async function handleSatelliteRoute(response, url) {
  const match = url.pathname.match(SATELLITE_PATH);
  if (!match) return false;
  const request = satelliteTileRequest({
    source: match[1],
    time: match[2],
    zoom: match[3],
    row: match[4],
    column: match[5],
  });
  if (!request) {
    json(response, 400, { error: "Invalid satellite tile request" });
    return true;
  }
  try {
    const tile = await getSatelliteTile(request);
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": request.immutable
        ? "public, max-age=86400, immutable"
        : "public, max-age=120",
      "Content-Length": tile.body.length,
      "Content-Type": tile.contentType,
      "X-Hurricane-Alley-Cache": tile.cacheStatus,
    });
    response.end(tile.body);
  } catch (error) {
    json(response, 502, {
      error: "Satellite imagery is temporarily unavailable",
      detail: error.message,
    });
  }
  return true;
}

