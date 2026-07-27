import { strFromU8, unzipSync } from "fflate";
import { DOMParser } from "@xmldom/xmldom";
import { gunzipSync } from "node:zlib";

export const NHC_CURRENT_STORMS_URL =
  "https://www.nhc.noaa.gov/CurrentStorms.json";

const MAX_KMZ_BYTES = 5 * 1024 * 1024;
const MAX_ADECK_BYTES = 5 * 1024 * 1024;
const MAX_ADECK_OUTPUT_BYTES = 25 * 1024 * 1024;

const PUBLIC_AID_NAMES = {
  AEMI: ["GEFS Ensemble Mean", "Track + intensity"],
  AVNI: ["GFS Interpolated", "Track + intensity"],
  CTCI: ["COAMPS-TC Interpolated", "Track + intensity"],
  GDMI: ["Google DeepMind Ensemble Mean", "Track + intensity"],
  HCCA: ["HFIP Corrected Consensus", "Track + intensity"],
  HFAI: ["HAFS-A Interpolated", "Track + intensity"],
  HFBI: ["HAFS-B Interpolated", "Track + intensity"],
  HMNI: ["HMON Interpolated", "Track + intensity"],
  HWFI: ["HWRF Interpolated", "Track + intensity"],
  IVCN: ["NHC Intensity Consensus", "Intensity consensus"],
  NNIC: ["Neural Network Intensity Consensus", "Intensity consensus"],
  TVCN: ["NHC Track Consensus", "Track consensus"],
};

const CLASSIFICATIONS = {
  DB: "Disturbance",
  EX: "Extratropical Cyclone",
  HU: "Hurricane",
  LO: "Low",
  PT: "Post-Tropical Cyclone",
  SD: "Subtropical Depression",
  SS: "Subtropical Storm",
  ST: "Super Typhoon",
  TD: "Tropical Depression",
  TS: "Tropical Storm",
  TY: "Typhoon",
};

const BASINS = {
  al: "North Atlantic",
  cp: "Central Pacific",
  ep: "Eastern Pacific",
};

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function knotsToMph(knots) {
  return knots === null ? null : Math.round(knots * 1.15078);
}

function decodeHtml(html) {
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

function signedCoordinate(value, hemisphere) {
  const numeric = Number(value);
  return hemisphere === "S" || hemisphere === "W" ? -numeric : numeric;
}

function advisoryTimeToIso(advisoryTime, referenceTime) {
  const match = advisoryTime.match(/^(\d{2})\/(\d{2})(\d{2})Z$/);
  if (!match) return null;

  const reference = new Date(referenceTime);
  if (Number.isNaN(reference.getTime())) return null;

  const day = Number(match[1]);
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  const candidate = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      day,
      hour,
      minute,
    ),
  );

  if (candidate.getTime() - reference.getTime() < -15 * 24 * 60 * 60 * 1000) {
    candidate.setUTCMonth(candidate.getUTCMonth() + 1);
  } else if (
    candidate.getTime() - reference.getTime() >
    15 * 24 * 60 * 60 * 1000
  ) {
    candidate.setUTCMonth(candidate.getUTCMonth() - 1);
  }

  return candidate.toISOString();
}

function normalizeProduct(product) {
  if (!product || typeof product !== "object") return null;

  return {
    advisoryNumber: product.advNum ?? null,
    issuedAt: product.issuance ?? null,
    updatedAt: product.fileUpdateTime ?? null,
    url: product.url ?? null,
    zipUrl: product.zipFile ?? null,
    kmzUrl: product.kmzFile ?? null,
  };
}

export function normalizeStorm(raw) {
  const windKnots = numberOrNull(raw.intensity);
  const movementKnots = numberOrNull(raw.movementSpeed);
  const classificationCode = raw.classification ?? "DB";
  const id = String(raw.id ?? "").toLowerCase();
  const basinCode = id.slice(0, 2);

  return {
    id,
    name: raw.name ?? "Unnamed",
    basin: BASINS[basinCode] ?? "Unknown basin",
    classificationCode,
    classification:
      CLASSIFICATIONS[classificationCode] ?? classificationCode,
    wind: {
      knots: windKnots,
      mph: knotsToMph(windKnots),
    },
    pressureMb: numberOrNull(raw.pressure),
    center: {
      latitude: numberOrNull(raw.latitudeNumeric),
      longitude: numberOrNull(raw.longitudeNumeric),
      displayLatitude: raw.latitude ?? null,
      displayLongitude: raw.longitude ?? null,
    },
    movement: {
      directionDegrees: numberOrNull(raw.movementDir),
      speedKnots: movementKnots,
      speedMph: knotsToMph(movementKnots),
    },
    updatedAt: raw.lastUpdate ?? null,
    products: {
      publicAdvisory: normalizeProduct(raw.publicAdvisory),
      forecastAdvisory: normalizeProduct(raw.forecastAdvisory),
      forecastDiscussion: normalizeProduct(raw.forecastDiscussion),
      windSpeedProbabilities: normalizeProduct(raw.windSpeedProbabilities),
      forecastTrack: normalizeProduct(raw.forecastTrack),
      trackCone: normalizeProduct(raw.trackCone),
      windWatchesWarnings: normalizeProduct(raw.windWatchesWarnings),
      initialWindExtent: normalizeProduct(raw.initialWindExtent),
      forecastWindRadii: normalizeProduct(raw.forecastWindRadiiGIS),
      bestTrack: normalizeProduct(raw.bestTrackGIS),
      earliestTropicalStormWinds: normalizeProduct(
        raw.earliestArrivalTimeTSWindsGIS,
      ),
      mostLikelyTropicalStormWinds: normalizeProduct(
        raw.mostLikelyTimeTSWindsGIS,
      ),
      stormSurgeWatchWarning: normalizeProduct(
        raw.stormSurgeWatchWarningGIS,
      ),
      potentialStormSurgeFlooding: normalizeProduct(
        raw.potentialStormSurgeFloodingGIS,
      ),
    },
  };
}

