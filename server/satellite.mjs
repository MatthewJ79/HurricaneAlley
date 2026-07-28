const GIBS_BASE =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
const MAX_CACHE_ENTRIES = 320;
const tileCache = new Map();
const tileRequests = new Map();

const LAYERS = {
  east: "GOES-East_ABI_GeoColor",
  west: "GOES-West_ABI_GeoColor",
};

export function satelliteTileRequest({
  source,
  time,
  zoom,
  row,
  column,
}) {
  const layer = LAYERS[source];
  const z = Number(zoom);
  const y = Number(row);
  const x = Number(column);
  const decodedTime = decodeURIComponent(time);
  const validTime =
    decodedTime === "latest" ||
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/.test(decodedTime);
  const limit = Number.isInteger(z) ? 2 ** z : 0;

  if (
    !layer ||
    !validTime ||
    !Number.isInteger(z) ||
    z < 0 ||
    z > 7 ||
    !Number.isInteger(y) ||
    y < 0 ||
    y >= limit ||
    !Number.isInteger(x) ||
    x < 0 ||
    x >= limit
  ) {
    return null;
  }

  const timePath = decodedTime === "latest" ? "" : `${decodedTime}/`;
  return {
    cacheKey: `${source}/${decodedTime}/${z}/${y}/${x}`,
    immutable: decodedTime !== "latest",
    url:
      `${GIBS_BASE}/${layer}/default/${timePath}` +
      `GoogleMapsCompatible_Level7/${z}/${y}/${x}.png`,
  };
}

export async function getSatelliteTile(request, { signal } = {}) {
  const cached = tileCache.get(request.cacheKey);
  if (cached) {
    tileCache.delete(request.cacheKey);
    tileCache.set(request.cacheKey, cached);
    return { ...cached, cacheStatus: "HIT" };
  }

  if (tileRequests.has(request.cacheKey)) {
    const shared = await tileRequests.get(request.cacheKey);
    return { ...shared, cacheStatus: "HIT" };
  }

  const pending = (async () => {
    const response = await fetch(request.url, {
      headers: {
        "User-Agent": "Hurricane-Alley/0.1 satellite-cache",
      },
      signal,
    });
    if (!response.ok) {
      throw new Error(`NASA GIBS tile returned ${response.status}`);
    }

    const tile = {
      body: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") ?? "image/png",
    };
    tileCache.set(request.cacheKey, tile);
    while (tileCache.size > MAX_CACHE_ENTRIES) {
      const oldest = tileCache.keys().next().value;
      if (oldest === undefined) break;
      tileCache.delete(oldest);
    }
    return tile;
  })();

  tileRequests.set(request.cacheKey, pending);
  try {
    const tile = await pending;
    return { ...tile, cacheStatus: "MISS" };
  } finally {
    tileRequests.delete(request.cacheKey);
  }
}

export async function prewarmStormSatelliteTiles(storms) {
  const requests = [];
  for (const storm of storms) {
    const time = observationTime(storm.updatedAt);
    const source =
      storm.center?.longitude !== null && storm.center.longitude < -105
        ? "west"
        : "east";
    const points = [
      [storm.center?.longitude, storm.center?.latitude],
      ...(storm.forecastPoints ?? []).map((point) => [
        point.longitude,
        point.latitude,
      ]),
    ].filter(
      ([longitude, latitude]) =>
        Number.isFinite(longitude) && Number.isFinite(latitude),
    );
    const coordinates = new Set();

    for (const [longitude, latitude] of points) {
      for (const zoom of [4, 5]) {
        const [column, row] = webMercatorTile(longitude, latitude, zoom);
        coordinates.add(`${zoom}/${row}/${column}`);
      }
    }

    if (points[0]) {
      const [centerColumn, centerRow] = webMercatorTile(
        points[0][0],
        points[0][1],
        5,
      );
      for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
        for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
          coordinates.add(
            `5/${centerRow + yOffset}/${centerColumn + xOffset}`,
          );
        }
      }
    }

    for (const coordinate of coordinates) {
      const [zoom, row, column] = coordinate.split("/").map(Number);
      const request = satelliteTileRequest({
        source,
        time,
        zoom,
        row,
        column,
      });
      if (request) requests.push(request);
    }
  }

  for (let index = 0; index < requests.length; index += 4) {
    await Promise.allSettled(
      requests
        .slice(index, index + 4)
        .map((request) => getSatelliteTile(request)),
    );
  }
}

function observationTime(value) {
  if (!value) return "latest";
  const tenMinutes = 10 * 60 * 1000;
  return new Date(
    Math.floor(new Date(value).getTime() / tenMinutes) * tenMinutes,
  )
    .toISOString()
    .replace(".000", "");
}

function webMercatorTile(longitude, latitude, zoom) {
  const scale = 2 ** zoom;
  const column = Math.floor(((longitude + 180) / 360) * scale);
  const latitudeRadians = (latitude * Math.PI) / 180;
  const row = Math.floor(
    ((1 -
      Math.log(
        Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians),
      ) /
        Math.PI) /
      2) *
      scale,
  );
  return [column, row];
}
