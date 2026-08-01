import { strFromU8 } from "fflate";
import { DOMParser } from "@xmldom/xmldom";
import { fetchKmzEntries, parseCoordinateList } from "./shared.mjs";

export function parseConeKml(kml) {
  const document = new DOMParser().parseFromString(kml, "application/xml");
  if (document.getElementsByTagName("parsererror").length > 0) {
    throw new TypeError("NHC cone KML is not valid XML");
  }
  const polygons = Array.from(document.getElementsByTagName("Polygon"))
    .map((polygon) => {
      const outer = polygon.getElementsByTagName("outerBoundaryIs")[0]
        ?.getElementsByTagName("coordinates")[0]?.textContent;
      if (!outer) return null;
      const rings = [parseCoordinateList(outer)];
      for (const boundary of Array.from(polygon.getElementsByTagName("innerBoundaryIs"))) {
        const coordinates = boundary.getElementsByTagName("coordinates")[0]?.textContent;
        if (coordinates) rings.push(parseCoordinateList(coordinates));
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
    geometry: polygons.length === 1
      ? { type: "Polygon", coordinates: polygons[0] }
      : { type: "MultiPolygon", coordinates: polygons },
  };
}

export async function enrichStormCone(storm, { fetchImpl = fetch, signal } = {}) {
  const product = storm.products.trackCone;
  const url = product?.kmzUrl;
  if (!url) return { ...storm, officialCone: null };
  const { entries, kmlName } = await fetchKmzEntries(url, "cone", { fetchImpl, signal });
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

