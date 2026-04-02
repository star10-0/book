"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CART_UPDATED_EVENT } from "@/components/add-to-cart-button";

type CartLinkProps = {
  href: string;
  className: string;
  label: string;
  initialCount: number;
};

export function CartLink({ href, className, label, initialCount }: CartLinkProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ count?: number }>;
      const nextCount = customEvent.detail?.count;

      if (typeof nextCount === "number" && Number.isFinite(nextCount)) {
        setCount(Math.max(0, Math.floor(nextCount)));
      }
    };

    window.addEventListener(CART_UPDATED_EVENT, handler);
    return () => window.removeEventListener(CART_UPDATED_EVENT, handler);
  }, []);

  return (
    <Link href={href} className={className}>
      <span>{label}</span>
      {count > 0 ? (
        <span className="mr-1 inline-flex min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold leading-4 text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
