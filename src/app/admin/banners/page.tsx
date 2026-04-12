import { BannerFitMode, BannerHeightPreset, BannerImagePosition, BannerOverlayColor, BannerPlacement } from "@prisma/client";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { BannerImageField } from "@/components/admin/banner-image-field";
import { StorefrontBanner } from "@/components/home/storefront-banner";
import { requireAdminScope } from "@/lib/auth-session";
import { getHeightPresetLabel } from "@/lib/storefront-banners";
import { prisma } from "@/lib/prisma";
import { createBannerAction, deleteBannerAction, moveBannerAction, toggleBannerActiveAction, updateBannerAction } from "./actions";

const placementLabelMap: Record<BannerPlacement, string> = {
  HOME_HERO: "هيرو الصفحة الرئيسية",
  CATALOG_HERO: "هيرو الكتالوج",
  SECONDARY: "بانر ثانوي",
};

const fitModeLabelMap: Record<BannerFitMode, string> = {
  COVER: "تغطية",
  CONTAIN: "احتواء",
};

const imagePositionLabelMap: Record<BannerImagePosition, string> = {
  CENTER: "وسط",
  TOP: "أعلى",
  BOTTOM: "أسفل",
  LEFT: "يسار",
  RIGHT: "يمين",
};

const overlayColorLabelMap: Record<BannerOverlayColor, string> = {
  NONE: "بدون",
  BLACK: "أسود",
  SLATE: "رصاصي",
  INDIGO: "نيلي",
  EMERALD: "زمردي",
  AMBER: "عنبر",
};

