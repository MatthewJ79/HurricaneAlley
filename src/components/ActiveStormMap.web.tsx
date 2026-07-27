import type { GeoJsonObject } from "geojson";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import "../leaflet.css";
import type { LiveStorm } from "../types";
import {
  forecastStrengthLabel,
  formatForecastTime,
} from "../utils/forecast";

const CYCLONE_ICON = require("../../assets/hurricane-icon-red-outlined.png") as {
  uri: string;
};
const CYCLONE_ICON_URI = CYCLONE_ICON.uri;

const STREET_TILES =
  process.env.EXPO_PUBLIC_MAP_TILE_URL ??
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const STREET_ATTRIBUTION =
  process.env.EXPO_PUBLIC_MAP_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const SATELLITE_TILES =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=BlueMarble_NextGeneration&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level8&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image%2Fjpeg";

function cycloneHtml({
  size,
  label,
}: {
  size: number;
  label: string;
}) {
  return `
    <img role="img" aria-label="${label}" src="${CYCLONE_ICON_URI}" style="
      display:block;width:${size}px;height:${size}px;object-fit:contain;
      filter:drop-shadow(0 2px 3px rgba(0,0,0,.62));
    " />`;
}

function forecastMarkerHtml({
  size,
  label,
  validAt,
  strength,
  labelBelow,
}: {
  size: number;
  label: string;
  validAt: string;
  strength: string;
  labelBelow: boolean;
}) {
  return `
    <div role="img" aria-label="${label}" style="
      position:relative;width:80px;height:72px;
      filter:drop-shadow(0 2px 3px rgba(0,0,0,.62));
    ">
      <img src="${CYCLONE_ICON_URI}" aria-hidden="true" style="
        position:absolute;left:${(80 - size) / 2}px;top:${(72 - size) / 2}px;
        display:block;width:${size}px;height:${size}px;object-fit:contain;
      " />
      <div aria-hidden="true" style="
        position:absolute;left:2px;right:2px;${labelBelow ? "bottom:0" : "top:0"};
        padding:3px 3px 2px;border:1px solid rgba(255,255,255,.8);
        border-radius:5px;background:rgba(5,22,32,.92);
        color:#fff;text-align:center;white-space:nowrap;line-height:1.15;
        font-family:Arial,sans-serif;font-size:7px;font-weight:800;
      ">
        <div>${validAt}</div>
        <div style="color:#FF5968;margin-top:1px">${strength}</div>
      </div>
    </div>`;
}

export function ActiveStormMap({
  storm,
  height = 184,
  interactive = false,
}: {
  storm: LiveStorm;
  height?: number;
  interactive?: boolean;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [layer, setLayer] = useState<"Map" | "Satellite">(() =>
    new URLSearchParams(window.location.search).get("mapLayer") === "satellite"
      ? "Satellite"
      : "Map",
  );

  useEffect(() => {
    if (
      !containerRef.current ||
      storm.center.latitude === null ||
      storm.center.longitude === null
    ) {
      return;
    }

    let disposed = false;
    let mapInstance: import("leaflet").Map | null = null;

    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current) return;

      const current: [number, number] = [
        storm.center.latitude!,
        storm.center.longitude!,
      ];
      const forecast = storm.forecastPoints ?? [];
      const track: Array<[number, number]> = [
        current,
        ...forecast.map(
          (point) => [point.latitude, point.longitude] as [number, number],
        ),
      ];

      const map = L.map(containerRef.current, {
        attributionControl: true,
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
        touchZoom: interactive,
        tapHold: interactive,
        preferCanvas: false,
      });
      mapInstance = map;

      if (track.length > 1) {
        map.fitBounds(L.latLngBounds(track), {
          paddingTopLeft: [48, 52],
          paddingBottomRight: [48, 52],
          maxZoom: interactive ? 6 : 5,
          animate: false,
        });
      } else {
        map.setView(current, 4, { animate: false });
      }

      const tiles = L.tileLayer(
        layer === "Map" ? STREET_TILES : SATELLITE_TILES,
        {
          attribution:
            layer === "Map" ? STREET_ATTRIBUTION : "NASA EOSDIS GIBS",
          maxZoom: layer === "Map" ? 19 : 9,
          minZoom: 1,
          tileSize: 256,
          crossOrigin: true,
        },
      );
      tiles.addTo(map);

      if (storm.officialCone) {
        L.geoJSON(storm.officialCone.feature as GeoJsonObject, {
          interactive: false,
          style: {
            color: "#006D80",
            weight: 2,
            fillColor: "#DDFBFF",
            fillOpacity: layer === "Map" ? 0.5 : 0.38,
          },
        }).addTo(map);
      }

      if (track.length > 1) {
        L.polyline(track, {
          interactive: false,
          color: "#00AFC1",
          weight: 3,
          dashArray: "7 6",
          opacity: 1,
        }).addTo(map);
      }

      forecast.forEach((point, index) => {
        const validAt = formatForecastTime(point.validAt);
        const strength = forecastStrengthLabel(point);
        L.marker([point.latitude, point.longitude], {
          icon: L.divIcon({
            className: "",
            html: forecastMarkerHtml({
              size: 24,
              validAt,
              strength,
              labelBelow: index % 2 === 1,
              label: `${storm.name} official NHC forecast for ${validAt}: ${strength}`,
            }),
            iconSize: [80, 72],
            iconAnchor: [40, 36],
          }),
          interactive: false,
          keyboard: false,
          zIndexOffset: 300 + index,
        }).addTo(map);
      });

      L.marker(current, {
        icon: L.divIcon({
          className: "",
          html: cycloneHtml({
            size: 42,
            label: `Current NHC center of ${storm.name}`,
          }),
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        }),
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(map);

      requestAnimationFrame(() => {
        if (!disposed) map.invalidateSize(false);
      });

    });

    return () => {
      disposed = true;
      mapInstance?.remove();
      mapInstance = null;
    };
  }, [interactive, layer, storm]);

  return (
    <View
      accessibilityLabel={`Real map showing the current location and official NHC forecast track for ${storm.name}`}
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
              onPress={(event) => {
                event.stopPropagation();
                setLayer(option);
              }}
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
      <View pointerEvents="none" style={styles.sourceBadge}>
        <Text style={styles.sourceText}>
          {storm.officialCone
            ? "OFFICIAL NHC CONE + TRACK"
            : "OFFICIAL NHC TRACK"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 13,
    backgroundColor: "#9CC6DD",
  },
  map: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  layerControl: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    padding: 3,
    borderRadius: 9,
    backgroundColor: "rgba(5, 22, 32, .88)",
  },
  layerButton: {
    minHeight: 28,
    justifyContent: "center",
    borderRadius: 6,
    paddingHorizontal: 9,
  },
  layerButtonActive: {
    backgroundColor: "#FFFFFF",
  },
  layerText: {
    color: "#C9D8DE",
    fontSize: 9,
    fontWeight: "800",
  },
  layerTextActive: {
    color: "#102E3A",
  },
  sourceBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "rgba(5, 22, 32, .86)",
  },
  sourceText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
