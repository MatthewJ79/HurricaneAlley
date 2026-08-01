export type ThemeMode = "light" | "dark";

export type ScreenName =
  | "home"
  | "my-area"
  | "storm"
  | "prepare";

export type TabName = Extract<
  ScreenName,
  "home" | "my-area" | "prepare"
>;

export type SavedPlace = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  alertPreferences?: AlertPreferences;
  pushRegistration?: PushRegistration;
};

export type PushRegistration = {
  subscriptionId: string;
  managementSecret: string;
  deliveryEnabled: boolean;
  registeredAt: string;
};

export type AlertPreferences = {
  pushEnabledWhenAvailable: boolean;
  minimumSeverity: "Extreme" | "Severe" | "Moderate" | "Any";
  includeUpdates: boolean;
};

export type OfficialAlert = {
  id: string;
  event: string;
  headline: string | null;
  description: string | null;
  instruction: string | null;
  areaDescription: string | null;
  severity: string;
  urgency: string;
  certainty: string;
  status: string | null;
  messageType: string | null;
  response: string | null;
  category: string[];
  sentAt: string | null;
  effectiveAt: string | null;
  onsetAt: string | null;
  expiresAt: string | null;
  endsAt: string | null;
  senderName: string;
  sourceUrl: string | null;
  affectedZones: string[];
  references: string[];
};

export type AlertFeedState = {
  status: "idle" | "loading" | "live" | "cached" | "unavailable";
  stale: boolean;
  alerts: OfficialAlert[];
  fetchedAt: string | null;
  error: string | null;
  lifecycleEvents: AlertLifecycleEvent[];
};

export type AlertLifecycleKind = "new" | "updated" | "cancelled" | "expired";

export type AlertLifecycleEvent = {
  kind: AlertLifecycleKind;
  alertId: string;
  event: string;
  observedAt: string;
};

export type AlertSnapshot = {
  alerts: OfficialAlert[];
  fetchedAt: string;
};

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
  officialWindFields?: {
    advisoryNumber: string | null;
    issuedAt: string | null;
    sourceUrl: string;
    frames: Array<{
      forecastHour: number | null;
      validAt: string | null;
      center: {
        latitude: number | null;
        longitude: number | null;
      };
      zones: Array<{
        thresholdKnots: 34 | 50 | 64;
        thresholdMph: number;
        feature: {
          type: "Feature";
          properties: {
            source: string;
            product: string;
            thresholdKnots: number;
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
      }>;
    }>;
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
