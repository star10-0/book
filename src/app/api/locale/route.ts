import { NextRequest, NextResponse } from "next/server";
import { normalizeStoreLocale, STORE_LOCALE_COOKIE } from "@/lib/locale";
import { resolveSafeRelativeRedirect } from "@/lib/security/safe-redirect";

function setLocaleCookie(response: NextResponse, locale: string) {
  response.cookies.set(STORE_LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lang = normalizeStoreLocale(searchParams.get("lang"));
  const redirectPath = resolveSafeRelativeRedirect({
    redirectParam: searchParams.get("redirect"),
    requestUrl: request.url,
    fallbackPath: "/",
  });

  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  setLocaleCookie(response, lang);

  return response;
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as { lang?: string } | null;
  const lang = normalizeStoreLocale(payload?.lang);

  const response = NextResponse.json({ ok: true, locale: lang });
  setLocaleCookie(response, lang);

  return response;
}
