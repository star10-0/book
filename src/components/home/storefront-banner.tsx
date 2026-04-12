import Link from "next/link";
import type { CSSProperties } from "react";
import type { StorefrontBannerView } from "@/lib/storefront-banners";
import {
  getBannerHeightClasses,
  getBannerImageClasses,
  getBannerOverlayStyle,
  isSafeBannerUrl,
} from "@/lib/storefront-banners";
import { CoverImage } from "@/components/ui/cover-image";

type StorefrontBannerProps = {
  banner: StorefrontBannerView;
  priority?: boolean;
  className?: string;
  preview?: boolean;
};

export function StorefrontBanner({ banner, priority = false, className, preview = false }: StorefrontBannerProps) {
  const imageClasses = getBannerImageClasses(banner);
  const heightClasses = getBannerHeightClasses(banner);
  const overlayStyle = getBannerOverlayStyle(banner);

  const body = (
    <div className={`relative w-full overflow-hidden border border-slate-300 bg-slate-100 ${heightClasses} ${className ?? ""}`}>
      {banner.mobileImageUrl ? (
        <CoverImage
          src={banner.mobileImageUrl}
          alt={banner.altText}
          fill
          priority={priority}
          sizes="100vw"
          className={`${imageClasses} md:hidden`}
        />
      ) : null}
      <CoverImage
        src={banner.desktopImageUrl}
        alt={banner.altText}
        fill
        priority={priority}
        sizes="100vw"
        className={`${imageClasses} ${banner.mobileImageUrl ? "hidden md:block" : ""}`}
      />

      {overlayStyle ? <div className="pointer-events-none absolute inset-0" style={overlayStyle as CSSProperties} /> : null}
      {preview ? (
        <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
          معاينة
        </div>
      ) : null}
    </div>
  );

  if (!isSafeBannerUrl(banner.clickUrl)) {
    return body;
  }

  const href = banner.clickUrl as string;
  const isExternal = href.startsWith("http://") || href.startsWith("https://");

  return (
    <Link href={href} prefetch={false} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noreferrer" : undefined} aria-label={banner.altText}>
      {body}
    </Link>
  );
}
