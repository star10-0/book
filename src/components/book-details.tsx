import Image from "next/image";
import Link from "next/link";
import type { BookOffer, OfferType } from "@prisma/client";
import { formatArabicCurrency } from "@/lib/formatters/intl";

const defaultCover = "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80";

const offerLabelByType: Record<OfferType, string> = {
  PURCHASE: "شراء رقمي",
  RENTAL: "استئجار رقمي",
};

type BookDetailsProps = {
  book: {
    title: string;
    author: string;
    category: string;
    description: string | null;
    coverImageUrl: string | null;
    publicationDate: Date | null;
  };
  offers: Pick<BookOffer, "id" | "type" | "priceCents" | "currency" | "rentalDays">[];
};

type RelatedBooksProps = {
  books: {
    id: string;
    slug: string;
    title: string;
    author: string;
    coverImageUrl: string | null;
  }[];
};

export function BookDetailsSection({ book, offers }: BookDetailsProps) {
  const purchaseOffer = offers.find((offer) => offer.type === "PURCHASE");
  const rentalOffer = offers.find((offer) => offer.type === "RENTAL");

  return (
    <section aria-labelledby="book-details-title" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <div>
          <Image
            src={book.coverImageUrl ?? defaultCover}
            alt={`غلاف كتاب ${book.title}`}
            width={640}
            height={960}
            className="h-auto w-full rounded-2xl object-cover shadow-sm ring-1 ring-slate-200"
            priority
          />
        </div>

        <div className="space-y-6">
          <header className="space-y-3">
            <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {book.category}
            </span>
            <h1 id="book-details-title" className="text-3xl font-bold text-slate-900 sm:text-4xl">
              {book.title}
            </h1>
            <p className="text-base text-slate-700">تأليف: {book.author}</p>
          </header>

          <section aria-labelledby="book-description" className="space-y-2">
            <h2 id="book-description" className="text-lg font-bold text-slate-900">
              نبذة عن الكتاب
            </h2>
            <p className="text-sm leading-7 text-slate-600 sm:text-base">
              {book.description ?? "لا يتوفر وصف لهذا الكتاب حاليًا."}
            </p>
          </section>

          <BookMetadata publicationDate={book.publicationDate} />

          <BookOffers offers={offers} />

          <section aria-label="إجراءات الشراء والاستئجار" className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={!purchaseOffer}
                className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-label={purchaseOffer ? `شراء الكتاب رقميًا بسعر ${formatOfferPrice(purchaseOffer.priceCents, purchaseOffer.currency)}` : "خيار الشراء غير متاح"}
              >
                {purchaseOffer
                  ? `شراء الآن - ${formatOfferPrice(purchaseOffer.priceCents, purchaseOffer.currency)}`
                  : "الشراء غير متاح"}
              </button>

              <button
                type="button"
                disabled={!rentalOffer}
                className="rounded-xl border border-indigo-600 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                aria-label={
                  rentalOffer
                    ? `استئجار الكتاب رقميًا ${rentalOffer.rentalDays ? `لمدة ${rentalOffer.rentalDays} يوم` : ""} بسعر ${formatOfferPrice(rentalOffer.priceCents, rentalOffer.currency)}`
                    : "خيار الاستئجار غير متاح"
                }
              >
                {rentalOffer
                  ? `استئجار ${rentalOffer.rentalDays ? `(${rentalOffer.rentalDays} يوم)` : ""} - ${formatOfferPrice(rentalOffer.priceCents, rentalOffer.currency)}`
                  : "الاستئجار غير متاح"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function BookMetadata({ publicationDate }: { publicationDate: Date | null }) {
  const metadataItems = [
    { label: "اللغة", value: "العربية" },
    { label: "عدد الصفحات", value: null as string | null },
    {
      label: "سنة النشر",
      value: publicationDate ? String(publicationDate.getFullYear()) : null,
    },
  ].filter((item) => item.value);

  if (metadataItems.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="book-metadata" className="space-y-3">
      <h2 id="book-metadata" className="text-lg font-bold text-slate-900">
        بيانات الكتاب
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        {metadataItems.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <dt className="text-xs font-semibold text-slate-500">{item.label}</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-800">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function BookOffers({ offers }: { offers: Pick<BookOffer, "id" | "type" | "priceCents" | "currency" | "rentalDays">[] }) {
  return (
    <section aria-labelledby="book-offers" className="space-y-3">
      <h2 id="book-offers" className="text-lg font-bold text-slate-900">
        العروض المتاحة
      </h2>

      {offers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600">
          لا توجد عروض متاحة لهذا الكتاب حاليًا.
        </p>
      ) : (
        <ul className="space-y-2">
          {offers.map((offer) => (
            <li key={offer.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">{offerLabelByType[offer.type]}</span>
                {offer.type === "RENTAL" && offer.rentalDays ? (
                  <span className="text-xs text-slate-500">({offer.rentalDays} يوم)</span>
                ) : null}
              </div>
              <span className="font-semibold text-indigo-700">{formatOfferPrice(offer.priceCents, offer.currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RelatedBooksSection({ books }: RelatedBooksProps) {
  return (
    <section aria-labelledby="related-books" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <h2 id="related-books" className="text-2xl font-bold text-slate-900">
        كتب ذات صلة
      </h2>

      {books.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">لا توجد كتب ذات صلة متاحة حاليًا.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {books.map((book) => (
            <article key={book.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <Image
                src={book.coverImageUrl ?? defaultCover}
                alt={`غلاف كتاب ${book.title}`}
                width={480}
                height={720}
                className="h-48 w-full object-cover"
              />
              <div className="space-y-3 p-4">
                <div>
                  <h3 className="line-clamp-2 text-base font-bold text-slate-900">{book.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{book.author}</p>
                </div>
                <Link
                  href={`/books/${book.slug}`}
                  className="inline-flex rounded-lg bg-white px-3 py-2 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  عرض التفاصيل
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatOfferPrice(priceCents: number, currency: string) {
  return formatArabicCurrency(priceCents / 100, { currency });
}
