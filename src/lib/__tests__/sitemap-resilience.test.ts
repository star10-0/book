import assert from "node:assert/strict";
import test from "node:test";
import sitemap from "@/app/sitemap";
import { prisma } from "@/lib/prisma";

test("sitemap falls back to static entries when database is unavailable", async () => {
  const originalBookFindMany = prisma.book.findMany;
  const originalLevelsFindMany = prisma.curriculumLevel.findMany;
  const originalCreatorFindMany = prisma.creatorProfile.findMany;
  const originalBaseUrl = process.env.APP_BASE_URL;

  process.env.APP_BASE_URL = "https://book.example";

  prisma.book.findMany = (async () => {
    throw new Error("db unavailable");
  }) as typeof prisma.book.findMany;

  prisma.curriculumLevel.findMany = (async () => []) as typeof prisma.curriculumLevel.findMany;
  prisma.creatorProfile.findMany = (async () => []) as typeof prisma.creatorProfile.findMany;

  try {
    const manifest = await sitemap();
    assert.equal(manifest.length > 0, true);
    assert.equal(manifest.some((item) => item.url === "https://book.example/books"), true);
  } finally {
    prisma.book.findMany = originalBookFindMany;
    prisma.curriculumLevel.findMany = originalLevelsFindMany;
    prisma.creatorProfile.findMany = originalCreatorFindMany;

    if (typeof originalBaseUrl === "string") process.env.APP_BASE_URL = originalBaseUrl;
    else delete process.env.APP_BASE_URL;
  }
});
