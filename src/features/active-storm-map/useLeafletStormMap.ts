import type { GeoJsonObject } from "geojson";
import { useEffect, type RefObject } from "react";
import type { LiveStorm } from "../../types";
import { coneCrossSections } from "../../utils/coneSections";
import { forecastStrengthLabel, formatForecastTime } from "../../utils/forecast";
import { RADAR_ATTRIBUTION, RADAR_WMS_LAYERS } from "../../utils/radar";
import { satelliteImageryForStorm } from "../../utils/satellite";
import { WIND_ZONE_STYLES } from "../../utils/windFields";
import type { MapLayer } from "./types";
import { cycloneHtml, forecastCalloutHtml, forecastPointColor, SATELLITE_BASE_TILES, STREET_ATTRIBUTION, STREET_TILES } from "./webUtils";

export function useLeafletStormMap({ containerRef, storm, layer, height, interactive,
  activeTrackIndex, windFrameIndex, windFramesLength, onTrack, onWind }: {
  containerRef: RefObject<HTMLElement | null>; storm: LiveStorm; layer: MapLayer; height: number; interactive: boolean;
  activeTrackIndex: number; windFrameIndex: number; windFramesLength: number;
  onTrack: (index: number) => void; onWind: (index: number) => void;
}) {
  useEffect(() => {
    if (!containerRef.current || storm.center.latitude === null || storm.center.longitude === null) return;
    let disposed = false;
    let mapInstance: import("leaflet").Map | null = null;
    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current) return;
      const current: [number, number] = [storm.center.latitude!, storm.center.longitude!];
      const forecast = storm.forecastPoints ?? [];
      const track: Array<[number, number]> = [current, ...forecast.map((point) => [point.latitude, point.longitude] as [number, number])];
      const crossSections = coneCrossSections(storm);
      const windFrames = storm.officialWindFields?.frames ?? [];
      const windFrame = windFrames[Math.min(windFrameIndex, Math.max(0, windFrames.length - 1))];
      const selectedForecast = activeTrackIndex > 0 ? forecast[activeTrackIndex - 1] : null;
      const map = L.map(containerRef.current, { attributionControl: true, zoomControl: interactive, dragging: interactive,
        scrollWheelZoom: interactive, doubleClickZoom: interactive, boxZoom: interactive, keyboard: interactive,
        touchZoom: interactive, tapHold: interactive, preferCanvas: false });
      mapInstance = map;
      if (track.length > 1) {
        const padding = height >= 300 ? 94 : 58;
        const bounds = L.latLngBounds(track);
        if (storm.officialCone) bounds.extend(L.geoJSON(storm.officialCone.feature as GeoJsonObject).getBounds());
        map.fitBounds(bounds, { paddingTopLeft: [58, padding], paddingBottomRight: [58, padding], maxZoom: interactive ? 6 : 5, animate: false });
      } else map.setView(current, 4, { animate: false });
      L.tileLayer(layer === "Satellite" ? SATELLITE_BASE_TILES : STREET_TILES, {
        attribution: layer === "Satellite" ? "NASA EOSDIS GIBS" : STREET_ATTRIBUTION,
        maxZoom: layer === "Satellite" ? 9 : 19, minZoom: 1, tileSize: 256, crossOrigin: true,
      }).addTo(map);
      const satellite = satelliteImageryForStorm(storm);
      if (layer === "Satellite") L.tileLayer(satellite.tileUrl, { attribution: `NASA ${satellite.satellite} GeoColor · ${satellite.observationTime ?? "latest"}`, maxZoom: 7, minZoom: 1, tileSize: 256, crossOrigin: true }).addTo(map);
      if (layer === "Radar") RADAR_WMS_LAYERS.forEach((radar) => L.tileLayer.wms(radar.url, {
        attribution: RADAR_ATTRIBUTION, format: "image/png", layers: radar.layer, maxZoom: 12, minZoom: 1,
        opacity: 0.76, styles: "radar_reflectivity", transparent: true, version: "1.1.1",
      }).addTo(map));
      if (layer === "Wind" && windFrame) windFrame.zones.forEach((zone) => {
        const style = WIND_ZONE_STYLES[zone.thresholdKnots];
        L.geoJSON(zone.feature as GeoJsonObject, { interactive: false, style: { color: style.color,
          fillColor: style.fillColor, fillOpacity: style.fillOpacity, opacity: 0.95, weight: 2 } }).addTo(map);
      });
      if (storm.officialCone) L.geoJSON(storm.officialCone.feature as GeoJsonObject, { interactive: false,
        style: { color: "#006D80", weight: 2, fillColor: "#DDFBFF", fillOpacity: layer === "Map" ? 0.5 : 0.38 } }).addTo(map);
      crossSections.forEach((section) => L.polyline(section.map(([lng, lat]) => [lat, lng] as [number, number]),
        { interactive: false, color: "#536A73", weight: 2, opacity: 0.92 }).addTo(map));
      if (track.length > 1) L.polyline(track, { interactive: false, color: "#00AFC1", weight: 3, dashArray: "7 6", opacity: 1 }).addTo(map);

      const visible = forecast.slice(0, layer === "Wind" ? Math.max(0, windFrames.length - 1) : undefined);
      const compact = new Set([0, Math.floor((visible.length - 1) / 2), visible.length - 1, Math.max(0, activeTrackIndex - 1)]);
      visible.forEach((point, index) => {
        const accent = forecastPointColor(point.windKnots);
        const marker = L.circleMarker([point.latitude, point.longitude], { interactive, radius: activeTrackIndex === index + 1 ? 5 : 3.5,
          color: "#07131A", fillColor: accent, fillOpacity: 1, opacity: 1, weight: activeTrackIndex === index + 1 ? 2.5 : 1.5 }).addTo(map);
        if (interactive) marker.on("click", () => layer === "Wind" ? onWind(index + 1) : onTrack(index + 1));
        const show = layer !== "Radar" && (layer === "Wind" ? activeTrackIndex === index + 1 : height >= 300 || compact.has(index));
        if (!show) return;
        const pointPixel = map.latLngToLayerPoint([point.latitude, point.longitude]);
        const above = index % 2 === 0;
        const edge = crossSections[index]?.map(([lng, lat]) => ({ coordinate: [lat, lng] as [number, number], pixel: map.latLngToLayerPoint([lat, lng]) }))
          .sort((a, b) => above ? a.pixel.y - b.pixel.y : b.pixel.y - a.pixel.y)[0]?.pixel ?? L.point(pointPixel.x, pointPixel.y + (above ? -48 : 48));
        const vector = { x: edge.x - pointPixel.x, y: edge.y - pointPixel.y };
        const length = Math.max(1, Math.hypot(vector.x, vector.y));
        const coordinate = map.layerPointToLatLng(L.point(edge.x + vector.x / length * 34, edge.y + vector.y / length * 34));
        L.polyline([[point.latitude, point.longitude], [coordinate.lat, coordinate.lng]], { interactive: false, color: accent, opacity: 0.92, weight: 2 }).addTo(map);
        L.marker(coordinate, { icon: L.divIcon({ className: "forecast-callout-marker", html: forecastCalloutHtml(accent,
          activeTrackIndex === index + 1, forecastStrengthLabel(point), formatForecastTime(point.validAt)), iconAnchor: [48, 22], iconSize: [96, 44] }),
          interactive: false, keyboard: false, zIndexOffset: activeTrackIndex === index + 1 ? 900 + index : 700 + index }).addTo(map);
      });
      if (layer !== "Wind") {
        const position: [number, number] = selectedForecast ? [selectedForecast.latitude, selectedForecast.longitude] : current;
        const label = selectedForecast ? `${storm.name} forecast center for ${formatForecastTime(selectedForecast.validAt)}: ${forecastStrengthLabel(selectedForecast)}` : `Current NHC center of ${storm.name}`;
        const size = selectedForecast ? 34 : 42;
        L.marker(position, { icon: L.divIcon({ className: "", html: cycloneHtml(size, label), iconSize: [size, size], iconAnchor: [size / 2, size / 2] }), interactive: false, keyboard: false, zIndexOffset: 1000 }).addTo(map);
      } else {
        const dot = L.circleMarker(current, { interactive, radius: activeTrackIndex === 0 ? 5 : 3.5, color: "#07131A", fillColor: "#FFFFFF", fillOpacity: 1, opacity: 1, weight: activeTrackIndex === 0 ? 2.5 : 1.5 }).addTo(map);
        if (interactive) dot.on("click", () => onWind(0));
      }
      requestAnimationFrame(() => { if (!disposed) map.invalidateSize(false); });
    });
    return () => { disposed = true; mapInstance?.remove(); mapInstance = null; };
  }, [activeTrackIndex, containerRef, height, interactive, layer, onTrack, onWind, storm, windFrameIndex, windFramesLength]);
}
