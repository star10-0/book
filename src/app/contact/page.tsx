import type { Metadata } from "next";
import { InfoPageShell } from "@/components/public/info-page-shell";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: "قنوات تواصل مبدئية لفريق Book للدعم والشراكات والاستفسارات العامة.",
};

export default function ContactPage() {
  return (
    <InfoPageShell
      title="تواصل معنا"
      description="هذه صفحة تواصل مبدئية قبل الإطلاق الرسمي. يمكنك استخدامها كمرجع لقنوات الدعم والشراكات."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-bold text-slate-900">الدعم الفني</h2>
          <p className="mt-2 text-sm text-slate-600">support@book.example</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-bold text-slate-900">الشراكات</h2>
          <p className="mt-2 text-sm text-slate-600">partners@book.example</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-bold text-slate-900">أوقات الرد</h2>
          <p className="mt-2 text-sm text-slate-600">من الأحد إلى الخميس — 9:00 صباحًا حتى 5:00 مساءً</p>
        </article>
      </div>
    </InfoPageShell>
  );
}
