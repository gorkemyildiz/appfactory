import definitions from "./screens.json";
export type ScreenId = "home" | "create" | "details" | "settings" | "register";
export const screenRoutes: Record<ScreenId, string> = {
  home: "index",
  create: "create",
  details: "items/[id]",
  settings: "settings",
  register: "register",
};
export const screens = definitions as {
  id: ScreenId;
  enabled: boolean;
  name: string;
  description: string;
}[];
export function screen(id: ScreenId) {
  const value = screens.find((s) => s.id === id);
  if (!value) throw new Error("Ekran tanımı bulunamadı.");
  return value;
}
