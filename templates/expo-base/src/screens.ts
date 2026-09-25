import definitions from "./screens.json";
export type ScreenId = string;
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
  return value ?? { id, enabled: false, name: "", description: "" };
}

for (const definition of screens) {
  if (definition.id.startsWith("custom-"))
    screenRoutes[definition.id] = definition.id;
}
