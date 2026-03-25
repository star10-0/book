import { PromoCodeAppliesTo, PromoCodeAudience, PromoCodeType } from "@prisma/client";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { formatArabicDate } from "@/lib/formatters/intl";
import { requireAdmin } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { createPromoCodeAction, togglePromoCodeAction } from "./actions";

export default async function AdminPromoCodesPage() {
  await requireAdmin({ callbackUrl: "/admin/promo-codes" });

  const [codes, organizations, creators] = await Promise.all([
    prisma.promoCode.findMany({
      include: {
        organization: { select: { name: true } },
        creator: { select: { email: true } },
        redemptions: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            user: { select: { email: true } },
            order: { select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.organization.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: { in: ["CREATOR", "ADMIN"] } }, select: { id: true, email: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-4">
      <AdminPageCard>
        <AdminPageHeader title="أكواد الخصم" description="إنشاء وإدارة الأكواد المجانية/النسبية/الثابتة مع القيود الخاصة بالمؤسسات والكتّاب." />

        <form action={createPromoCodeAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="code" required placeholder="CODE2026" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input name="internalLabel" placeholder="اسم داخلي" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />

          <select name="type" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {Object.values(PromoCodeType).map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input name="value" type="number" placeholder="قيمة الخصم (بالسنت) أو نسبة %" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />

          <select name="audience" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {Object.values(PromoCodeAudience).map((audience) => (
              <option key={audience} value={audience}>{audience}</option>
            ))}
          </select>

          <select name="appliesTo" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {Object.values(PromoCodeAppliesTo).map((target) => (
              <option key={target} value={target}>{target}</option>
            ))}
          </select>

          <input name="maxTotalUses" type="number" placeholder="أقصى استخدام إجمالي" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input name="maxUsesPerUser" type="number" placeholder="أقصى استخدام لكل مستخدم" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />

          <input name="minimumAmountCents" type="number" placeholder="الحد الأدنى للطلب (بالسنت)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <select name="currency" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">بدون تقييد عملة</option>
            <option value="SYP">SYP</option>
            <option value="USD">USD</option>
          </select>

          <input name="startsAt" type="datetime-local" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input name="expiresAt" type="datetime-local" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />

          <select name="organizationId" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">بدون مؤسسة</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>{organization.name}</option>
            ))}
          </select>

          <select name="creatorId" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">بدون تقييد كاتب</option>
            {creators.map((creator) => (
              <option key={creator.id} value={creator.id}>{creator.email}</option>
            ))}
          </select>

          <textarea name="notes" placeholder="ملاحظات داخلية" className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2" rows={3} />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="isActive" defaultChecked /> مفعل
          </label>

          <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white md:justify-self-start">إنشاء الكود</button>
        </form>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="الأكواد الحالية" description="مع آخر عمليات الاسترداد لكل كود." />
        <div className="space-y-3">
          {codes.map((code) => (
            <article key={code.id} className="rounded-xl border border-slate-200 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-slate-900">{code.code}</p>
                <form action={togglePromoCodeAction}>
                  <input type="hidden" name="promoCodeId" value={code.id} />
                  <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 font-semibold">
                    {code.isActive ? "تعطيل" : "تفعيل"}
                  </button>
                </form>
              </div>

              <p className="mt-1 text-slate-700">
                النوع: {code.type} · القيمة: {code.value ?? "—"} · الجمهور: {code.audience} · المجال: {code.appliesTo}
              </p>
              <p className="mt-1 text-slate-600">
                المؤسسة: {code.organization?.name ?? "عامة"} · الكاتب: {code.creator?.email ?? "غير مقيّد"}
              </p>
              <p className="mt-1 text-slate-500">تاريخ الإنشاء: {formatArabicDate(code.createdAt)}</p>

              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <p className="font-semibold text-slate-800">آخر عمليات الاستخدام</p>
                {code.redemptions.length === 0 ? (
                  <p className="mt-1 text-slate-500">لا يوجد استخدام بعد.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-slate-700">
                    {code.redemptions.map((redemption) => (
                      <li key={redemption.id}>
                        {redemption.user.email} · طلب {redemption.order.id} · الحالة {redemption.status} · {formatArabicDate(redemption.createdAt)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      </AdminPageCard>
    </div>
  );
}