export function normalizeCurrentStorms(payload, fetchedAt = new Date()) {
  if (!payload || !Array.isArray(payload.activeStorms)) {
    throw new TypeError("NHC response is missing activeStorms");
  }

  return {
    source: {
      name: "NOAA National Hurricane Center",
      url: NHC_CURRENT_STORMS_URL,
      fetchedAt: fetchedAt.toISOString(),
    },
    storms: payload.activeStorms.map(normalizeStorm),
  };
}

export function parseForecastAdvisory(html, referenceTime) {
  const text = decodeHtml(html);
  const pointPattern =
    /(?:FORECAST|OUTLOOK) VALID\s+(\d{2}\/\d{4}Z)\s+(\d+(?:\.\d+)?)\s*([NS])\s+(\d+(?:\.\d+)?)\s*([EW])([^\n]*)\n\s*MAX WIND\s+(\d+)\s+KT/gi;
  const points = [];
  let match;

  while ((match = pointPattern.exec(text)) !== null) {
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

function atcfCoordinate(value) {
  const match = String(value).trim().match(/^(\d+)([NSEW])$/i);
  if (!match) return null;
  const numeric = Number(match[1]) / 10;
  return match[2].toUpperCase() === "S" || match[2].toUpperCase() === "W"
    ? -numeric
    : numeric;
}

function atcfCycleToIso(value) {
  const match = String(value).match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})$/,
  );
  if (!match) return null;
  return new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
    ),
  ).toISOString();
}

export function parseAtcfAidDeck(text, stormId) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.split(",").map((field) => field.trim()))
    .filter((fields) => fields.length >= 10 && /^\d{10}$/.test(fields[2]));
  const cycles = rows.map((fields) => fields[2]).sort();
  const latestCycle = cycles.at(-1);
  if (!latestCycle) {
    throw new TypeError("NHC ATCF aid deck does not contain forecast records");
  }

  const cycleAt = atcfCycleToIso(latestCycle);
  const cycleTime = cycleAt ? new Date(cycleAt).getTime() : Number.NaN;
  const aids = new Map();

  for (const fields of rows) {
    if (fields[2] !== latestCycle) continue;
    const aid = fields[4].toUpperCase();
    const metadata = PUBLIC_AID_NAMES[aid];
    if (!metadata) continue;

    const forecastHour = Number(fields[5]);
    const latitude = atcfCoordinate(fields[6]);
    const longitude = atcfCoordinate(fields[7]);
    const windKnots = Number(fields[8]);
    const pressureMb = Number(fields[9]);
    if (
      !Number.isFinite(forecastHour) ||
      forecastHour < 0 ||
      latitude === null ||
      longitude === null
    ) {
      continue;
    }

    if (!aids.has(aid)) {
      aids.set(aid, {
        aid,
        name: metadata[0],
        kind: metadata[1],
        points: new Map(),
      });
    }

    const model = aids.get(aid);
    if (!model.points.has(forecastHour)) {
      model.points.set(forecastHour, {
        forecastHour,
        validAt: Number.isFinite(cycleTime)
          ? new Date(cycleTime + forecastHour * 60 * 60 * 1000).toISOString()
          : null,
        latitude,
        longitude,
        windKnots:
          Number.isFinite(windKnots) && windKnots > 0 ? windKnots : null,
        windMph:
          Number.isFinite(windKnots) && windKnots > 0
            ? knotsToMph(windKnots)
            : null,
        pressureMb:
          Number.isFinite(pressureMb) && pressureMb > 0 ? pressureMb : null,
      });
    }
  }

  return {
    source: "NOAA National Hurricane Center ATCF public aid deck",
    sourceUrl: `https://ftp.nhc.noaa.gov/atcf/aid_public/a${stormId}.dat.gz`,
    cycleAt,
    aids: [...aids.values()]
      .map((model) => ({
        aid: model.aid,
        name: model.name,
        kind: model.kind,
        points: [...model.points.values()].sort(
          (left, right) => left.forecastHour - right.forecastHour,
        ),
      }))
      .filter((model) => model.points.length > 0),
  };
}

