import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <main>
      <SiteHeader />
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">مرحبًا بكم في Book</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          منصة عربية أولًا لشراء واستئجار الكتب الرقمية، بتجربة قراءة حديثة ومناسبة للهواتف والأجهزة
          اللوحية وسطح المكتب.
        </p>
      </section>
    </main>
  );
}
