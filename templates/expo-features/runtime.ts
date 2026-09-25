import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import connection from "./connection.json";

export type Coordinates = { latitude: number; longitude: number };
export type CapturedPhoto = { uri: string; base64: string; mimeType: string };
let client: SupabaseClient | undefined;
export const backendConfigured = Boolean(
  connection.url && connection.publishableKey,
);
export function getBackend(): SupabaseClient {
  if (!backendConfigured)
    throw new Error(
      "Bu özellik için uygulamanın Supabase bağlantısı kurulmalıdır.",
    );
  if (!client) {
    if (
      !connection.url.startsWith("https://") ||
      !connection.publishableKey.startsWith("sb_publishable_")
    )
      throw new Error(
        "HTTPS Supabase adresi ve publishable anahtarı kullanın; sunucu anahtarı mobil uygulamaya eklenemez.",
      );
    client = createClient(connection.url, connection.publishableKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    if (Platform.OS !== "web")
      AppState.addEventListener("change", (state) => {
        if (state === "active") client?.auth.startAutoRefresh();
        else client?.auth.stopAutoRefresh();
      });
  }
  return client;
}
export async function readLocal<T>(
  key: string,
  validate: (value: unknown) => value is T,
  initial: T,
): Promise<T> {
  const raw = await AsyncStorage.getItem(`features:${key}`);
  if (raw === null) return initial;
  const value: unknown = JSON.parse(raw);
  if (!validate(value))
    throw new Error("Kayıtlar okunamadı. Mevcut veriler korunuyor.");
  return value;
}
export async function writeLocal<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(`features:${key}`, JSON.stringify(value));
}
export async function currentLocation(): Promise<Coordinates> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error("Konum izni verilmedi.");
  const result = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    latitude: result.coords.latitude,
    longitude: result.coords.longitude,
  };
}
export async function capturePhoto(): Promise<CapturedPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error("Kamera izni verilmedi.");
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.5,
    base64: true,
    exif: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.base64) throw new Error("Fotoğraf okunamadı.");
  if (asset.base64.length > 8_000_000)
    throw new Error("Fotoğraf çok büyük; daha küçük bir fotoğraf çekin.");
  return {
    uri: asset.uri,
    base64: asset.base64,
    mimeType: asset.mimeType ?? "image/jpeg",
  };
}
export async function uploadPhoto(
  bucket: string,
  photo: CapturedPhoto,
): Promise<string> {
  const backend = getBackend();
  const { data, error } = await backend.auth.getUser();
  if (error || !data.user)
    throw new Error("Fotoğraf yüklemek için giriş yapın.");
  const binary = atob(photo.base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const extension = photo.mimeType === "image/png" ? "png" : "jpg";
  const objectPath = `${data.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const upload = await backend.storage
    .from(bucket)
    .upload(objectPath, bytes.buffer, {
      contentType: photo.mimeType,
      upsert: false,
    });
  if (upload.error)
    throw new Error(
      "Fotoğraf yüklenemedi. Bağlantıyı ve depolama izinlerini kontrol edin.",
    );
  return objectPath;
}
export async function photoUrl(
  bucket: string,
  objectPath: string,
): Promise<string> {
  const { data, error } = await getBackend()
    .storage.from(bucket)
    .createSignedUrl(objectPath, 300);
  if (error || !data) throw new Error("Fotoğraf açılamadı.");
  return data.signedUrl;
}
