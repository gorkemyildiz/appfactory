import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

// Read only public Supabase settings from the shared monorepo configuration.
try {
  const rootEnv = parseEnv(
    readFileSync(path.resolve(process.cwd(), "../../.env"), "utf8"),
  );
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ]) {
    if (!process.env[name] && rootEnv[name]) process.env[name] = rootEnv[name];
  }
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const config: NextConfig = {
  transpilePackages: [
    "@app-factory/schemas",
    "@app-factory/shared",
    "@app-factory/database",
  ],
};
export default config;
