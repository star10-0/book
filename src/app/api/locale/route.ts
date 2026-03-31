import { NextRequest, NextResponse } from "next/server";
import { normalizeStoreLocale, STORE_LOCALE_COOKIE } from "@/lib/locale";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lang = normalizeStoreLocale(searchParams.get("lang"));
  const redirect = searchParams.get("redirect") || "/";

  const response = NextResponse.redirect(new URL(redirect, request.url));
  response.cookies.set(STORE_LOCALE_COOKIE, lang, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