export default async function AdminBannersPage() {
  await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/banners" });

  const banners = await prisma.storefrontBanner.findMany({
    orderBy: [{ placement: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-4">
      <AdminPageCard>
        <AdminPageHeader
          title="إدارة بانرات المتجر"
          description="تحكم بصور الهيرو والإعلانات بشكل آمن: المقاس، التموضع، الارتفاع، الرابط، والتفعيل بدون تعديل الكود."
        />

        <form action={createBannerAction} className="grid gap-3 md:grid-cols-2">
          <input name="name" required placeholder="اسم إداري للبانر" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input name="altText" required placeholder="النص البديل للصورة" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />

          <BannerImageField inputName="desktopImageUrl" label="صورة سطح المكتب" />
          <BannerImageField inputName="mobileImageUrl" label="صورة الجوال (اختياري)" />

          <input name="clickUrl" placeholder="رابط النقر (مثال: /books أو https://...)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input name="sortOrder" type="number" min={0} defaultValue={0} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />

          <select name="placement" defaultValue={BannerPlacement.HOME_HERO} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {Object.values(BannerPlacement).map((placement) => (
              <option key={placement} value={placement}>{placementLabelMap[placement]}</option>
            ))}
          </select>

          <select name="fitMode" defaultValue={BannerFitMode.COVER} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {Object.values(BannerFitMode).map((mode) => (
              <option key={mode} value={mode}>{fitModeLabelMap[mode]}</option>
            ))}
          </select>

          <select name="imagePosition" defaultValue={BannerImagePosition.CENTER} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {Object.values(BannerImagePosition).map((position) => (
              <option key={position} value={position}>{imagePositionLabelMap[position]}</option>
            ))}
          </select>

          <select name="heightDesktop" defaultValue={BannerHeightPreset.MEDIUM} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {Object.values(BannerHeightPreset).map((preset) => (
              <option key={preset} value={preset}>ارتفاع سطح المكتب: {getHeightPresetLabel(preset)}</option>
            ))}
          </select>

          <select name="heightTablet" defaultValue={BannerHeightPreset.MEDIUM} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {Object.values(BannerHeightPreset).map((preset) => (
              <option key={preset} value={preset}>ارتفاع التابلت: {getHeightPresetLabel(preset)}</option>
            ))}
          </select>

          <select name="heightMobile" defaultValue={BannerHeightPreset.SHORT} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {Object.values(BannerHeightPreset).map((preset) => (
              <option key={preset} value={preset}>ارتفاع الجوال: {getHeightPresetLabel(preset)}</option>
            ))}
          </select>

          <select name="overlayColor" defaultValue={BannerOverlayColor.NONE} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {Object.values(BannerOverlayColor).map((color) => (
              <option key={color} value={color}>طبقة لونية: {overlayColorLabelMap[color]}</option>
            ))}
          </select>

          <input name="overlayOpacity" type="number" min={0} max={90} defaultValue={0} placeholder="شفافية الطبقة اللونية 0-90" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="isActive" defaultChecked /> مفعل
          </label>

          <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white md:justify-self-start">إضافة بانر</button>
        </form>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="البانرات الحالية" description="يمكنك تعديل الإعدادات، المعاينة، الترتيب، أو التفعيل/التعطيل." />

        <div className="space-y-4">
          {banners.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">لا توجد بانرات بعد.</p>
          ) : null}

          {banners.map((banner) => (
            <article key={banner.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">{banner.name}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${banner.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                    {banner.isActive ? "مفعل" : "غير مفعل"}
                  </span>
                  <form action={toggleBannerActiveAction}>
                    <input type="hidden" name="bannerId" value={banner.id} />
                    <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold">{banner.isActive ? "تعطيل" : "تفعيل"}</button>
                  </form>
                </div>
              </div>

              <p className="text-xs text-slate-600">
                الموضع: {placementLabelMap[banner.placement]} · الترتيب: {banner.sortOrder} · الملاءمة: {fitModeLabelMap[banner.fitMode]} · التموضع: {imagePositionLabelMap[banner.imagePosition]}
              </p>

              <StorefrontBanner banner={banner} preview className="rounded-xl" />

              <div className="flex flex-wrap gap-2">
                <form action={moveBannerAction}>
                  <input type="hidden" name="bannerId" value={banner.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold">⬆️ لأعلى</button>
                </form>
                <form action={moveBannerAction}>
                  <input type="hidden" name="bannerId" value={banner.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold">⬇️ لأسفل</button>
                </form>
                <form action={deleteBannerAction}>
                  <input type="hidden" name="bannerId" value={banner.id} />
                  <button type="submit" className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700">حذف</button>
                </form>
              </div>

              <details className="rounded-lg border border-slate-200 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-indigo-700">تعديل البانر</summary>
                <form action={updateBannerAction} className="mt-3 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="bannerId" value={banner.id} />
                  <input name="name" required defaultValue={banner.name} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  <input name="altText" required defaultValue={banner.altText} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />

                  <BannerImageField inputName="desktopImageUrl" label="صورة سطح المكتب" defaultValue={banner.desktopImageUrl} />
                  <BannerImageField inputName="mobileImageUrl" label="صورة الجوال" defaultValue={banner.mobileImageUrl} />

                  <input name="clickUrl" defaultValue={banner.clickUrl ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  <input name="sortOrder" type="number" min={0} defaultValue={banner.sortOrder} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />

                  <select name="placement" defaultValue={banner.placement} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    {Object.values(BannerPlacement).map((placement) => (
                      <option key={placement} value={placement}>{placementLabelMap[placement]}</option>
                    ))}
                  </select>
                  <select name="fitMode" defaultValue={banner.fitMode} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    {Object.values(BannerFitMode).map((mode) => (
                      <option key={mode} value={mode}>{fitModeLabelMap[mode]}</option>
                    ))}
                  </select>

                  <select name="imagePosition" defaultValue={banner.imagePosition} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    {Object.values(BannerImagePosition).map((position) => (
                      <option key={position} value={position}>{imagePositionLabelMap[position]}</option>
                    ))}
                  </select>
                  <select name="heightDesktop" defaultValue={banner.heightDesktop} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    {Object.values(BannerHeightPreset).map((preset) => (
                      <option key={preset} value={preset}>ارتفاع سطح المكتب: {getHeightPresetLabel(preset)}</option>
                    ))}
                  </select>

                  <select name="heightTablet" defaultValue={banner.heightTablet} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    {Object.values(BannerHeightPreset).map((preset) => (
                      <option key={preset} value={preset}>ارتفاع التابلت: {getHeightPresetLabel(preset)}</option>
                    ))}
                  </select>
                  <select name="heightMobile" defaultValue={banner.heightMobile} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    {Object.values(BannerHeightPreset).map((preset) => (
                      <option key={preset} value={preset}>ارتفاع الجوال: {getHeightPresetLabel(preset)}</option>
                    ))}
                  </select>

                  <select name="overlayColor" defaultValue={banner.overlayColor} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    {Object.values(BannerOverlayColor).map((color) => (
                      <option key={color} value={color}>طبقة لونية: {overlayColorLabelMap[color]}</option>
                    ))}
                  </select>
                  <input name="overlayOpacity" type="number" min={0} max={90} defaultValue={banner.overlayOpacity} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="isActive" defaultChecked={banner.isActive} /> مفعل
                  </label>

                  <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white md:justify-self-start">حفظ التعديل</button>
                </form>
              </details>
            </article>
          ))}
        </div>
      </AdminPageCard>
    </div>
  );
}
