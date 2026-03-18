import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function BooksLoading() {
  return (
    <main aria-busy="true" aria-live="polite">
      <SiteHeader />
      <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="h-10 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-6 w-full animate-pulse rounded bg-slate-200 sm:w-3/4" />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-96 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </section>
      <SiteFooter />
    </main>
  );
}
