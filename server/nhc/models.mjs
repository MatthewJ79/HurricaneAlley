import { gunzipSync } from "node:zlib";
import {
  knotsToMph,
  MAX_ADECK_BYTES,
  MAX_ADECK_OUTPUT_BYTES,
} from "./shared.mjs";

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

function atcfCoordinate(value) {
  const match = String(value).trim().match(/^(\d+)([NSEW])$/i);
  if (!match) return null;
  const numeric = Number(match[1]) / 10;
  return ["S", "W"].includes(match[2].toUpperCase()) ? -numeric : numeric;
}

function atcfCycleToIso(value) {
  const match = String(value).match(/^(\d{4})(\d{2})(\d{2})(\d{2})$/);
  if (!match) return null;
  return new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
  )).toISOString();
}

export function parseAtcfAidDeck(text, stormId) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.split(",").map((field) => field.trim()))
    .filter((fields) => fields.length >= 10 && /^\d{10}$/.test(fields[2]));
  const latestCycle = rows.map((fields) => fields[2]).sort().at(-1);
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
    if (!Number.isFinite(forecastHour) || forecastHour < 0 || latitude === null || longitude === null) continue;
    if (!aids.has(aid)) {
      aids.set(aid, { aid, name: metadata[0], kind: metadata[1], points: new Map() });
    }
    const model = aids.get(aid);
    if (!model.points.has(forecastHour)) {
      model.points.set(forecastHour, {
        forecastHour,
        validAt: Number.isFinite(cycleTime)
          ? new Date(cycleTime + forecastHour * 3_600_000).toISOString()
          : null,
        latitude,
        longitude,
        windKnots: Number.isFinite(windKnots) && windKnots > 0 ? windKnots : null,
        windMph: Number.isFinite(windKnots) && windKnots > 0 ? knotsToMph(windKnots) : null,
        pressureMb: Number.isFinite(pressureMb) && pressureMb > 0 ? pressureMb : null,
      });
    }
  }
  return {
    source: "NOAA National Hurricane Center ATCF public aid deck",
    sourceUrl: `https://ftp.nhc.noaa.gov/atcf/aid_public/a${stormId}.dat.gz`,
    cycleAt,
    aids: [...aids.values()].map((model) => ({
      aid: model.aid,
      name: model.name,
      kind: model.kind,
      points: [...model.points.values()].sort((left, right) => left.forecastHour - right.forecastHour),
    })).filter((model) => model.points.length > 0),
  };
}

export async function enrichStormModels(storm, { fetchImpl = fetch, signal } = {}) {
  if (!/^(?:al|ep|cp)\d{6}$/i.test(storm.id)) return { ...storm, modelGuidance: null };
  const url = `https://ftp.nhc.noaa.gov/atcf/aid_public/a${storm.id}.dat.gz`;
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/gzip,application/octet-stream",
      "User-Agent": "HurricaneAlley/0.1 contact=local-development",
    },
    signal,
  });
  if (!response.ok) throw new Error(`NHC ATCF aid deck returned HTTP ${response.status}`);
  const compressed = new Uint8Array(await response.arrayBuffer());
  if (compressed.byteLength > MAX_ADECK_BYTES) {
    throw new Error("NHC ATCF aid deck exceeds the configured size limit");
  }
  const text = gunzipSync(compressed, { maxOutputLength: MAX_ADECK_OUTPUT_BYTES }).toString("utf8");
  return { ...storm, modelGuidance: parseAtcfAidDeck(text, storm.id) };
}

