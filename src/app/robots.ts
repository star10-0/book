import type { MetadataRoute } from "next";
import { getAppBaseUrl, getNodeEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots["rules"] = {
    userAgent: "*",
    allow: "/",
  };

  if (getNodeEnv() !== "production") {
    return { rules };
  }

  const appBaseUrl = getAppBaseUrl();

  return {
    rules,
    sitemap: `${appBaseUrl}/sitemap.xml`,
    host: appBaseUrl,
  };
}
