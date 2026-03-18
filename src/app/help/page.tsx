import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageShell } from "@/components/public/info-page-shell";

export const metadata: Metadata = {
  title: "المساعدة",
  description: "صفحة مساعدة مبدئية للإجابة على أكثر الأسئلة شيوعًا حول استخدام المنصة.",
};

const faqItems = [
  { question: "كيف أشتري كتابًا؟", answer: "اختر الكتاب، ثم العرض المناسب، ثم أكمل خطوات الدفع من صفحة الطلب." },
  { question: "كيف يعمل الاستئجار؟", answer: "عند اختيار عرض الاستئجار، تحصل على وصول مؤقت للكتاب حسب مدة الإعارة." },
  { question: "أين أجد كتبي؟", answer: "كل الكتب التي حصلت عليها تظهر في صفحة مكتبتك ضمن الحساب." },
];

export default function HelpPage() {
  return (
    <InfoPageShell
      title="مركز المساعدة"
      description="هذه صفحة مساعدة أولية. ستتوسع لاحقًا لتشمل مركز معرفة متكامل ودليل استخدام خطوة بخطوة."
    >
      <div className="space-y-3">
        {faqItems.map((item) => (
          <article key={item.question} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-base font-bold text-slate-900">{item.question}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
        لم تجد إجابتك؟ يمكنك <Link className="font-bold underline" href="/contact">التواصل مع فريق الدعم</Link>.
      </div>
    </InfoPageShell>
  );
}
