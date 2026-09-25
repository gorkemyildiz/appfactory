import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";
export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/dist/**",
    "**/next-env.d.ts",
    "workspace/generated-projects/**",
    "workspace/jobs/**",
    "templates/expo-base/**",
  ]),
  ...nextVitals.map((config) => ({
    ...config,
    files: ["apps/web/**/*.{ts,tsx,js,mjs}"],
  })),
  {
    files: ["apps/web/**/*.{ts,tsx,js,mjs}"],
    settings: { next: { rootDir: "apps/web/" } },
  },
  ...nextTs.map((config) => ({ ...config, files: ["apps/web/**/*.{ts,tsx}"] })),
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["packages/**/*.ts", "apps/worker/**/*.ts"],
  })),
]);
