import MapView, { Marker } from "react-native-maps";
import type { Coordinates } from "./runtime";
export type MapPoint = Coordinates & {
  id: string;
  title: string;
  color: string;
};
export type AppMapProps = {
  center: Coordinates;
  points: MapPoint[];
  onSelect: (id: string) => void;
};
export function AppMap({ center, points, onSelect }: AppMapProps) {
  return (
    <MapView
      style={{ height: 320, width: "100%" }}
      region={{ ...center, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
    >
      {points.map((point) => (
        <Marker
          key={point.id}
          coordinate={point}
          title={point.title}
          pinColor={point.color}
          onPress={() => onSelect(point.id)}
        />
      ))}
    </MapView>
  );
}
