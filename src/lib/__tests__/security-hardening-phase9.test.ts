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
  assert.equal(sanitizeCsvCell("\t=cmd"), "'\t=cmd");
  assert.equal(sanitizeCsvCell("   -100"), "'   -100");
});

test("public version API is minimal and does not expose diagnostic timestamps or full commit SHA", () => {
  const source = readFileSync("src/app/api/version/route.ts", "utf8");
  assert.equal(source.includes("commitSha"), false);
  assert.equal(source.includes("generatedAt"), false);
  assert.equal(source.includes("ok: true"), true);
  assert.equal(source.includes("build:"), true);
});

test("protected asset URLs use handoff endpoint and do not allow query-token fallback", () => {
  const source = readFileSync("src/lib/security/content-protection.ts", "utf8");
  assert.equal(source.includes("/handoff`"), true);
  assert.equal(source.includes("allowQueryToken"), false);
  assert.equal(source.includes('searchParams.get("t")'), false);
  assert.equal(source.includes("readBearerToken(request)"), true);
  assert.equal(source.includes("book-pa-s-a"), true);
  assert.equal(source.includes("book-pa-s-e"), true);
  assert.equal(source.includes("book-pa-ht"), true);
  assert.equal(source.includes("createHmac"), true);
});

test("handoff bootstrap enforces one-time ticket redemption before issuing opaque asset session", () => {
  const source = readFileSync("src/app/api/books/assets/[fileId]/bootstrap/route.ts", "utf8");
  assert.equal(source.includes("protectedAssetHandoffTicket.updateMany"), true);
  assert.equal(source.includes("redeemedAt: null"), true);
  assert.equal(source.includes("redeemedTicket.count !== 1"), true);
  assert.equal(source.includes("protectedAssetSession.create"), true);
  assert.equal(source.includes("hashOpaqueHandle(assetSessionHandle)"), true);
  assert.equal(source.includes('path: "/api/books/assets"'), true);
  assert.equal(source.includes('path: "/api/reader-epub"'), true);
  assert.equal(source.includes('path: "/api"'), false);
});

test("asset and EPUB routes rely on opaque session handles instead of signed payload tokens", () => {
  const assetRoute = readFileSync("src/app/api/books/assets/[fileId]/route.ts", "utf8");
  const epubSectionsRoute = readFileSync("src/app/api/reader-epub/[fileId]/sections/route.ts", "utf8");

  assert.equal(assetRoute.includes("verifyProtectedAssetToken"), false);
  assert.equal(epubSectionsRoute.includes("verifyProtectedAssetToken"), false);
  assert.equal(assetRoute.includes("resolveOpaqueHandleFromRequest"), true);
  assert.equal(epubSectionsRoute.includes("resolveOpaqueHandleFromRequest"), true);
});

test("admin content operations enforce CONTENT_ADMIN scope across authors/categories/promo flows", () => {
  const authorsPage = readFileSync("src/app/admin/authors/page.tsx", "utf8");
  const authorsActions = readFileSync("src/app/admin/authors/actions.ts", "utf8");
  const categoriesPage = readFileSync("src/app/admin/categories/page.tsx", "utf8");
  const categoriesActions = readFileSync("src/app/admin/categories/actions.ts", "utf8");
  const promoPage = readFileSync("src/app/admin/promo-codes/page.tsx", "utf8");
  const promoActions = readFileSync("src/app/admin/promo-codes/actions.ts", "utf8");

  assert.equal(authorsPage.includes('requireAdminScope("CONTENT_ADMIN"'), true);
  assert.equal(authorsActions.includes('requireAdminScope("CONTENT_ADMIN"'), true);
  assert.equal(categoriesPage.includes('requireAdminScope("CONTENT_ADMIN"'), true);
  assert.equal(categoriesActions.includes('requireAdminScope("CONTENT_ADMIN"'), true);
  assert.equal(promoPage.includes('requireAdminScope("CONTENT_ADMIN"'), true);
  assert.equal(promoActions.includes('requireAdminScope("CONTENT_ADMIN"'), true);
});

test("admin order integrity operations enforce PAYMENT_ADMIN and BREAK_GLASS scopes", () => {
  const ordersPage = readFileSync("src/app/admin/orders/page.tsx", "utf8");
  const ordersActions = readFileSync("src/app/admin/orders/actions.ts", "utf8");

  assert.equal(ordersPage.includes('requireAdminScope("PAYMENT_ADMIN"'), true);
  assert.equal(ordersActions.includes('requireAdminScope("PAYMENT_ADMIN"'), true);
  assert.equal(ordersActions.includes('requireAdminScope("BREAK_GLASS_PAYMENT_ADMIN"'), true);
});

test("admin diagnostics version endpoint requires SUPER_ADMIN scope", () => {
  const source = readFileSync("src/app/api/admin/version/route.ts", "utf8");
  assert.equal(source.includes('requireAdminScope("SUPER_ADMIN"'), true);
});
