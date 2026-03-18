import { SiteHeader } from "@/components/site-header";

export default function AppLoading() {
  return (
    <main aria-busy="true" aria-live="polite">
      <SiteHeader />
      <section className="h-72 animate-pulse rounded-3xl bg-slate-200" />
      <section className="mt-8 h-64 animate-pulse rounded-3xl bg-slate-200" />
      <section className="mt-8 h-56 animate-pulse rounded-3xl bg-slate-200" />
    </main>
  );
}
