import { SiteHeader } from "@/components/site-header";

export default function BookDetailsLoading() {
  return (
    <main aria-busy="true" aria-live="polite">
      <SiteHeader />
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <div className="h-[420px] animate-pulse rounded-2xl bg-slate-200" />
          <div className="space-y-4">
            <div className="h-6 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="h-28 animate-pulse rounded bg-slate-200" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-12 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-200" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
