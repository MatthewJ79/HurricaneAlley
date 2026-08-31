import { Camera, GeoJSONSource, Layer, Map, Marker } from "@maplibre/maplibre-react-native";
import { StyleSheet, View } from "react-native";
import type { OfficialAlert, SavedPlace } from "../types";
import { alertColor } from "../utils/alerts";

const STREET_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function AlertMap({ alerts, places, selectedAlertId, onSelectAlert, height = 420 }: {
  alerts: OfficialAlert[];
  places: SavedPlace[];
  selectedAlertId: string | null;
  onSelectAlert: (alertId: string) => void;
  height?: number;
}) {
  return (
    <View accessibilityLabel="Interactive map of official warning areas and saved places"
      style={[styles.container, { height }]}>
      <Map style={styles.map} mapStyle={STREET_STYLE} attribution logo={false} compass>
        <Camera initialViewState={{ center: [-157.2, 20.8], zoom: 5.5 }} />
        {alerts.map((alert, index) => alert.geometry ? (
          <GeoJSONSource key={alert.id} id={`official-alert-${index}`}
            data={{ type: "Feature", properties: {}, geometry: alert.geometry } as GeoJSON.Feature}
            onPress={() => onSelectAlert(alert.id)}>
            <Layer id={`official-alert-fill-${index}`} type="fill" paint={{
              "fill-color": alertColor(alert),
              "fill-opacity": alert.id === selectedAlertId ? 0.42 : 0.22,
            }} />
            <Layer id={`official-alert-line-${index}`} type="line" paint={{
              "line-color": alertColor(alert),
              "line-width": alert.id === selectedAlertId ? 4 : 2,
            }} />
          </GeoJSONSource>
        ) : null)}
        {places.map((place) => (
          <Marker key={place.id} id={`saved-place-${place.id}`} lngLat={[place.longitude, place.latitude]}
            anchor="center" accessibilityLabel={place.name}>
            <View style={styles.placeMarker} />
          </Marker>
        ))}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", overflow: "hidden", borderRadius: 14, backgroundColor: "#9CC6DD" },
  map: { width: "100%", height: "100%" },
  placeMarker: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: "#07131A", backgroundColor: "#00E2E7" },
});
