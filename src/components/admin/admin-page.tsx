import type { ReactNode } from "react";

import Link from "next/link";

type AdminPageCardProps = {
  children: ReactNode;
  className?: string;
};

export function AdminPageCard({ children, className }: AdminPageCardProps) {
  return <section className={`space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className ?? ""}`}>{children}</section>;
}

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  action?: {
    href: string;
    label: string;
  };
};

export function AdminPageHeader({ title, description, action }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
