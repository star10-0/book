import type { ReactNode } from "react";
import { StudioSidebar } from "@/components/studio/studio-sidebar";
import { requireUser } from "@/lib/auth-session";

type StudioLayoutProps = {
  children: ReactNode;
};

export default async function StudioLayout({ children }: StudioLayoutProps) {
  const user = await requireUser({ callbackUrl: "/studio" });

  return (
    <section className="space-y-4" dir="rtl">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">استوديو الكاتب</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <StudioSidebar isCreator={user.role === "CREATOR" || user.role === "ADMIN"} />
        <main className="space-y-4">{children}</main>
      </div>
    </section>
  );
}
