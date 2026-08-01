const NWS_ALERTS_URL = "https://api.weather.gov/alerts/active";

function textOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string")
    : [];
}

function alertReferences(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      typeof item === "string" ? item : textOrNull(item?.identifier),
    )
    .filter(Boolean);
}

export function parseAlertPoint(latitudeValue, longitudeValue) {
  if (
    latitudeValue === null ||
    latitudeValue === undefined ||
    longitudeValue === null ||
    longitudeValue === undefined ||
    String(latitudeValue).trim() === "" ||
    String(longitudeValue).trim() === ""
  ) {
    throw new TypeError("A valid latitude and longitude are required");
  }
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new TypeError("A valid latitude and longitude are required");
  }
  return { latitude, longitude };
}

export function normalizeNwsAlert(feature) {
  const properties = feature?.properties ?? {};
  return {
    id: textOrNull(properties.id) ?? textOrNull(feature?.id) ?? "unknown",
    event: textOrNull(properties.event) ?? "Weather alert",
    headline: textOrNull(properties.headline),
    description: textOrNull(properties.description),
    instruction: textOrNull(properties.instruction),
    areaDescription: textOrNull(properties.areaDesc),
    severity: textOrNull(properties.severity) ?? "Unknown",
    urgency: textOrNull(properties.urgency) ?? "Unknown",
    certainty: textOrNull(properties.certainty) ?? "Unknown",
    status: textOrNull(properties.status),
    messageType: textOrNull(properties.messageType),
    response: textOrNull(properties.response),
    category: stringList(properties.category),
    sentAt: textOrNull(properties.sent),
    effectiveAt: textOrNull(properties.effective),
    onsetAt: textOrNull(properties.onset),
    expiresAt: textOrNull(properties.expires),
    endsAt: textOrNull(properties.ends),
    senderName: textOrNull(properties.senderName) ?? "National Weather Service",
    sourceUrl: textOrNull(properties.web) ?? textOrNull(feature?.id),
    affectedZones: stringList(properties.affectedZones),
    references: alertReferences(properties.references),
  };
}

export function normalizeNwsAlerts(payload, point, fetchedAt = new Date()) {
  if (!payload || !Array.isArray(payload.features)) {
    throw new TypeError("NWS alerts response is missing features");
  }

  return {
    source: {
      name: "NOAA National Weather Service",
      url: `${NWS_ALERTS_URL}?point=${encodeURIComponent(
        `${point.latitude},${point.longitude}`,
      )}`,
      fetchedAt: fetchedAt.toISOString(),
    },
    location: point,
    alerts: payload.features.map(normalizeNwsAlert),
  };
}

export async function fetchPointAlerts({
  latitude,
  longitude,
  fetchImpl = fetch,
  signal,
} = {}) {
  const point = parseAlertPoint(latitude, longitude);
  const url = `${NWS_ALERTS_URL}?point=${encodeURIComponent(
    `${point.latitude},${point.longitude}`,
  )}`;
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": "HurricaneAlley/0.1 (hurricanealley.app)",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`NWS alerts service returned HTTP ${response.status}`);
  }

  return normalizeNwsAlerts(await response.json(), point);
}
