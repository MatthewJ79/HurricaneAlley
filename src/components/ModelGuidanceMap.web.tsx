import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import "../leaflet.css";
import type { LiveStorm } from "../types";
import {
  continuousTrackCoordinates,
  mappableGuidance,
  modelColor,
} from "../utils/modelGuidance";

const CYCLONE_ICON = require("../../assets/hurricane-icon-red-outlined.png") as {
  uri: string;
};

const STREET_TILES =
  process.env.EXPO_PUBLIC_MAP_TILE_URL ??
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const STREET_ATTRIBUTION =
  process.env.EXPO_PUBLIC_MAP_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const SATELLITE_TILES =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=BlueMarble_NextGeneration&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level8&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image%2Fjpeg";

export function ModelGuidanceMap({
  storm,
  height = 360,
  visibleAids,
}: {
  storm: LiveStorm;
  height?: number;
  visibleAids?: string[];
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [layer, setLayer] = useState<"Map" | "Satellite">("Map");

  useEffect(() => {
    if (!containerRef.current) return;
    const models = mappableGuidance(storm).filter(
      (model) => !visibleAids || visibleAids.includes(model.aid),
    );
    if (models.length === 0) return;

    let disposed = false;
    let mapInstance: import("leaflet").Map | null = null;

    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        attributionControl: true,
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        touchZoom: true,
        tapHold: true,
      });
      mapInstance = map;

      const tracks = models.map((model) => ({
        model,
        points: continuousTrackCoordinates(
          model.points,
          storm.center.longitude,
        ),
      }));
      const coordinates = tracks.flatMap(({ points }) =>
        points.map(
          (point) => [point.latitude, point.longitude] as [number, number],
        ),
      );
      if (
        storm.center.latitude !== null &&
        storm.center.longitude !== null
      ) {
        coordinates.push([
          storm.center.latitude,
          storm.center.longitude,
        ]);
      }
      map.fitBounds(L.latLngBounds(coordinates), {
        padding: [28, 28],
        maxZoom: 6,
        animate: false,
      });

      L.tileLayer(layer === "Map" ? STREET_TILES : SATELLITE_TILES, {
        attribution:
          layer === "Map" ? STREET_ATTRIBUTION : "NASA EOSDIS GIBS",
        maxZoom: layer === "Map" ? 19 : 9,
        minZoom: 1,
        crossOrigin: true,
      }).addTo(map);

      tracks.forEach(({ model, points }) => {
        const track = points.map(
          (point) => [point.latitude, point.longitude] as [number, number],
        );
        L.polyline(track, {
          color: "#06151D",
          weight: model.aid === "TVCN" || model.aid === "HCCA" ? 6 : 4,
          opacity: 0.72,
          interactive: false,
        }).addTo(map);
        L.polyline(track, {
          color: modelColor(model.aid),
          weight: model.aid === "TVCN" || model.aid === "HCCA" ? 3.5 : 2,
          opacity: 0.94,
          interactive: false,
        }).addTo(map);

        const endpoint = track.at(-1);
        if (endpoint) {
          L.circleMarker(endpoint, {
            radius: 3,
            color: "#06151D",
            weight: 1,
            fillColor: modelColor(model.aid),
            fillOpacity: 1,
            interactive: false,
          }).addTo(map);
        }
      });

      if (
        storm.center.latitude !== null &&
        storm.center.longitude !== null
      ) {
        L.marker([storm.center.latitude, storm.center.longitude], {
          icon: L.divIcon({
            className: "",
            html: `<img src="${CYCLONE_ICON.uri}" alt="Current center of ${storm.name}" style="display:block;width:42px;height:42px;object-fit:contain;filter:drop-shadow(0 2px 3px rgba(0,0,0,.7))" />`,
            iconSize: [42, 42],
            iconAnchor: [21, 21],
          }),
          interactive: false,
          keyboard: false,
          zIndexOffset: 1000,
        }).addTo(map);
      }

      requestAnimationFrame(() => {
        if (!disposed) map.invalidateSize(false);
      });
    });

    return () => {
      disposed = true;
      mapInstance?.remove();
    };
  }, [layer, storm, visibleAids]);

  if (
    mappableGuidance(storm).filter(
      (model) => !visibleAids || visibleAids.includes(model.aid),
    ).length === 0
  ) {
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
      <View
        ref={(node) => {
          containerRef.current = node as unknown as HTMLElement | null;
        }}
        style={styles.map}
      />
      <View style={styles.layerControl}>
        {(["Map", "Satellite"] as const).map((option) => {
          const active = layer === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setLayer(option)}
              style={[styles.layerButton, active && styles.layerButtonActive]}
            >
              <Text
                style={[styles.layerText, active && styles.layerTextActive]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  layerControl: {
    position: "absolute",
    top: 9,
    right: 9,
    flexDirection: "row",
    padding: 3,
    borderRadius: 9,
    backgroundColor: "rgba(5,22,32,.9)",
  },
  layerButton: {
    minHeight: 29,
    justifyContent: "center",
    paddingHorizontal: 9,
    borderRadius: 6,
  },
  layerButtonActive: { backgroundColor: "#FFFFFF" },
  layerText: { color: "#C9D8DE", fontSize: 9, fontWeight: "800" },
  layerTextActive: { color: "#102E3A" },
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
