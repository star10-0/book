import type { StorefrontBannerView } from "@/lib/storefront-banners";
import { StorefrontBanner } from "@/components/home/storefront-banner";

export function StorefrontBannerList({ banners }: { banners: StorefrontBannerView[] }) {
  if (banners.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 px-3 sm:px-4 lg:px-6" aria-label="عروض إضافية">
      {banners.map((banner) => (
        <StorefrontBanner key={banner.id} banner={banner} className="rounded-2xl border-slate-200" />
      ))}
    </section>
  );
}
