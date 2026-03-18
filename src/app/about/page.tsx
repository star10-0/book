import type { Metadata } from "next";
import { InfoPageShell } from "@/components/public/info-page-shell";

export const metadata: Metadata = {
  title: "عن المنصة",
  description: "تعرف على رؤية منصة Book لتقديم تجربة عربية حديثة للكتب الرقمية.",
};

export default function AboutPage() {
  return (
    <InfoPageShell
      title="عن منصة Book"
      description="Book منصة عربية رقمية لشراء واستئجار الكتب بسهولة. نعمل على توفير تجربة قراءة موثوقة وسريعة مع دعم كامل للغة العربية واتجاه RTL."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-bold text-slate-900">رؤيتنا</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">إتاحة المعرفة العربية رقمياً بطريقة عصرية وميسّرة.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-bold text-slate-900">ما الذي نقدمه الآن</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">شراء الكتب الرقمية واستئجارها مع مكتبة شخصية وإدارة للطلبات.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-bold text-slate-900">قريبًا</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">توسّع خيارات الدفع ودعم خدمات إضافية للناشرين والقراء.</p>
        </article>
      </div>
    </InfoPageShell>
  );
}
