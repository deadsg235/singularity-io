import type { NextConfig } from "next";

// Work around Node.js 22 lazy getter differences so Next's bundled webpack
// exposes WebpackError/other exports before plugins access them.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const webpackModule = require("next/dist/compiled/webpack/webpack");
  if (typeof webpackModule?.init === "function") {
    webpackModule.init();
  }
} catch {
  // ignore
}

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN &&
  process.env.NEXT_PUBLIC_API_ORIGIN !== "relative"
    ? process.env.NEXT_PUBLIC_API_ORIGIN.replace(/\/$/, "")
    : "https://api.dexter.cash";

const nextConfig: NextConfig = {
  // Force Next.js to treat this directory as the root so dev server stays isolated.
  outputFileTracingRoot: __dirname,
  // Keep stack traces human-readable even in production builds.
  productionBrowserSourceMaps: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "thumbnails.pump.fun",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "dd.dexscreener.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.dexscreener.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [
      { source: "/auth/config", destination: `${API_ORIGIN}/auth/config` },
      { source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` },
    ];
  },
};

export default nextConfig;
