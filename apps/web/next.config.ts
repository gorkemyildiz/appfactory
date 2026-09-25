import type { NextConfig } from "next";
const config: NextConfig = {
  transpilePackages: [
    "@app-factory/schemas",
    "@app-factory/shared",
    "@app-factory/database",
  ],
};
export default config;
