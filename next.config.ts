import type { NextConfig } from "next";

/*
 * Subdomain experiments (<slug>.adelia.cc) are routed in src/proxy.ts to the static builds in
 * public/labs/<slug>/ made by scripts/build-labs.mjs.
 */
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
