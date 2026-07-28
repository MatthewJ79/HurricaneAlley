import type { LiveStorm } from "../types";

type Coordinate = [number, number];

export function coneCrossSections(storm: LiveStorm): Coordinate[][] {
  if (
    !storm.officialCone ||
    storm.center.latitude === null ||
    storm.center.longitude === null
  ) {
    return [];
  }

  const geometry = storm.officialCone.feature.geometry;
  const rings: number[][][] =
    geometry.type === "Polygon"
      ? [geometry.coordinates[0] ?? []]
      : geometry.coordinates.map((polygon) => polygon[0] ?? []);
  const track: Coordinate[] = [
    [storm.center.longitude, storm.center.latitude],
    ...(storm.forecastPoints ?? []).map(
      (point) => [point.longitude, point.latitude] as Coordinate,
    ),
  ];

  return track.slice(1).flatMap((point, forecastIndex) => {
    const trackIndex = forecastIndex + 1;
    const previous = track[trackIndex - 1] ?? point;
    const next = track[trackIndex + 1] ?? point;
    const latitudeScale = Math.max(
      0.2,
      Math.cos((point[1] * Math.PI) / 180),
    );
    const direction = {
      x: longitudeNear(next[0], point[0]) * latitudeScale -
        longitudeNear(previous[0], point[0]) * latitudeScale,
      y: next[1] - previous[1],
    };
    const length = Math.hypot(direction.x, direction.y);
    if (length < 1e-6) return [];

    const perpendicular = {
      x: -direction.y / length,
      y: direction.x / length,
    };
    const intersections: number[] = [];

    for (const ring of rings) {
      for (let index = 0; index < ring.length - 1; index += 1) {
        const start = projected(ring[index], point, latitudeScale);
        const end = projected(ring[index + 1], point, latitudeScale);
        if (!start || !end) continue;
        const segment = { x: end.x - start.x, y: end.y - start.y };
        const denominator = cross(perpendicular, segment);
        if (Math.abs(denominator) < 1e-9) continue;

        const lineDistance = cross(start, segment) / denominator;
        const segmentDistance = cross(start, perpendicular) / denominator;
        if (segmentDistance >= 0 && segmentDistance <= 1) {
          intersections.push(lineDistance);
        }
      }
    }

    const negative = intersections
      .filter((value) => value <= 0)
      .sort((left, right) => right - left)[0];
    const positive = intersections
      .filter((value) => value >= 0)
      .sort((left, right) => left - right)[0];
    if (negative === undefined || positive === undefined) return [];

    return [
      [
        unproject(negative, perpendicular, point, latitudeScale),
        unproject(positive, perpendicular, point, latitudeScale),
      ],
    ];
  });
}

function longitudeNear(longitude: number, reference: number) {
  let adjusted = longitude;
  while (adjusted - reference > 180) adjusted -= 360;
  while (adjusted - reference < -180) adjusted += 360;
  return adjusted;
}

function projected(
  coordinate: number[] | undefined,
  center: Coordinate,
  latitudeScale: number,
) {
  if (!coordinate || coordinate.length < 2) return null;
  const longitude = coordinate[0];
  const latitude = coordinate[1];
  if (longitude === undefined || latitude === undefined) return null;
  return {
    x:
      (longitudeNear(longitude, center[0]) - center[0]) *
      latitudeScale,
    y: latitude - center[1],
  };
}

function unproject(
  distance: number,
  direction: { x: number; y: number },
  center: Coordinate,
  latitudeScale: number,
): Coordinate {
  return [
    center[0] + (distance * direction.x) / latitudeScale,
    center[1] + distance * direction.y,
  ];
}

function cross(
  left: { x: number; y: number },
  right: { x: number; y: number },
) {
  return left.x * right.y - left.y * right.x;
}
