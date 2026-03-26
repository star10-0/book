import { PromoCodeAppliesTo, PromoCodeType } from "@prisma/client";
import { requireCreator } from "@/lib/auth-session";
import { formatArabicDate } from "@/lib/formatters/intl";
import { prisma } from "@/lib/prisma";
import { createCreatorPromoCodeAction, toggleCreatorPromoCodeAction, updateCreatorPromoCodeAction } from "./actions";

function formatPromoType(type: PromoCodeType) {
  if (type === PromoCodeType.FREE) return "مجاني بالكامل";
  if (type === PromoCodeType.FIXED) return "خصم ثابت";
  return "خصم نسبي (%)";
}

function formatAppliesTo(value: PromoCodeAppliesTo) {
  if (value === PromoCodeAppliesTo.PURCHASE) return "شراء فقط";
  if (value === PromoCodeAppliesTo.RENTAL) return "إيجار فقط";
  if (value === PromoCodeAppliesTo.PUBLISHING_FEE) return "رسوم نشر";
  return "أي نوع طلب";
}

export default async function StudioPromoCodesPage() {
  const user = await requireCreator({ callbackUrl: "/studio/promo-codes" });

  const codes = await prisma.promoCode.findMany({
    where: { creatorId: user.id },
    include: {
      redemptions: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { email: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-900">أكواد الخصم الخاصة بالكاتب</h2>
        <p className="mt-1 text-sm text-slate-600">يمكنك إنشاء أكواد خصم مقيّدة بحساب الكاتب الخاص بك.</p>
        <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
          للأعمال/المؤسسات: عند مشاركة كود مع جهة محددة، وضّح لهم أن نجاح التطبيق يتأثر بنوع الطلب (شراء/إيجار) والحد الأدنى للسعر وحدود الاستخدام.
        </div>
      </div>

      <form action={createCreatorPromoCodeAction} className="grid gap-3 md:grid-cols-2">
        <input name="code" required placeholder="CREATOR30" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        <select name="type" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          {Object.values(PromoCodeType).map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <input name="value" type="number" placeholder="القيمة" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        <select name="appliesTo" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          {[PromoCodeAppliesTo.ANY, PromoCodeAppliesTo.PURCHASE, PromoCodeAppliesTo.RENTAL].map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>

        <input name="maxTotalUses" type="number" placeholder="أقصى استخدام إجمالي" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        <input name="maxUsesPerUser" type="number" placeholder="أقصى استخدام لكل مستخدم" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        <input name="minimumAmountCents" type="number" placeholder="الحد الأدنى للطلب (بالسنت)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />

        <textarea name="notes" rows={2} placeholder="ملاحظات" className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
        <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white md:justify-self-start">إنشاء</button>
      </form>

      <div className="space-y-3">
        {codes.map((code) => (
          <article key={code.id} className="rounded-xl border border-slate-200 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-slate-900">{code.code}</p>
              <form action={toggleCreatorPromoCodeAction}>
                <input type="hidden" name="promoCodeId" value={code.id} />
                <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 font-semibold">
                  {code.isActive ? "تعطيل" : "تفعيل"}
                </button>
              </form>
            </div>
            <p className="mt-1 text-slate-700">
              {formatPromoType(code.type)} · القيمة: {code.value ?? "—"} · {formatAppliesTo(code.appliesTo)} · {code.isActive ? "مفعل" : "معطل"}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              الاستخدام: إجمالي {code.maxTotalUses ?? "غير محدود"} · لكل مستخدم {code.maxUsesPerUser ?? "غير محدود"} · حد أدنى {code.minimumAmountCents ?? 0} سنت
            </p>
            <p className="mt-1 text-slate-500">أُنشئ بتاريخ {formatArabicDate(code.createdAt)}</p>
            <div className="mt-2 text-xs text-slate-600">
              آخر الاستخدامات: {code.redemptions.length === 0 ? "لا يوجد" : code.redemptions.map((r) => `${r.user.email} (${r.status})`).join("، ")}
            </div>

            <details className="mt-3 rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer font-semibold text-indigo-700">تعديل الكود</summary>
              <form action={updateCreatorPromoCodeAction} className="mt-3 grid gap-2 md:grid-cols-2">
                <input type="hidden" name="promoCodeId" value={code.id} />
                <input name="code" required defaultValue={code.code} className="rounded-xl border border-slate-300 px-3 py-2" />
                <select name="type" defaultValue={code.type} className="rounded-xl border border-slate-300 px-3 py-2">
                  {Object.values(PromoCodeType).map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <input name="value" type="number" defaultValue={code.value ?? ""} placeholder="القيمة" className="rounded-xl border border-slate-300 px-3 py-2" />
                <select name="appliesTo" defaultValue={code.appliesTo} className="rounded-xl border border-slate-300 px-3 py-2">
                  {[PromoCodeAppliesTo.ANY, PromoCodeAppliesTo.PURCHASE, PromoCodeAppliesTo.RENTAL].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                <input name="maxTotalUses" type="number" defaultValue={code.maxTotalUses ?? ""} placeholder="أقصى استخدام إجمالي" className="rounded-xl border border-slate-300 px-3 py-2" />
                <input name="maxUsesPerUser" type="number" defaultValue={code.maxUsesPerUser ?? ""} placeholder="أقصى استخدام لكل مستخدم" className="rounded-xl border border-slate-300 px-3 py-2" />
                <input name="minimumAmountCents" type="number" defaultValue={code.minimumAmountCents ?? ""} placeholder="الحد الأدنى (سنت)" className="rounded-xl border border-slate-300 px-3 py-2" />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="isActive" defaultChecked={code.isActive} /> مفعل
                </label>
                <textarea name="notes" rows={2} defaultValue={code.notes ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 md:col-span-2" />
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white md:justify-self-start">حفظ</button>
              </form>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
