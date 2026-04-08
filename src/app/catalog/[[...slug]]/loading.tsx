export default function CatalogLoading() {
  return (
    <div className="store-shell space-y-4 pb-10 pt-6 sm:space-y-6 sm:pt-8" aria-busy="true" aria-live="polite">
      <div className="h-36 animate-pulse rounded-3xl bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
