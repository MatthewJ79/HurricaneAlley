export type ThemeMode = "light" | "dark";

export type ScreenName =
  | "home"
  | "track"
  | "data"
  | "alerts"
  | "prepare"
  | "advisory"
  | "kit";

export type TabName = Extract<
  ScreenName,
  "home" | "track" | "data" | "alerts" | "prepare"
>;

export type ForecastPoint = {
  time: string;
  category: "H4" | "H3" | "H2" | "TS";
  position: string;
  wind: string;
  interpolated?: boolean;
};

export type ModelAid = {
  name: string;
  aid: string;
  color: string;
  wind: string;
  distance: string;
  age: string;
};

export type LiveStorm = {
  id: string;
  name: string;
  basin: string;
  classificationCode: string;
  classification: string;
  wind: { knots: number | null; mph: number | null };
  pressureMb: number | null;
  center: {
    latitude: number | null;
    longitude: number | null;
    displayLatitude: string | null;
    displayLongitude: string | null;
  };
  movement: {
    directionDegrees: number | null;
    speedKnots: number | null;
    speedMph: number | null;
  };
  updatedAt: string | null;
  products: Record<
    | "publicAdvisory"
    | "forecastAdvisory"
    | "forecastDiscussion"
    | "windSpeedProbabilities"
    | "forecastTrack"
    | "trackCone"
    | "windWatchesWarnings"
    | "initialWindExtent"
    | "forecastWindRadii"
    | "bestTrack"
    | "earliestTropicalStormWinds"
    | "mostLikelyTropicalStormWinds"
    | "stormSurgeWatchWarning"
    | "potentialStormSurgeFlooding",
    {
      advisoryNumber: string | null;
      issuedAt: string | null;
      updatedAt: string | null;
      url: string | null;
      zipUrl: string | null;
      kmzUrl: string | null;
    } | null
  >;
  officialCone?: {
    advisoryNumber: string | null;
    issuedAt: string | null;
    sourceUrl: string;
    feature: {
      type: "Feature";
      properties: {
        source: string;
        product: string;
      };
      geometry:
        | {
            type: "Polygon";
            coordinates: number[][][];
          }
        | {
            type: "MultiPolygon";
            coordinates: number[][][][];
          };
    };
  } | null;
  forecastPoints?: Array<{
    validAt: string | null;
    latitude: number;
    longitude: number;
    windKnots: number;
    windMph: number;
    status: string | null;
  }>;
  modelGuidance?: {
    source: string;
    sourceUrl: string;
    cycleAt: string | null;
    aids: Array<{
      aid: string;
      name: string;
      kind: string;
      points: Array<{
        forecastHour: number;
        validAt: string | null;
        latitude: number;
        longitude: number;
        windKnots: number | null;
        windMph: number | null;
        pressureMb: number | null;
      }>;
    }>;
  } | null;
};

export type StormFeedStatus =
  | "loading"
  | "live"
  | "cached"
  | "unavailable";

export type StormFeedState = {
  status: StormFeedStatus;
  storms: LiveStorm[];
  fetchedAt: string | null;
  error: string | null;
};
