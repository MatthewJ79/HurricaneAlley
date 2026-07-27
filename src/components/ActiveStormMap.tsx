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
import {
  forecastStrengthLabel,
  formatForecastTime,
} from "../utils/forecast";

const STREET_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const CYCLONE_ICON = require("../../assets/hurricane-icon-red-outlined.png");

function satelliteStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      "nasa-satellite": {
        type: "raster",
        tiles: [
          "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=BlueMarble_NextGeneration&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level8&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image%2Fjpeg",
        ],
        tileSize: 256,
        maxzoom: 9,
        attribution: "NASA EOSDIS GIBS",
      },
    },
    layers: [
      {
        id: "satellite",
        type: "raster",
        source: "nasa-satellite",
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

function ForecastMarker({
  validAt,
  strength,
  labelBelow,
}: {
  validAt: string;
  strength: string;
  labelBelow: boolean;
}) {
  return (
    <View style={styles.forecastMarker}>
      <CycloneSymbol size={24} />
      <View
        pointerEvents="none"
        style={[
          styles.forecastLabel,
          labelBelow ? styles.forecastLabelBelow : styles.forecastLabelAbove,
        ]}
      >
        <Text numberOfLines={1} style={styles.forecastTime}>
          {validAt}
        </Text>
        <Text numberOfLines={1} style={styles.forecastStrength}>
          {strength}
        </Text>
      </View>
    </View>
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

  return (
    <View
      accessibilityLabel={`Real map showing the current location and official NHC forecast track for ${storm.name}`}
      style={[styles.container, { height }]}
    >
      <Map
        style={styles.map}
        mapStyle={
          layer === "Map" ? STREET_STYLE : satelliteStyle()
        }
        attribution
        logo={false}
        compass={false}
        dragPan={interactive}
        touchZoom={interactive}
        doubleTapZoom={interactive}
        touchRotate={false}
        touchPitch={interactive}
      >
        <Camera
          initialViewState={{
            bounds: mapBounds(storm),
            padding: { top: 52, right: 48, bottom: 52, left: 48 },
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
          return (
            <Marker
              key={`${point.validAt ?? "forecast"}-${index}`}
              id={`${storm.id}-forecast-${index}`}
              lngLat={[point.longitude, point.latitude]}
              anchor="center"
              accessibilityLabel={`${storm.name} official NHC forecast for ${validAt}: ${strength}`}
            >
              <ForecastMarker
                validAt={validAt}
                strength={strength}
                labelBelow={index % 2 === 1}
              />
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
  forecastMarker: {
    position: "relative",
    width: 80,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  forecastLabel: {
    position: "absolute",
    left: 2,
    right: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.8)",
    borderRadius: 5,
    paddingHorizontal: 3,
    paddingVertical: 2,
    backgroundColor: "rgba(5,22,32,.92)",
    alignItems: "center",
  },
  forecastLabelAbove: { top: 0 },
  forecastLabelBelow: { bottom: 0 },
  forecastTime: {
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "800",
    lineHeight: 8,
  },
  forecastStrength: {
    marginTop: 1,
    color: "#FF5968",
    fontSize: 7,
    fontWeight: "800",
    lineHeight: 8,
  },
});
