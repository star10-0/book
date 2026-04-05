import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET, resolveLocaleFromPostPayload, resolveLocaleRedirect } from "@/app/api/locale/route";

test("resolveLocaleRedirect normalizes locale and blocks unsafe redirect", () => {
  const result = resolveLocaleRedirect("https://book.example/api/locale?lang=en&redirect=https://evil.example/phish");
  assert.equal(result.lang, "en");
  assert.equal(result.redirectPath, "/");
});

test("resolveLocaleRedirect preserves safe in-app redirect path", () => {
  const result = resolveLocaleRedirect("https://book.example/api/locale?lang=ar&redirect=/account/orders?tab=active#top");
  assert.equal(result.lang, "ar");
  assert.equal(result.redirectPath, "/account/orders?tab=active");
});

test("resolveLocaleFromPostPayload falls back to default locale for invalid payload", () => {
  assert.equal(resolveLocaleFromPostPayload({ lang: "unknown" }), "ar");
  assert.equal(resolveLocaleFromPostPayload(null), "ar");
});

test("GET /api/locale sets locale cookie and redirects safely", async () => {
  const request = new NextRequest("https://book.example/api/locale?lang=en&redirect=//evil.example/p");
  const response = await GET(request);

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://book.example/");
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.equal(setCookie.includes("store_locale=en"), true);
});
