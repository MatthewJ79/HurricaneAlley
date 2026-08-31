import type { GeoJsonObject } from "geojson";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type { OfficialAlert, SavedPlace } from "../types";
import { alertColor } from "../utils/alerts";
import "../leaflet.css";

const STREET_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = "&copy; OpenStreetMap contributors";

export function AlertMap({ alerts, places, selectedAlertId, onSelectAlert, height = 420 }: {
  alerts: OfficialAlert[];
  places: SavedPlace[];
  selectedAlertId: string | null;
  onSelectAlert: (alertId: string) => void;
  height?: number;
}) {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
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
      });
      mapInstance = map;
      L.tileLayer(STREET_TILES, { attribution: ATTRIBUTION, maxZoom: 19, minZoom: 2, crossOrigin: true }).addTo(map);

      const bounds = L.latLngBounds([]);
      alerts.forEach((alert) => {
        if (!alert.geometry) return;
        const color = alertColor(alert);
        const layer = L.geoJSON({ type: "Feature", properties: {}, geometry: alert.geometry } as GeoJsonObject, {
          interactive: true,
          style: {
            color,
            fillColor: color,
            fillOpacity: alert.id === selectedAlertId ? 0.42 : 0.22,
            opacity: 0.96,
            weight: alert.id === selectedAlertId ? 4 : 2,
          },
        }).addTo(map);
        layer.on("click", () => onSelectAlert(alert.id));
        layer.bindTooltip(`${alert.event}: ${alert.areaDescription ?? "affected area"}`, { sticky: true });
        bounds.extend(layer.getBounds());
      });

      places.forEach((place) => {
        const marker = L.circleMarker([place.latitude, place.longitude], {
          color: "#07131A",
          fillColor: "#00E2E7",
          fillOpacity: 1,
          radius: 7,
          weight: 3,
        }).addTo(map);
        marker.bindTooltip(place.name, { permanent: false, direction: "top" });
        bounds.extend(marker.getLatLng());
      });

      if (bounds.isValid()) map.fitBounds(bounds, { padding: [34, 34], maxZoom: 9, animate: false });
      else map.setView([20.8, -157.2], 6, { animate: false });
      requestAnimationFrame(() => { if (!disposed) map.invalidateSize(false); });
    });
    return () => { disposed = true; mapInstance?.remove(); };
  }, [alerts, onSelectAlert, places, selectedAlertId]);

  return (
    <View accessibilityLabel="Interactive map of official warning areas and saved places"
      style={[styles.container, { height }]}>
      <View ref={(node) => { containerRef.current = node as unknown as HTMLElement | null; }} style={styles.map} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", overflow: "hidden", borderRadius: 14, backgroundColor: "#9CC6DD" },
  map: { width: "100%", height: "100%" },
});
