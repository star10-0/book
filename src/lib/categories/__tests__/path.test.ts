import assert from "node:assert/strict";
import test from "node:test";
import { buildCatalogBreadcrumbHref, buildCatalogPath, isValidCatalogPathSlugs } from "@/lib/categories/path";
import { CATEGORY_SLUG_PATTERN } from "@/lib/categories/types";

test("buildCatalogPath handles empty and normalized segments", () => {
  assert.equal(buildCatalogPath([]), "/catalog");
  assert.equal(buildCatalogPath([" educational ", "grade-10", ""]), "/catalog/educational/grade-10");
});

test("buildCatalogBreadcrumbHref builds cumulative href", () => {
  assert.equal(buildCatalogBreadcrumbHref(["a", "b", "c"], 0), "/catalog/a");
  assert.equal(buildCatalogBreadcrumbHref(["a", "b", "c"], 2), "/catalog/a/b/c");
});

test("isValidCatalogPathSlugs validates depth and pattern", () => {
  assert.equal(isValidCatalogPathSlugs(["grade-10"], CATEGORY_SLUG_PATTERN), true);
  assert.equal(isValidCatalogPathSlugs([], CATEGORY_SLUG_PATTERN), false);
  assert.equal(isValidCatalogPathSlugs(["INVALID"], CATEGORY_SLUG_PATTERN), false);
  assert.equal(
    isValidCatalogPathSlugs(Array.from({ length: 13 }, (_, index) => `segment-${index}`), CATEGORY_SLUG_PATTERN),
    false,
  );
});
