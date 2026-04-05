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

export function resolveLocaleRedirect(requestUrl: string) {
  const { searchParams } = new URL(requestUrl);
  const lang = normalizeStoreLocale(searchParams.get("lang"));
  const redirectPath = resolveSafeRelativeRedirect({
    redirectParam: searchParams.get("redirect"),
    requestUrl,
    fallbackPath: "/",
  });

  return { lang, redirectPath };
}

export function resolveLocaleFromPostPayload(payload: { lang?: string } | null) {
  return normalizeStoreLocale(payload?.lang);
}

export async function GET(request: NextRequest) {
  const { lang, redirectPath } = resolveLocaleRedirect(request.url);

  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  setLocaleCookie(response, lang);

  return response;
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as { lang?: string } | null;
  const lang = resolveLocaleFromPostPayload(payload);

  const response = NextResponse.json({ ok: true, locale: lang });
  setLocaleCookie(response, lang);

  return response;
}
