"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type HeaderCategoryOption = {
  value: string;
  label: string;
};

type SiteHeaderSearchFormProps = {
  action: string;
  searchPlaceholder: string;
  searchAria: string;
  searchCta: string;
  allLabel: string;
  categories: HeaderCategoryOption[];
};

const INITIAL_VISIBLE_CATEGORIES = 9;

export function SiteHeaderSearchForm({ action, searchPlaceholder, searchAria, searchCta, allLabel, categories }: SiteHeaderSearchFormProps) {
  const searchParams = useSearchParams();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_CATEGORIES);
  const [selectedValue, setSelectedValue] = useState("all");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const categoryFromUrl = searchParams.get("category")?.trim() ?? "all";

  useEffect(() => {
    if (!categoryFromUrl || categoryFromUrl === "all") {
      setSelectedValue("all");
      return;
    }

    const exists = categories.some((item) => item.value === categoryFromUrl);
    setSelectedValue(exists ? categoryFromUrl : "all");
  }, [categories, categoryFromUrl]);

  const selectedCategory = useMemo(() => {
    if (!selectedValue || selectedValue === "all") {
      return { value: "all", label: allLabel };
    }

    return categories.find((item) => item.value === selectedValue) ?? { value: "all", label: allLabel };
  }, [allLabel, categories, selectedValue]);

  const visibleCategories = categories.slice(0, visibleCount);
  const shouldShowMoreAction = visibleCount < categories.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setVisibleCount(INITIAL_VISIBLE_CATEGORIES);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <form action={action} method="get" className="order-last w-full lg:order-none lg:mx-auto lg:max-w-3xl">
      <div className="flex overflow-visible rounded-xl border border-slate-600/85 bg-slate-900/60 ring-1 ring-slate-700/70 transition-colors duration-200 focus-within:border-amber-300/55 focus-within:ring-amber-200/30">
        <div ref={wrapperRef} className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isDropdownOpen}
            onClick={() =>
              setIsDropdownOpen((prev) => {
                if (prev) {
                  setVisibleCount(INITIAL_VISIBLE_CATEGORIES);
                }
                return !prev;
              })
            }
            className="inline-flex h-10 min-w-[5.25rem] items-center justify-between gap-2 border-s border-slate-700/90 bg-slate-800/95 px-3 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:px-3.5"
          >
            <span className="max-w-[6.5rem] truncate">{selectedCategory.label}</span>
            <span aria-hidden className="text-[10px] text-slate-400">▾</span>
          </button>

          {isDropdownOpen ? (
            <div className="absolute start-0 top-[calc(100%+0.35rem)] z-[90] w-52 overflow-hidden rounded-xl border border-slate-700/90 bg-slate-900/98 shadow-xl ring-1 ring-black/25">
              <div className="max-h-64 overflow-y-auto py-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedValue("all");
                    setIsDropdownOpen(false);
                    setVisibleCount(INITIAL_VISIBLE_CATEGORIES);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-right text-xs font-semibold transition-colors ${
                    selectedCategory.value === "all" ? "bg-slate-800/90 text-amber-200" : "text-slate-100 hover:bg-slate-800/70"
                  }`}
                >
                  <span>{allLabel}</span>
                  {selectedCategory.value === "all" ? <span className="text-[10px]">✓</span> : null}
                </button>

                {visibleCategories.map((item) => {
                  const isSelected = selectedCategory.value === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setSelectedValue(item.value);
                        setIsDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-right text-xs transition-colors ${
                        isSelected ? "bg-slate-800/90 font-semibold text-amber-200" : "text-slate-100 hover:bg-slate-800/70"
                      }`}
                    >
                      <span className="line-clamp-1">{item.label}</span>
                      {isSelected ? <span className="text-[10px]">✓</span> : null}
                    </button>
                  );
                })}
              </div>

              {shouldShowMoreAction ? (
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => Math.min(count + INITIAL_VISIBLE_CATEGORIES, categories.length))}
                  className="w-full border-t border-slate-700/80 px-3 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-slate-800/80"
                >
                  عرض المزيد
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <input type="hidden" name="category" value={selectedCategory.value} />

        <input
          type="search"
          name="q"
          defaultValue={searchParams.get("q") ?? ""}
          placeholder={searchPlaceholder}
          className="h-10 w-full border-0 bg-transparent px-3.5 text-sm text-slate-50 outline-none placeholder:text-slate-400"
          aria-label={searchAria}
        />

        <button
          type="submit"
          className="h-10 border-s border-amber-200/35 bg-amber-300/90 px-4 text-xs font-bold text-slate-950 transition-colors duration-200 hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 sm:px-5"
        >
          {searchCta}
        </button>
      </div>
    </form>
  );
}
