import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Keep the development badge from covering Carrot’s starting position.
  devIndicators: false,
  async redirects() {
    return [
      {
        source: "/:locale(en|ja)/:page(play|about|muji|nypl)",
        destination: "https://konatsukoko.com/:page",
        permanent: false,
      },
      { source: "/:locale(en|ja)", destination: "/", permanent: false },
      { source: "/:locale(en|ja)/:path+", destination: "/:path+", permanent: false },
    ];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default createNextIntlPlugin("./i18n/request.ts")(nextConfig);
