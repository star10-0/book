"use client";

import { useEffect, useState } from "react";
import {
  addItemToCart,
  CART_COOKIE_MAX_AGE_SECONDS,
  CART_COOKIE_NAME,
  getCartItemsCount,
  parseCartCookie,
  serializeCartCookie,
} from "@/lib/cart";

const CART_UPDATED_EVENT = "book:cart-updated";

type AddToCartButtonProps = {
  bookId: string;
  offerId: string;
  className?: string;
  label: string;
};

export function AddToCartButton({ bookId, offerId, className, label }: AddToCartButtonProps) {
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState("تمت الإضافة إلى السلة");

  useEffect(() => {
    if (!feedbackVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => setFeedbackVisible(false), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [feedbackVisible]);

  const handleAddToCart = () => {
    const existing = parseCartCookie(readCookie(CART_COOKIE_NAME));
    const alreadyInCart = existing.some((item) => item.bookId === bookId && item.offerId === offerId);
    const updated = addItemToCart(existing, bookId, offerId);

    document.cookie = `${CART_COOKIE_NAME}=${serializeCartCookie(updated)}; path=/; max-age=${CART_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: { count: getCartItemsCount(updated) } }));

    setFeedbackText(alreadyInCart ? "العرض موجود بالفعل في السلة" : "تمت الإضافة إلى السلة");
    setFeedbackVisible(true);
  };

  return (
    <div className="flex flex-col items-stretch gap-1.5 sm:items-start">
      <button type="button" onClick={handleAddToCart} className={className}>
        {label}
      </button>
      <p aria-live="polite" className={`text-[11px] font-medium text-emerald-700 transition ${feedbackVisible ? "opacity-100" : "opacity-0"}`}>
        {feedbackText}
      </p>
    </div>
  );
}

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  const parts = document.cookie.split(";");

  for (const part of parts) {
    const normalized = part.trim();

    if (normalized.startsWith(prefix)) {
      return normalized.slice(prefix.length);
    }
  }

  return undefined;
}

export { CART_UPDATED_EVENT };
