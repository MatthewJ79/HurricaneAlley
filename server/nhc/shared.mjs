export const NHC_CURRENT_STORMS_URL =
  "https://www.nhc.noaa.gov/CurrentStorms.json";
export const MAX_KMZ_BYTES = 5 * 1024 * 1024;
export const MAX_ADECK_BYTES = 5 * 1024 * 1024;
export const MAX_ADECK_OUTPUT_BYTES = 25 * 1024 * 1024;

export function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function knotsToMph(knots) {
  return knots === null ? null : Math.round(knots * 1.15078);
}

export function decodeHtml(html) {
  const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  return (preMatch?.[1] ?? html)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\r/g, "");
}

export function parseCoordinateList(value) {
  return value
    .trim()
    .split(/\s+/)
    .map((coordinate) => coordinate.split(",").slice(0, 2).map(Number))
    .filter(
      (coordinate) =>
        coordinate.length === 2 &&
        Number.isFinite(coordinate[0]) &&
        Number.isFinite(coordinate[1]),
    );
}

export async function fetchKmzEntries(url, label, { fetchImpl, signal }) {
  const { unzipSync } = await import("fflate");
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/vnd.google-earth.kmz,application/zip",
      "User-Agent": "HurricaneAlley/0.1 contact=local-development",
    },
    signal,
  });
  if (!response.ok) throw new Error(`NHC ${label} KMZ returned HTTP ${response.status}`);
  const compressed = new Uint8Array(await response.arrayBuffer());
  if (compressed.byteLength > MAX_KMZ_BYTES) {
    throw new Error(`NHC ${label} KMZ exceeds the configured size limit`);
  }
  const entries = unzipSync(compressed);
  const kmlName = Object.keys(entries).find((name) => name.toLowerCase().endsWith(".kml"));
  if (!kmlName) throw new Error(`NHC ${label} KMZ does not contain a KML file`);
  return { entries, kmlName };
}

