import { strFromU8 } from "fflate";
import { DOMParser } from "@xmldom/xmldom";
import {
  fetchKmzEntries,
  knotsToMph,
  parseCoordinateList,
} from "./shared.mjs";

function polygonGeometry(polygon) {
  const outer = polygon.getElementsByTagName("outerBoundaryIs")[0]
    ?.getElementsByTagName("coordinates")[0]?.textContent;
  if (!outer) return null;
  const rings = [parseCoordinateList(outer)];
  for (const boundary of Array.from(polygon.getElementsByTagName("innerBoundaryIs"))) {
    const coordinates = boundary.getElementsByTagName("coordinates")[0]?.textContent;
    if (coordinates) rings.push(parseCoordinateList(coordinates));
  }
  return rings.every((ring) => ring.length >= 4) ? rings : null;
}

export function parseWindRadiiKml(kml) {
  const document = new DOMParser().parseFromString(kml, "application/xml");
  if (document.getElementsByTagName("parsererror").length > 0) {
    throw new TypeError("NHC wind-radii KML is not valid XML");
  }
  const frames = [];
  let previousThreshold = null;
  for (const placemark of Array.from(document.getElementsByTagName("Placemark"))) {
    const thresholdKnots = Number(
      placemark.getElementsByTagName("name")[0]?.textContent?.trim(),
    );
    if (![34, 50, 64].includes(thresholdKnots)) continue;
    if (previousThreshold !== null && thresholdKnots <= previousThreshold) frames.push([]);
    if (frames.length === 0) frames.push([]);
    previousThreshold = thresholdKnots;
    const polygons = Array.from(placemark.getElementsByTagName("Polygon"))
      .map(polygonGeometry)
      .filter(Boolean);
    if (polygons.length === 0) continue;
    frames.at(-1).push({
      thresholdKnots,
      thresholdMph: knotsToMph(thresholdKnots),
      feature: {
        type: "Feature",
        properties: {
          source: "NOAA National Hurricane Center",
          product: "Official forecast wind radii",
          thresholdKnots,
        },
        geometry: polygons.length === 1
          ? { type: "Polygon", coordinates: polygons[0] }
          : { type: "MultiPolygon", coordinates: polygons },
      },
    });
  }
  const populated = frames.filter((zones) => zones.length > 0);
  if (populated.length === 0) {
    throw new TypeError("NHC wind-radii KML does not contain wind zones");
  }
  return populated;
}

export async function enrichStormWindFields(
  storm,
  { fetchImpl = fetch, signal } = {},
) {
  const product = storm.products.forecastWindRadii;
  const url = product?.kmzUrl;
  if (!url) return { ...storm, officialWindFields: null };
  const { entries, kmlName } = await fetchKmzEntries(url, "wind-radii", {
    fetchImpl,
    signal,
  });
  const zoneFrames = parseWindRadiiKml(strFromU8(entries[kmlName]));
  const positions = [
    {
      validAt: storm.updatedAt,
      latitude: storm.center.latitude,
      longitude: storm.center.longitude,
    },
    ...(storm.forecastPoints ?? []),
  ];
  const issuedTime = product.issuedAt
    ? new Date(product.issuedAt).getTime()
    : Number.NaN;
  return {
    ...storm,
    officialWindFields: {
      advisoryNumber: product.advisoryNumber,
      issuedAt: product.issuedAt,
      sourceUrl: url,
      frames: zoneFrames.map((zones, index) => {
        const position = positions[index];
        const validTime = position?.validAt
          ? new Date(position.validAt).getTime()
          : Number.NaN;
        return {
          forecastHour: Number.isFinite(issuedTime) && Number.isFinite(validTime)
            ? Math.max(0, Math.round((validTime - issuedTime) / 3_600_000))
            : index === 0 ? 0 : null,
          validAt: position?.validAt ?? null,
          center: {
            latitude: position?.latitude ?? null,
            longitude: position?.longitude ?? null,
          },
          zones,
        };
      }),
    },
  };
}

