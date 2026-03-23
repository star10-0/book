import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/checkout", "/reader", "/api"],
    },
    sitemap: "https://book.example/sitemap.xml",
    host: "https://book.example",
  };
}
