import {
  knotsToMph,
  NHC_CURRENT_STORMS_URL,
  numberOrNull,
} from "./shared.mjs";

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
  return {
    id,
    name: raw.name ?? "Unnamed",
    basin: BASINS[id.slice(0, 2)] ?? "Unknown basin",
    classificationCode,
    classification: CLASSIFICATIONS[classificationCode] ?? classificationCode,
    wind: { knots: windKnots, mph: knotsToMph(windKnots) },
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
      earliestTropicalStormWinds: normalizeProduct(raw.earliestArrivalTimeTSWindsGIS),
      mostLikelyTropicalStormWinds: normalizeProduct(raw.mostLikelyTimeTSWindsGIS),
      stormSurgeWatchWarning: normalizeProduct(raw.stormSurgeWatchWarningGIS),
      potentialStormSurgeFlooding: normalizeProduct(raw.potentialStormSurgeFloodingGIS),
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

