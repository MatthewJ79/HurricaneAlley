import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type LngLatBounds,
} from "@maplibre/maplibre-react-native";
import { Image, StyleSheet, Text, View } from "react-native";
import type { LiveStorm } from "../types";
import {
  continuousTrackCoordinates,
  mappableGuidance,
  modelColor,
} from "../utils/modelGuidance";

const CYCLONE_ICON = require("../../assets/hurricane-icon-red-outlined.png");
const STREET_STYLE = "https://tiles.openfreemap.org/styles/liberty";

function guidanceBounds(
  storm: LiveStorm,
  visibleAids?: string[],
): LngLatBounds {
  const coordinates = mappableGuidance(storm)
    .filter((model) => !visibleAids || visibleAids.includes(model.aid))
    .flatMap((model) =>
    continuousTrackCoordinates(
      model.points,
      storm.center.longitude,
    ).map(
      (point) => [point.longitude, point.latitude] as [number, number],
    ),
  );
  if (
    storm.center.longitude !== null &&
    storm.center.latitude !== null
  ) {
    coordinates.push([storm.center.longitude, storm.center.latitude]);
  }
  if (coordinates.length === 0) return [-100, 5, -20, 50];

  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

export function ModelGuidanceMap({
  storm,
  height = 360,
  visibleAids,
}: {
  storm: LiveStorm;
  height?: number;
  visibleAids?: string[];
}) {
  const models = mappableGuidance(storm).filter(
    (model) => !visibleAids || visibleAids.includes(model.aid),
  );
  if (models.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>
          No mappable ATCF guidance tracks in the current cycle.
        </Text>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={`Interactive spaghetti model map for ${storm.name} using official NHC ATCF guidance`}
      style={[styles.container, { height }]}
    >
      <Map
        style={styles.map}
        mapStyle={STREET_STYLE}
        attribution
        logo={false}
        compass={false}
      >
        <Camera
          initialViewState={{
            bounds: guidanceBounds(storm, visibleAids),
            padding: { top: 30, right: 30, bottom: 30, left: 30 },
          }}
        />
        {models.map((model) => {
          const continuousPoints = continuousTrackCoordinates(
            model.points,
            storm.center.longitude,
          );
          const feature: GeoJSON.Feature<GeoJSON.LineString> = {
            type: "Feature",
            properties: { aid: model.aid, source: "NHC ATCF" },
            geometry: {
              type: "LineString",
              coordinates: continuousPoints.map((point) => [
                point.longitude,
                point.latitude,
              ]),
            },
          };
          return (
            <GeoJSONSource
              key={model.aid}
              id={`guidance-${storm.id}-${model.aid}`}
              data={feature}
            >
              <Layer
                id={`guidance-case-${storm.id}-${model.aid}`}
                type="line"
                paint={{
                  "line-color": "#06151D",
                  "line-width":
                    model.aid === "TVCN" || model.aid === "HCCA" ? 6 : 4,
                  "line-opacity": 0.72,
                }}
              />
              <Layer
                id={`guidance-line-${storm.id}-${model.aid}`}
                type="line"
                paint={{
                  "line-color": modelColor(model.aid),
                  "line-width":
                    model.aid === "TVCN" || model.aid === "HCCA" ? 3.5 : 2,
                  "line-opacity": 0.94,
                }}
              />
            </GeoJSONSource>
          );
        })}
        {storm.center.longitude !== null &&
        storm.center.latitude !== null ? (
          <Marker
            id={`${storm.id}-guidance-center`}
            lngLat={[storm.center.longitude, storm.center.latitude]}
            anchor="center"
            accessibilityLabel={`Current center of ${storm.name}`}
          >
            <Image
              source={CYCLONE_ICON}
              resizeMode="contain"
              style={styles.currentIcon}
            />
          </Marker>
        ) : null}
      </Map>
      <View pointerEvents="none" style={styles.badge}>
        <Text style={styles.badgeText}>OFFICIAL NHC ATCF GUIDANCE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#9CC6DD",
  },
  map: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  currentIcon: { width: 42, height: 42 },
  badge: {
    position: "absolute",
    left: 9,
    bottom: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(5,22,32,.9)",
  },
  badgeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "800" },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#10202A",
  },
  emptyText: { color: "#A7BBC4", fontSize: 11, textAlign: "center" },
});
