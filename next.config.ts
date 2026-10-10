import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Tell search engines not to index anything unless ALLOW_INDEXING=true (set on production at launch).
  async headers() {
    if (process.env.ALLOW_INDEXING === "true") return [];
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;