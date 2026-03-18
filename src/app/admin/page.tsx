export default function AdminDashboardPage() {
  const metrics = [
    { label: "إجمالي الكتب", value: "128" },
    { label: "كتب منشورة", value: "94" },
    { label: "طلبات اليوم", value: "17" },
    { label: "مدفوعات قيد المراجعة", value: "6" },
  ];

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">نظرة عامة</h2>
        <p className="mt-2 text-sm text-slate-600">
          لوحة إدارية مبدئية لإدارة الكتب والعروض والطلبات. جميع الإجراءات حاليا على شكل واجهات تمهيدية.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metric.value}</p>
          </article>
        ))}
      </section>
    </>
  );
}
