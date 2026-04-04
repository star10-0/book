import assert from "node:assert/strict";
import test from "node:test";
import { buildCurriculumIntegritySnapshot } from "@/lib/curriculum/integrity";

test("curriculum integrity selectors detect empty levels, unassigned books, and ordering duplicates", () => {
  const snapshot = buildCurriculumIntegritySnapshot({
    levels: [
      {
        id: "level_1",
        nameAr: "الأول",
        slug: "first",
        sortOrder: 1,
        books: [
          {
            id: "link_1",
            sortOrder: 1,
            book: { id: "book_1", titleAr: "كتاب 1", slug: "book-1", status: "PUBLISHED" },
          },
          {
            id: "link_2",
            sortOrder: 1,
            book: { id: "book_2", titleAr: "كتاب 2", slug: "book-2", status: "PUBLISHED" },
          },
        ],
      },
      {
        id: "level_2",
        nameAr: "الثاني",
        slug: "second",
        sortOrder: 1,
        books: [],
      },
    ],
    books: [
      { id: "book_1", titleAr: "كتاب 1", slug: "book-1", status: "PUBLISHED" },
      { id: "book_2", titleAr: "كتاب 2", slug: "book-2", status: "PUBLISHED" },
      { id: "book_3", titleAr: "كتاب 3", slug: "book-3", status: "DRAFT" },
    ],
  });

  assert.equal(snapshot.totals.levels, 2);
  assert.equal(snapshot.totals.emptyLevels, 1);
  assert.equal(snapshot.totals.unassignedBooks, 1);
  assert.equal(snapshot.totals.duplicateLevelOrders, 1);
  assert.equal(snapshot.totals.duplicateBookOrders, 1);
  assert.equal(snapshot.emptyLevels[0]?.id, "level_2");
  assert.equal(snapshot.unassignedBooks[0]?.id, "book_3");
});
