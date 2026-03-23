import type { MetadataRoute } from "next";

const PUBLIC_ROUTES = ["", "/books", "/about", "/contact", "/help", "/login", "/register"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PUBLIC_ROUTES.map((path) => ({
    url: `https://book.example${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
