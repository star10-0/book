import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getAppBaseUrl } from "@/lib/env";

const STATIC_PUBLIC_ROUTES = ["", "/books", "/about", "/contact", "/help", "/policy", "/curriculum"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appBaseUrl = getAppBaseUrl();

  const [publishedBooks, publicCurriculumLevels, creatorProfiles] = await Promise.all([
    prisma.book.findMany({
      where: {
        status: "PUBLISHED",
        format: "DIGITAL",
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    }),
    prisma.curriculumLevel.findMany({
      where: {
        isActive: true,
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    }),
    prisma.creatorProfile.findMany({
      select: {
        slug: true,
        updatedAt: true,
      },
    }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_PUBLIC_ROUTES.map((path) => ({
    url: `${appBaseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const bookEntries: MetadataRoute.Sitemap = publishedBooks.map((book) => ({
    url: `${appBaseUrl}/books/${book.slug}`,
    lastModified: book.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const curriculumEntries: MetadataRoute.Sitemap = publicCurriculumLevels.map((level) => ({
    url: `${appBaseUrl}/curriculum/${level.slug}`,
    lastModified: level.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const creatorEntries: MetadataRoute.Sitemap = creatorProfiles.map((profile) => ({
    url: `${appBaseUrl}/creators/${profile.slug}`,
    lastModified: profile.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...bookEntries, ...curriculumEntries, ...creatorEntries];
}
