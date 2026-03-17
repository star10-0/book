import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/constants/app";

type CurrencyFormatterOptions = {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export function formatArabicCurrency(amount: number, options: CurrencyFormatterOptions = {}): string {
  const {
    currency = DEFAULT_CURRENCY,
    locale = DEFAULT_LOCALE,
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = options;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

type DateFormatterOptions = {
  locale?: string;
  dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
  timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
};

export function formatArabicDate(date: Date | string | number, options: DateFormatterOptions = {}): string {
  const { locale = DEFAULT_LOCALE, dateStyle = "medium", timeStyle } = options;

  return new Intl.DateTimeFormat(locale, {
    dateStyle,
    timeStyle,
  }).format(new Date(date));
}
