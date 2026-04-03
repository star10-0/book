export const CART_COOKIE_NAME = "book_cart";
export const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type CartItem = {
  bookId: string;
  offerId: string;
  quantity: number;
};

export function parseCartCookie(rawValue: string | undefined): CartItem[] {
  if (!rawValue) {
    return [];
  }

  try {
    const decoded = decodeURIComponent(rawValue);
    const parsed = JSON.parse(decoded);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const bookId = "bookId" in entry && typeof entry.bookId === "string" ? entry.bookId : "";
        const offerId = "offerId" in entry && typeof entry.offerId === "string" ? entry.offerId : "";
        const quantityValue = "quantity" in entry && typeof entry.quantity === "number" ? entry.quantity : 1;
        const quantity = Number.isFinite(quantityValue) ? Math.max(1, Math.floor(quantityValue)) : 1;

        if (!bookId || !offerId) {
          return null;
        }

        return {
          bookId,
          offerId,
          quantity,
        } satisfies CartItem;
      })
      .filter((entry): entry is CartItem => entry !== null);
  } catch {
    return [];
  }
}

export function serializeCartCookie(items: CartItem[]): string {
  return encodeURIComponent(JSON.stringify(items));
}

export function addItemToCart(items: CartItem[], bookId: string, offerId: string): CartItem[] {
  const targetIndex = items.findIndex((item) => item.bookId === bookId && item.offerId === offerId);

  if (targetIndex === -1) {
    return [...items, { bookId, offerId, quantity: 1 }];
  }

  return items.map((item, index) =>
    index === targetIndex
      ? {
          ...item,
          quantity: item.quantity + 1,
        }
      : item,
  );
}

export function getCartItemsCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
