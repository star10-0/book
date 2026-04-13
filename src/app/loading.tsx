
export default function AppLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="-mx-4 bg-gradient-to-b from-[#FCFCF9] via-[#FAFAF7] to-[#FCFCF9] px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <section className="h-72 animate-pulse rounded-3xl bg-[#F1F1EB]" />
      <section className="mt-8 h-64 animate-pulse rounded-3xl bg-[#F4F4EE]" />
      <section className="mt-8 h-56 animate-pulse rounded-3xl bg-[#F1F1EB]" />
    </main>
  );
}
