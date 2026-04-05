import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/auth-session";

type AdminLayoutProps = {
  children: ReactNode;
};

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdmin({ callbackUrl: "/admin" });

  return (
    <section className="space-y-4" dir="rtl">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">إدارة المتجر</h1>
        <p className="mt-2 text-sm text-slate-600">منطقة إدارية محمية ومقتصرة على حسابات المشرفين.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <AdminSidebar />
        <main className="space-y-4">{children}</main>
      </div>
    </section>
  );
}
