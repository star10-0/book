import { OfferType } from "@prisma/client";

export function isNonNegativeInteger(value: number) {
  return Number.isInteger(value) && value >= 0;
}

export function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

export function isValidRating(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export function hasValidRentalDays(type: OfferType | "PURCHASE" | "RENTAL", rentalDays: number | null | undefined) {
  if (type === "PURCHASE") {
    return rentalDays == null;
  }

  return typeof rentalDays === "number" && Number.isInteger(rentalDays) && rentalDays >= 1 && rentalDays <= 365;
}
