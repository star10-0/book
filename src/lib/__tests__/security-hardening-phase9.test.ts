import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { escapeCsvCell, sanitizeCsvCell } from "@/lib/security/csv";

test("admin book-assets API enforces CONTENT_ADMIN scope for all handlers", () => {
  const source = readFileSync("src/app/api/admin/book-assets/route.ts", "utf8");
  assert.equal(source.includes('await requireAdminScope("CONTENT_ADMIN")'), true);
  assert.equal(source.includes("await requireAdmin();"), false);
});

test("admin books pages and actions enforce CONTENT_ADMIN scope", () => {
  const actions = readFileSync("src/app/admin/books/actions.ts", "utf8");
  const listing = readFileSync("src/app/admin/books/page.tsx", "utf8");
  const editPage = readFileSync("src/app/admin/books/[id]/edit/page.tsx", "utf8");
  const newPage = readFileSync("src/app/admin/books/new/page.tsx", "utf8");

  assert.equal(actions.includes('requireAdminScope("CONTENT_ADMIN"'), true);
  assert.equal(listing.includes('await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/books" });'), true);
  assert.equal(editPage.includes('await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/books" });'), true);
  assert.equal(newPage.includes('await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/books/new" });'), true);
});

test("CSV export cells are sanitized against formula injection", () => {
  assert.equal(sanitizeCsvCell("=2+3"), "'=2+3");
  assert.equal(sanitizeCsvCell("+SUM(A1:A2)"), "'+SUM(A1:A2)");
  assert.equal(sanitizeCsvCell("-10"), "'-10");
  assert.equal(sanitizeCsvCell("@cmd"), "'@cmd");
  assert.equal(escapeCsvCell('=cmd|\"x\"'), '"\'=cmd|\"\"x\"\""');
});

test("public version API does not expose full commit SHA field", () => {
  const source = readFileSync("src/app/api/version/route.ts", "utf8");
  assert.equal(source.includes("commitSha"), false);
  assert.equal(source.includes("buildId"), true);
});

test("protected asset URLs use handoff endpoint and token can be resolved from cookie/bearer", () => {
  const source = readFileSync("src/lib/security/content-protection.ts", "utf8");
  assert.equal(source.includes("/handoff`"), true);
  assert.equal(source.includes("resolveProtectedAssetToken"), true);
  assert.equal(source.includes("authorization"), true);
  assert.equal(source.includes("__Host-book-pa"), true);
});
