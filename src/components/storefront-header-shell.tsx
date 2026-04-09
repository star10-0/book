"use client";

import { useEffect, useRef, useState } from "react";

type StorefrontHeaderShellProps = {
  children: React.ReactNode;
};

const SCROLL_TOP_SHOW_THRESHOLD = 24;
const SCROLL_HIDE_START = 120;
const SCROLL_DELTA_TOLERANCE = 4;
const SCROLL_REVEAL_DELTA = -3;
const SCROLL_HIDE_DELTA = 3;

export function StorefrontHeaderShell({ children }: StorefrontHeaderShellProps) {
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const currentHiddenState = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    lastScrollY.current = window.scrollY;

    const onScroll = () => {
      if (ticking.current) return;

      ticking.current = true;
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY.current;

        if (Math.abs(delta) < SCROLL_DELTA_TOLERANCE) {
          lastScrollY.current = currentY;
          ticking.current = false;
          return;
        }

        if (currentY <= SCROLL_TOP_SHOW_THRESHOLD) {
          if (currentHiddenState.current) {
            currentHiddenState.current = false;
            setIsHidden(false);
          }
        } else if (delta >= SCROLL_HIDE_DELTA && currentY > SCROLL_HIDE_START) {
          if (!currentHiddenState.current) {
            currentHiddenState.current = true;
            setIsHidden(true);
          }
        } else if (delta <= SCROLL_REVEAL_DELTA) {
          if (currentHiddenState.current) {
            currentHiddenState.current = false;
            setIsHidden(false);
          }
        }

        lastScrollY.current = currentY;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`sticky top-0 z-40 w-screen max-w-none [margin-inline:calc(50%_-_50vw)] will-change-transform transition-transform duration-300 ease-out motion-reduce:transition-none ${
        isHidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {children}
    </div>
  );
}
