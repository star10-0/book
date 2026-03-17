import { FileKind } from "@prisma/client";

type BookOption = {
  id: string;
  titleAr: string;
  slug: string;
};

type BookAssetRow = {
  id: string;
  kind: FileKind;
  storageProvider: string;
  storageKey: string;
  mimeType: string | null;
  sizeBytes: number | null;
  book: {
    titleAr: string;
    slug: string;
  };
};

type BookAssetAssociationsProps = {
  books: BookOption[];
  assets: BookAssetRow[];
};

const editableKinds: FileKind[] = [FileKind.COVER_IMAGE, FileKind.EPUB, FileKind.PDF];

export function BookAssetAssociations({ books, assets }: BookAssetAssociationsProps) {
  return (
    <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-slate-900">ربط ملفات الكتب (تهيئة إدارية)</h2>
        <p className="text-sm text-slate-600">
          هذه واجهة تمهيدية لربط الغلاف وملفات EPUB/PDF بالكتاب. سيرفع النظام لاحقًا عبر مزود تخزين مجرد (S3 أو R2).
        </p>
      </div>

      <form className="mt-5 grid gap-4 rounded-xl border border-dashed border-slate-300 p-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          الكتاب
          <select name="bookId" className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none" defaultValue="">
            <option value="" disabled>
              اختر كتابًا
            </option>
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.titleAr} ({book.slug})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          نوع الملف
          <select name="kind" className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none" defaultValue={FileKind.COVER_IMAGE}>
            {editableKinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          storageKey / object key
          <input
            name="storageKey"
            placeholder="books/{bookSlug}/assets/file.ext"
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
          />
        </label>

        <p className="text-xs text-slate-500 md:col-span-2">
          ملاحظة: هذا النموذج واجهة ربط فقط حاليًا، ولا ينفّذ رفع ملفات أو حفظًا مباشرًا بعد.
        </p>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2 font-semibold">الكتاب</th>
              <th className="px-3 py-2 font-semibold">النوع</th>
              <th className="px-3 py-2 font-semibold">المزوّد</th>
              <th className="px-3 py-2 font-semibold">المسار</th>
              <th className="px-3 py-2 font-semibold">MIME</th>
              <th className="px-3 py-2 font-semibold">الحجم</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} className="border-t border-slate-200 text-slate-700">
                <td className="px-3 py-2">{asset.book.titleAr}</td>
                <td className="px-3 py-2">{asset.kind}</td>
                <td className="px-3 py-2">{asset.storageProvider}</td>
                <td className="max-w-xs truncate px-3 py-2" title={asset.storageKey}>
                  {asset.storageKey}
                </td>
                <td className="px-3 py-2">{asset.mimeType ?? "—"}</td>
                <td className="px-3 py-2">{asset.sizeBytes?.toLocaleString("ar-SY") ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
