import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/lib/env";

const PUBLIC_ROUTES = ["", "/books", "/about", "/contact", "/help", "/login", "/register"];

export default function sitemap(): MetadataRoute.Sitemap {
  const appBaseUrl = getAppBaseUrl();
  const now = new Date();

  return PUBLIC_ROUTES.map((path) => ({
    url: `${appBaseUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
