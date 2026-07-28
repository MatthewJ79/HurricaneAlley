export function formatForecastTime(validAt: string | null) {
  if (!validAt) return "TIME TBD";

  const date = new Date(validAt);
  if (Number.isNaN(date.getTime())) return "TIME TBD";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: date.getMinutes() === 0 ? undefined : "2-digit",
  })
    .format(date)
    .replace(",", "")
    .toUpperCase();
}

export function forecastStrengthLabel({
  windKnots,
  windMph,
  status,
}: {
  windKnots: number;
  windMph: number;
  status: string | null;
}) {
  const normalizedStatus = status?.toUpperCase() ?? "";
  if (/POST-TROP|REMNT|REMNANT/.test(normalizedStatus)) {
    return `${windMph} MPH · REMNANT`;
  }

  let classification = "TD";
  if (windKnots >= 137) classification = "CAT 5";
  else if (windKnots >= 113) classification = "CAT 4";
  else if (windKnots >= 96) classification = "CAT 3";
  else if (windKnots >= 83) classification = "CAT 2";
  else if (windKnots >= 64) classification = "CAT 1";
  else if (windKnots >= 34) classification = "TS";

  return `${windMph} MPH · ${classification}`;
}

export function forecastPositionLabel(
  latitude: number,
  longitude: number,
) {
  const latitudeLabel = `${Math.abs(latitude).toFixed(1)}°${
    latitude >= 0 ? "N" : "S"
  }`;
  const longitudeLabel = `${Math.abs(longitude).toFixed(1)}°${
    longitude >= 0 ? "E" : "W"
  }`;
  return `${latitudeLabel} · ${longitudeLabel}`;
}
