import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type LngLatBounds,
  type StyleSpecification,
} from "@maplibre/maplibre-react-native";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { LiveStorm } from "../types";
import { coneCrossSections } from "../utils/coneSections";
import {
  forecastPositionLabel,
  forecastStrengthLabel,
  formatForecastTime,
} from "../utils/forecast";
import {
  satelliteImageryForStorm,
  satelliteTimeLabel,
} from "../utils/satellite";

const STREET_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const CYCLONE_ICON = require("../../assets/hurricane-icon-red-outlined.png");

function satelliteStyle(storm: LiveStorm): StyleSpecification {
  const satellite = satelliteImageryForStorm(storm);
  return {
    version: 8,
    sources: {
      "nasa-satellite-base": {
        type: "raster",
        tiles: [
          "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=BlueMarble_NextGeneration&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level8&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image%2Fjpeg",
        ],
        tileSize: 256,
        maxzoom: 9,
        attribution: "NASA EOSDIS GIBS",
      },
      "nasa-satellite-true-color": {
        type: "raster",
        tiles: [satellite.tileUrl],
        tileSize: 256,
        maxzoom: 7,
        attribution: `NASA ${satellite.satellite} GeoColor · ${
          satellite.observationTime ?? "latest"
        }`,
      },
    },
    layers: [
      {
        id: "satellite-base",
        type: "raster",
        source: "nasa-satellite-base",
      },
      {
        id: "satellite-true-color",
        type: "raster",
        source: "nasa-satellite-true-color",
      },
    ],
  };
}

function CycloneSymbol({
  size,
}: {
  size: number;
}) {
  return (
    <Image
      accessible
      accessibilityRole="image"
      source={CYCLONE_ICON}
      resizeMode="contain"
      style={{ width: size, height: size }}
    />
  );
}

function mapBounds(storm: LiveStorm): LngLatBounds {
  const points: Array<[number, number]> = [];
  if (
    storm.center.longitude !== null &&
    storm.center.latitude !== null
  ) {
    points.push([storm.center.longitude, storm.center.latitude]);
  }
  for (const point of storm.forecastPoints ?? []) {
    points.push([point.longitude, point.latitude]);
  }

  if (points.length === 0) return [-100, 5, -20, 50];

  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
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
  const [layer, setLayer] = useState<"Map" | "Satellite">("Map");
  const satellite = satelliteImageryForStorm(storm);
  const center: [number, number] = [
    storm.center.longitude ?? -70,
    storm.center.latitude ?? 25,
  ];
  const coordinates: Array<[number, number]> = [
    center,
    ...(storm.forecastPoints?.map(
      (point) => [point.longitude, point.latitude] as [number, number],
    ) ?? []),
  ];
  const track: GeoJSON.Feature<GeoJSON.LineString> = {
    type: "Feature",
    properties: {
      source: "NOAA National Hurricane Center",
    },
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
  const coneSections = coneCrossSections(storm);
  const coneSectionLines: GeoJSON.Feature<GeoJSON.MultiLineString> = {
    type: "Feature",
    properties: {
      source: "NOAA National Hurricane Center",
    },
    geometry: {
      type: "MultiLineString",
      coordinates: coneSections,
    },
  };

  return (
    <View
      accessibilityLabel={`Real map showing the current location and official NHC forecast track for ${storm.name}`}
      style={[styles.container, { height }]}
    >
      <Map
        style={styles.map}
        mapStyle={
          layer === "Map" ? STREET_STYLE : satelliteStyle(storm)
        }
        attribution
        logo={false}
        compass={false}
        dragPan
        touchZoom
        doubleTapZoom
        touchRotate={false}
        touchPitch
      >
        <Camera
          initialViewState={{
            bounds: mapBounds(storm),
            padding: { top: 46, right: 44, bottom: 46, left: 44 },
          }}
        />

        {storm.officialCone ? (
          <GeoJSONSource
            id={`nhc-cone-${storm.id}`}
            data={storm.officialCone.feature as GeoJSON.Feature}
          >
            <Layer
              id={`nhc-cone-fill-${storm.id}`}
              type="fill"
              paint={{
                "fill-color": "#DDFBFF",
                "fill-opacity": layer === "Map" ? 0.46 : 0.36,
              }}
            />
            <Layer
              id={`nhc-cone-line-${storm.id}`}
              type="line"
              paint={{
                "line-color": "#007C91",
                "line-width": 2,
              }}
            />
          </GeoJSONSource>
        ) : null}

        {coneSections.length > 0 ? (
          <GeoJSONSource
            id={`nhc-cone-sections-${storm.id}`}
            data={coneSectionLines}
          >
            <Layer
              id={`nhc-cone-sections-line-${storm.id}`}
              type="line"
              paint={{
                "line-color": "#536A73",
                "line-width": 2,
                "line-opacity": 0.92,
              }}
            />
          </GeoJSONSource>
        ) : null}

        {coordinates.length > 1 ? (
          <GeoJSONSource id={`nhc-track-${storm.id}`} data={track}>
            <Layer
              id={`nhc-track-line-${storm.id}`}
              type="line"
              paint={{
                "line-color": "#00AFC1",
                "line-width": 3,
                "line-dasharray": [1.5, 1.5],
              }}
            />
          </GeoJSONSource>
        ) : null}

        {(storm.forecastPoints ?? []).map((point, index) => {
          const validAt = formatForecastTime(point.validAt);
          const strength = forecastStrengthLabel(point);
          const position = forecastPositionLabel(
            point.latitude,
            point.longitude,
          );
          return (
            <Marker
              key={`${point.validAt ?? "forecast"}-${index}`}
              id={`${storm.id}-forecast-${index}`}
              lngLat={[point.longitude, point.latitude]}
              anchor="center"
              accessibilityLabel={`${storm.name} official NHC forecast for ${validAt}: ${strength}, ${position}`}
            >
              <CycloneSymbol size={24} />
            </Marker>
          );
        })}
        <Marker
          id={`${storm.id}-current`}
          lngLat={center}
          anchor="center"
          accessibilityLabel={`Current NHC center of ${storm.name}`}
        >
          <CycloneSymbol size={42} />
        </Marker>
      </Map>

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
          {layer === "Satellite"
            ? `NHC TRACK · ${satellite.satellite} ${satelliteTimeLabel(
                satellite.observationTime,
              )} UTC`
            : storm.officialCone
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
    height: 184,
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
