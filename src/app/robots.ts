import type { MetadataRoute } from "next";

// Blocks all crawlers unless ALLOW_INDEXING=true is set on the host (production at launch).
export default function robots(): MetadataRoute.Robots {
  if (process.env.ALLOW_INDEXING === "true") {
    return { rules: { userAgent: "*", allow: "/" } };
  }
  return { rules: { userAgent: "*", disallow: "/" } };
}