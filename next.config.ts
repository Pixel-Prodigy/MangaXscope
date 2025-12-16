import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests from local network devices (e.g., phone)
  allowedDevOrigins: ["*"],
  images: {
    // Keep remote patterns for any remaining Next.js Image usage
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ww6.mangakakalot.tv",
      },
      {
        protocol: "https",
        hostname: "uploads.mangadex.org",
      },
      {
        protocol: "https",
        hostname: "api.mangadex.org",
      },
      {
        protocol: "https",
        hostname: "placeholder.pics",
      },
    ],
  },
};

export default nextConfig;
