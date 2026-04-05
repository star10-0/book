import { normalizeStoreLocale } from "@/lib/locale";
import { resolveSafeRelativeRedirect } from "@/lib/security/safe-redirect";

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
