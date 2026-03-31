import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";

type InfoPageShellProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export async function InfoPageShell({ title, description, children }: InfoPageShellProps) {
  return (
    <main>
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm leading-8 text-slate-600 sm:text-base">{description}</p>

        {children ? <div className="mt-8">{children}</div> : null}
      </section>
      <SiteFooter />
    </main>
  );
}
