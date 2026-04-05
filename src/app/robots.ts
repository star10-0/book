import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const appBaseUrl = getAppBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${appBaseUrl}/sitemap.xml`,
    host: appBaseUrl,
  };
}
