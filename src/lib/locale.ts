import { cookies } from "next/headers";

export const STORE_LOCALE_COOKIE = "store_locale";

export type StoreLocale = "ar" | "en";

export function normalizeStoreLocale(value: string | null | undefined): StoreLocale {
  return value === "en" ? "en" : "ar";
}

export async function getStoreLocale(): Promise<StoreLocale> {
  const store = await cookies();
  return normalizeStoreLocale(store.get(STORE_LOCALE_COOKIE)?.value);
}

export function getStoreDirection(locale: StoreLocale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
