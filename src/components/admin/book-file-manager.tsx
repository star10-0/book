"use client";

import { FileKind } from "@prisma/client";
import { useMemo, useState } from "react";

type BookAssetItem = {
  id: string;
  bookId: string;
  kind: FileKind;
  publicUrl: string | null;
  originalFileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

type BookFileManagerProps = {
  bookId: string;
  initialAssets: BookAssetItem[];
  apiBasePath?: string;
};

const kindCards: { kind: FileKind; label: string; uploadCta: string; help: string; accept: string; emptyStatus: string; uploadedStatus: string }[] = [
  {
    kind: FileKind.COVER_IMAGE,
    label: "رفع الغلاف",
    uploadCta: "اختر ملف الغلاف",
    help: "يدعم: JPEG/PNG/WEBP",
    accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
    emptyStatus: "لا يوجد غلاف مرفوع",
    uploadedStatus: "تم رفع الغلاف",
  },
  {
    kind: FileKind.PDF,
    label: "رفع PDF",
    uploadCta: "اختر ملف PDF",
    help: "PDF فقط",
    accept: ".pdf,application/pdf",
    emptyStatus: "لا يوجد PDF مرفوع",
    uploadedStatus: "PDF مرفوع",
  },
  {
    kind: FileKind.EPUB,
    label: "رفع EPUB",
    uploadCta: "اختر ملف EPUB",
    help: "EPUB فقط",
    accept: ".epub,application/epub+zip",
    emptyStatus: "لا يوجد EPUB مرفوع",
    uploadedStatus: "EPUB مرفوع",
  },
];

function formatSize(size: number | null) {
  if (!size) {
    return "-";
  }

  if (size < 1024) {
    return `${size} بايت`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} ك.ب`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} م.ب`;
}

export function BookFileManager({ bookId, initialAssets, apiBasePath = "/api/admin/book-assets" }: BookFileManagerProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [busyKind, setBusyKind] = useState<FileKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assetsByKind = useMemo(() => {
    return new Map(assets.map((asset) => [asset.kind, asset]));
  }, [assets]);

  const refreshAssets = async () => {
    const response = await fetch(`${apiBasePath}?bookId=${bookId}`, { method: "GET" });
    const payload = (await response.json()) as { items?: BookAssetItem[]; error?: string };

    if (!response.ok || !payload.items) {
      throw new Error(payload.error ?? "تعذر تحميل الملفات الحالية.");
    }

    setAssets(payload.items);
  };

  const onUpload = async (kind: FileKind, file: File | null) => {
    if (!file) {
      return;
    }

    setBusyKind(kind);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("bookId", bookId);
      formData.set("kind", kind);
      formData.set("file", file);

      const response = await fetch(apiBasePath, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "فشل رفع الملف.");
      }

      await refreshAssets();
      setMessage(payload.message ?? "تم رفع الملف بنجاح.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "حدث خطأ غير متوقع أثناء الرفع.");
    } finally {
      setBusyKind(null);
    }
  };

  const onDelete = async (assetId: string) => {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${apiBasePath}?assetId=${assetId}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "فشل حذف الملف.");
      }

      await refreshAssets();
      setMessage(payload.message ?? "تم حذف الملف بنجاح.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "حدث خطأ غير متوقع أثناء الحذف.");
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-900">أدوات المحتوى</h2>
        <p className="mt-1 text-sm font-semibold text-slate-700">اختر نوع المحتوى ثم ارفع الملف المناسب. يمكنك استبدال أي ملف لاحقًا من نفس البطاقة.</p>
        <p className="mt-1 text-xs text-slate-600">الحالة تظهر داخل كل بطاقة لتعرف مباشرةً ما تم رفعه وما يزال ناقصًا.</p>
      </div>

      {message ? <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        {kindCards.map((item) => {
          const asset = assetsByKind.get(item.kind);
          const isBusy = busyKind === item.kind;

          return (
            <article key={item.kind} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <h3 className="font-semibold text-slate-900">{item.label}</h3>
                <p className="text-xs text-slate-500">{item.help}</p>
              </div>

              <p className={`rounded-md px-2 py-1 text-xs font-semibold ${asset ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {asset ? item.uploadedStatus : item.emptyStatus}
              </p>

              {asset ? (
                <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                  <p className="font-medium">{asset.originalFileName ?? "ملف بدون اسم"}</p>
                  <p>الحجم: {formatSize(asset.sizeBytes)}</p>
                  <p>النوع: {asset.mimeType ?? "-"}</p>
                  {asset.publicUrl ? (
                    <a href={asset.publicUrl} target="_blank" rel="noreferrer" className="text-indigo-700 underline underline-offset-2">
                      فتح الملف
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-slate-500">لم يتم رفع ملف لهذا النوع بعد.</p>
              )}

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-700">{item.uploadCta}</span>
                <input
                  type="file"
                  accept={item.accept}
                  disabled={isBusy}
                  onChange={(event) => onUpload(item.kind, event.currentTarget.files?.[0] ?? null)}
                  className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-slate-500 focus:outline-none"
                />
              </label>

              {asset ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onDelete(asset.id)}
                  className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  حذف الملف
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
