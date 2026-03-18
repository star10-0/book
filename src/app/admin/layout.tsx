import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <section className="space-y-4" dir="rtl">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">إدارة المتجر</h1>
        <p className="mt-2 text-sm text-slate-600">
          تسجيل الدخول والصلاحيات نقطة تكامل مستقبلية (Auth integration point) وسيتم ربطها في مرحلة لاحقة.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <AdminSidebar />
        <main className="space-y-4">{children}</main>
      </div>
    </section>
  );
}
