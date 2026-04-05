import type { MetadataRoute } from "next";
import { getAppBaseUrl, getNodeEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const isProduction = getNodeEnv() === "production";

  const rules: MetadataRoute.Robots["rules"] = {
    userAgent: "*",
    allow: isProduction ? "/" : "",
    disallow: isProduction ? "" : "/",
  };

  if (!isProduction) {
    return { rules };
  }

  const appBaseUrl = getAppBaseUrl();

  return {
    rules,
    sitemap: `${appBaseUrl}/sitemap.xml`,
    host: appBaseUrl,
  };
}
