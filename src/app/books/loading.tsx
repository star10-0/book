import { SiteFooter } from "@/components/site-footer";

export default function BooksLoading() {
  return (
    <main aria-busy="true" aria-live="polite">
      <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="h-10 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-6 w-full animate-pulse rounded bg-slate-200 sm:w-3/4" />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-10 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="mb-4 h-7 w-44 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 p-3">
            <div className="h-52 animate-pulse rounded-xl bg-slate-200" />
            <div className="mt-3 space-y-2">
              <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
              <div className="h-4 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </section>
      <SiteFooter />
    </main>
  );
}