export async function enrichStormModels(
  storm,
  { fetchImpl = fetch, signal } = {},
) {
  if (!/^(?:al|ep|cp)\d{6}$/i.test(storm.id)) {
    return { ...storm, modelGuidance: null };
  }

  const url = `https://ftp.nhc.noaa.gov/atcf/aid_public/a${storm.id}.dat.gz`;
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/gzip,application/octet-stream",
      "User-Agent": "HurricaneAlley/0.1 contact=local-development",
    },
    signal,
  });
  if (!response.ok) {
    throw new Error(`NHC ATCF aid deck returned HTTP ${response.status}`);
  }

  const compressed = new Uint8Array(await response.arrayBuffer());
  if (compressed.byteLength > MAX_ADECK_BYTES) {
    throw new Error("NHC ATCF aid deck exceeds the configured size limit");
  }

  const text = gunzipSync(compressed, {
    maxOutputLength: MAX_ADECK_OUTPUT_BYTES,
  }).toString("utf8");
  return {
    ...storm,
    modelGuidance: parseAtcfAidDeck(text, storm.id),
  };
}

function parseCoordinateList(value) {
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

export function parseConeKml(kml) {
  const document = new DOMParser().parseFromString(kml, "application/xml");
  const parserErrors = document.getElementsByTagName("parsererror");
  if (parserErrors.length > 0) {
    throw new TypeError("NHC cone KML is not valid XML");
  }

  const polygons = Array.from(document.getElementsByTagName("Polygon"))
    .map((polygon) => {
      const outerBoundary = polygon.getElementsByTagName("outerBoundaryIs")[0];
      const outerCoordinates =
        outerBoundary?.getElementsByTagName("coordinates")[0]?.textContent;
      if (!outerCoordinates) return null;

      const rings = [parseCoordinateList(outerCoordinates)];
      const innerBoundaries = Array.from(
        polygon.getElementsByTagName("innerBoundaryIs"),
      );
      for (const innerBoundary of innerBoundaries) {
        const innerCoordinates =
          innerBoundary.getElementsByTagName("coordinates")[0]?.textContent;
        if (innerCoordinates) rings.push(parseCoordinateList(innerCoordinates));
      }

      return rings.every((ring) => ring.length >= 4) ? rings : null;
    })
    .filter(Boolean);

  if (polygons.length === 0) {
    throw new TypeError("NHC cone KML does not contain polygon geometry");
  }

  return {
    type: "Feature",
    properties: {
      source: "NOAA National Hurricane Center",
      product: "Official forecast cone of uncertainty",
    },
    geometry:
      polygons.length === 1
        ? { type: "Polygon", coordinates: polygons[0] }
        : { type: "MultiPolygon", coordinates: polygons },
  };
}

export async function enrichStormCone(
  storm,
  { fetchImpl = fetch, signal } = {},
) {
  const product = storm.products.trackCone;
  const url = product?.kmzUrl;
  if (!url) return { ...storm, officialCone: null };

  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/vnd.google-earth.kmz,application/zip",
      "User-Agent": "HurricaneAlley/0.1 contact=local-development",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`NHC cone KMZ returned HTTP ${response.status}`);
  }

  const compressed = new Uint8Array(await response.arrayBuffer());
  if (compressed.byteLength > MAX_KMZ_BYTES) {
    throw new Error("NHC cone KMZ exceeds the configured size limit");
  }

  const entries = unzipSync(compressed);
  const kmlName = Object.keys(entries).find((name) =>
    name.toLowerCase().endsWith(".kml"),
  );
  if (!kmlName) throw new Error("NHC cone KMZ does not contain a KML file");

  return {
    ...storm,
    officialCone: {
      advisoryNumber: product.advisoryNumber,
      issuedAt: product.issuedAt,
      sourceUrl: url,
      feature: parseConeKml(strFromU8(entries[kmlName])),
    },
  };
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

  const forecastPoints = parseForecastAdvisory(
    await response.text(),
    storm.updatedAt,
  );
  return { ...storm, forecastPoints };
}

export async function fetchCurrentStorms({
  fetchImpl = fetch,
  signal,
  etag,
  lastModified,
} = {}) {
  const headers = {
    Accept: "application/json",
    "User-Agent": "HurricaneAlley/0.1 contact=local-development",
  };

  if (etag) headers["If-None-Match"] = etag;
  if (lastModified) headers["If-Modified-Since"] = lastModified;

  const response = await fetchImpl(NHC_CURRENT_STORMS_URL, {
    headers,
    signal,
  });

  if (response.status === 304) {
    return { notModified: true };
  }

  if (!response.ok) {
    throw new Error(`NHC returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  return {
    notModified: false,
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
    data: normalizeCurrentStorms(payload),
    raw: payload,
  };
}
