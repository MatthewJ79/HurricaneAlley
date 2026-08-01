import { decodeHtml, knotsToMph } from "./shared.mjs";

function signedCoordinate(value, hemisphere) {
  const numeric = Number(value);
  return hemisphere === "S" || hemisphere === "W" ? -numeric : numeric;
}

function advisoryTimeToIso(advisoryTime, referenceTime) {
  const match = advisoryTime.match(/^(\d{2})\/(\d{2})(\d{2})Z$/);
  if (!match) return null;
  const reference = new Date(referenceTime);
  if (Number.isNaN(reference.getTime())) return null;
  const candidate = new Date(Date.UTC(
    reference.getUTCFullYear(),
    reference.getUTCMonth(),
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ));
  const difference = candidate.getTime() - reference.getTime();
  if (difference < -15 * 24 * 60 * 60 * 1000) {
    candidate.setUTCMonth(candidate.getUTCMonth() + 1);
  } else if (difference > 15 * 24 * 60 * 60 * 1000) {
    candidate.setUTCMonth(candidate.getUTCMonth() - 1);
  }
  return candidate.toISOString();
}

export function parseForecastAdvisory(html, referenceTime) {
  const text = decodeHtml(html);
  const pattern = /(?:FORECAST|OUTLOOK) VALID\s+(\d{2}\/\d{4}Z)\s+(\d+(?:\.\d+)?)\s*([NS])\s+(\d+(?:\.\d+)?)\s*([EW])([^\n]*)\n\s*MAX WIND\s+(\d+)\s+KT/gi;
  const points = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const windKnots = Number(match[7]);
    points.push({
      validAt: advisoryTimeToIso(match[1], referenceTime),
      latitude: signedCoordinate(match[2], match[3]),
      longitude: signedCoordinate(match[4], match[5]),
      windKnots,
      windMph: knotsToMph(windKnots),
      status: match[6].trim() || null,
    });
  }
  return points;
}

export async function enrichStormForecast(storm, { fetchImpl = fetch, signal } = {}) {
  const url = storm.products.forecastAdvisory?.url;
  if (!url) return { ...storm, forecastPoints: [] };
  const response = await fetchImpl(url, {
    headers: {
      Accept: "text/html,text/plain",
      "User-Agent": "HurricaneAlley/0.1 contact=local-development",
    },
    signal,
  });
  if (!response.ok) {
    throw new Error(`NHC forecast advisory returned HTTP ${response.status}`);
  }
  return {
    ...storm,
    forecastPoints: parseForecastAdvisory(await response.text(), storm.updatedAt),
  };
}

