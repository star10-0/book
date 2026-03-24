import { OfferType } from "@prisma/client";

export function isNonNegativeInteger(value: number) {
  return Number.isInteger(value) && value >= 0;
}

export function normalizeNonNegativeMoneyCents(value: number) {
  return isNonNegativeInteger(value) ? value : null;
}

export function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

export function isValidRating(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export function normalizeRating(value: unknown) {
  const rating = Number(value);
  return isValidRating(rating) ? rating : null;
}

export function hasValidRentalDays(type: OfferType | "PURCHASE" | "RENTAL", rentalDays: number | null | undefined) {
  if (type === "PURCHASE") {
    return rentalDays == null;
  }

  return typeof rentalDays === "number" && Number.isInteger(rentalDays) && rentalDays >= 1 && rentalDays <= 365;
}

export function normalizeProviderReference(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
