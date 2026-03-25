import { PromoCodeAppliesTo, PromoCodeType } from "@prisma/client";
import { requireCreator } from "@/lib/auth-session";
import { formatArabicDate } from "@/lib/formatters/intl";
import { prisma } from "@/lib/prisma";
import { createCreatorPromoCodeAction } from "./actions";

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
            <p className="font-bold text-slate-900">{code.code}</p>
            <p className="mt-1 text-slate-700">{code.type} · {code.value ?? "—"} · {code.appliesTo} · {code.isActive ? "مفعل" : "معطل"}</p>
            <p className="mt-1 text-slate-500">أُنشئ بتاريخ {formatArabicDate(code.createdAt)}</p>
            <div className="mt-2 text-xs text-slate-600">
              آخر الاستخدامات: {code.redemptions.length === 0 ? "لا يوجد" : code.redemptions.map((r) => `${r.user.email} (${r.status})`).join("، ")}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
