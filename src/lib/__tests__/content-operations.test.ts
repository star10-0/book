import assert from "node:assert/strict";
import test from "node:test";
import { buildContentOperationsSnapshot } from "@/lib/admin/content-operations";

test("content operational selectors classify review, broken, and metadata queues", () => {
  const snapshot = buildContentOperationsSnapshot([
    {
      id: "book_1",
      titleAr: "كتاب انتظار",
      slug: "pending-book",
      status: "PENDING_REVIEW",
      format: "DIGITAL",
      descriptionAr: "وصف",
      textContent: null,
      metadata: { language: "ar", publisher: "دار" },
      createdAt: new Date("2026-04-04T00:00:00.000Z"),
      author: { nameAr: "مؤلف" },
      category: { nameAr: "تصنيف" },
      files: [{ kind: "COVER_IMAGE", storageKey: "cover.jpg", publicUrl: "https://cdn/cover.jpg", sizeBytes: 1000 }],
      offers: [{ type: "PURCHASE", isActive: true, priceCents: 10000 }],
    },
    {
      id: "book_2",
      titleAr: "كتاب معطوب",
      slug: "broken-book",
      status: "PUBLISHED",
      format: "DIGITAL",
      descriptionAr: null,
      textContent: null,
      metadata: { language: "ar" },
      createdAt: new Date("2026-04-03T00:00:00.000Z"),
      author: { nameAr: "مؤلف" },
      category: { nameAr: "تصنيف" },
      files: [{ kind: "PDF", storageKey: "", publicUrl: "", sizeBytes: 0 }],
      offers: [{ type: "PURCHASE", isActive: false, priceCents: 10000 }],
    },
  ]);

  assert.equal(snapshot.counts.pending_review, 1);
  assert.equal(snapshot.counts.broken_access_readiness, 1);
  assert.equal(snapshot.counts.published_incomplete_metadata, 1);
  assert.equal(snapshot.queues.review.length, 1);
  assert.equal(snapshot.queues.broken.length, 2);
  assert.equal(snapshot.queues.incompleteMetadata.length, 1);

  const brokenSignals = snapshot.books.find((book) => book.id === "book_2")?.signals ?? [];
  assert.equal(brokenSignals.includes("missing_cover"), true);
  assert.equal(brokenSignals.includes("missing_file"), false);
  assert.equal(brokenSignals.includes("missing_active_offer"), true);
  assert.equal(brokenSignals.includes("broken_access_readiness"), true);
});
