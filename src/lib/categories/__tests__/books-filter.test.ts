import assert from "node:assert/strict";
import test from "node:test";
import { buildBooksCategoryWhere } from "@/lib/categories/books-filter";

test("books category where returns empty for all", () => {
  assert.deepEqual(buildBooksCategoryWhere("all"), {});
});

test("books category where uses categoryId for id: filters", () => {
  assert.deepEqual(buildBooksCategoryWhere("id:abc123"), {
    categoryId: "abc123",
    category: {
      isActive: true,
    },
  });
});

test("books category where returns empty for malformed id: filters", () => {
  assert.deepEqual(buildBooksCategoryWhere("id:"), {});
});

test("books category where uses deterministic root-level slug fallback", () => {
  assert.deepEqual(buildBooksCategoryWhere("grade-10"), {
    category: {
      slug: "grade-10",
      parentId: null,
      isActive: true,
    },
  });
});
