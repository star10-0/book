import type { BookOffer } from "@prisma/client";

export interface CreateOrderRequest {
  bookId: string;
  offerId: string;
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

  return {
    data: {
      bookId: bookId.trim(),
      offerId: offerId.trim(),
    },
  };
}

export function isOfferCurrentlyAvailable(
  offer:
    | (Pick<BookOffer, "isActive" | "startsAt" | "endsAt"> & {
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

  if (offer.startsAt && offer.startsAt > now) {
    return false;
  }

  if (offer.endsAt && offer.endsAt < now) {
    return false;
  }

  return true;
}
