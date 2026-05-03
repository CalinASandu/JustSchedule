import type { NextConfig } from "next";

const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const posthogRegion = posthogHost.includes("eu.") ? "eu" : "us";
const posthogApiHost = `https://${posthogRegion}.i.posthog.com`;
const posthogAssetsHost = `https://${posthogRegion}-assets.i.posthog.com`;

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "*.local",
    "calin.local",
    "calin",
    "10.*.*.*",
    "172.*.*.*",
    "192.168.*.*",
    "169.254.*.*",
  ],
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/_jsd/static/:path*",
        destination: `${posthogAssetsHost}/static/:path*`,
      },
      {
        source: "/_jsd/array/:path*",
        destination: `${posthogAssetsHost}/array/:path*`,
      },
      {
        source: "/_jsd/:path*",
        destination: `${posthogApiHost}/:path*`,
      },
    ];
  },
};

export default nextConfig;
