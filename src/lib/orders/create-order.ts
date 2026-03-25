import { AccessGrantType, type BookOffer } from "@prisma/client";
import { hasValidRentalDays } from "@/lib/services/invariants";

const CUID_PATTERN = /^[a-z0-9]{8,36}$/;

export interface CreateOrderRequest {
  bookId: string;
  offerId: string;
}

export interface OrderTotals {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

export function validateCreateOrderPayload(payload: unknown): { data?: CreateOrderRequest; error?: string } {
  if (!payload || typeof payload !== "object") {
    return { error: "بيانات الطلب غير صالحة." };
  }

  const { bookId, offerId } = payload as Record<string, unknown>;

  if (typeof bookId !== "string" || bookId.trim().length === 0) {
    return { error: "حقل bookId مطلوب." };
  }

  if (typeof offerId !== "string" || offerId.trim().length === 0) {
    return { error: "حقل offerId مطلوب." };
  }

  const normalizedBookId = bookId.trim();
  const normalizedOfferId = offerId.trim();

  if (!isLikelyId(normalizedBookId) || !isLikelyId(normalizedOfferId)) {
    return { error: "معرّفات الطلب غير صالحة." };
  }

  return {
    data: {
      bookId: normalizedBookId,
      offerId: normalizedOfferId,
    },
  };
}

export function isOfferCurrentlyAvailable(
  offer:
    | (Pick<BookOffer, "isActive" | "startsAt" | "endsAt" | "type" | "rentalDays"> & {
        book: { status: string; format: string };
      })
    | null,
  now: Date,
) {
  if (!offer) {
    return false;
  }

  if (!offer.isActive) {
    return false;
  }

  if (offer.book.status !== "PUBLISHED" || offer.book.format !== "DIGITAL") {
    return false;
  }

  if (!hasValidRentalDays(offer.type, offer.rentalDays)) {
    return false;
  }

  if (offer.startsAt && offer.startsAt > now) {
    return false;
  }

  if (offer.endsAt && offer.endsAt < now) {
    return false;
  }

  return true;
}

export function mapOfferTypeToAccessGrantType(offerType: BookOffer["type"]): AccessGrantType {
  return offerType === "PURCHASE" ? AccessGrantType.PURCHASE : AccessGrantType.RENTAL;
}

export function calculateOrderTotals(input: { subtotalCents: number; discountCents?: number }): OrderTotals | null {
  const subtotalCents = normalizeSafeMoneyCents(input.subtotalCents);
  if (subtotalCents === null) {
    return null;
  }

  const discountRaw = typeof input.discountCents === "number" ? input.discountCents : 0;
  const discountCents = normalizeSafeMoneyCents(discountRaw);
  if (discountCents === null) {
    return null;
  }

  const boundedDiscount = Math.min(discountCents, subtotalCents);

  return {
    subtotalCents,
    discountCents: boundedDiscount,
    totalCents: subtotalCents - boundedDiscount,
  };
}

function isLikelyId(value: string) {
  return CUID_PATTERN.test(value);
}

function normalizeSafeMoneyCents(value: number) {
  if (!Number.isInteger(value) || value < 0) {
    return null;
  }

  return value;
}
