import { View, Text, Pressable } from "react-native";
import type { AppMapProps } from "./map";
export function AppMap({ center, points, onSelect }: AppMapProps) {
  return (
    <View style={{ gap: 12 }}>
      <Text>
        Harita görünümü Android/iOS uygulamasında kullanılabilir. Web üzerinde
        konum listesi gösteriliyor.
      </Text>
      <Text>
        {center.latitude.toFixed(5)}, {center.longitude.toFixed(5)}
      </Text>
      {points.map((point) => (
        <Pressable key={point.id} onPress={() => onSelect(point.id)}>
          <Text style={{ color: point.color }}>
            {point.title} · {point.latitude.toFixed(5)},{" "}
            {point.longitude.toFixed(5)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
