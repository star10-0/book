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
};

const kindCards: { kind: FileKind; label: string; help: string; accept: string }[] = [
  { kind: FileKind.COVER_IMAGE, label: "غلاف الكتاب", help: "JPEG/PNG/WEBP", accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" },
  { kind: FileKind.PDF, label: "نسخة PDF", help: "PDF فقط", accept: ".pdf,application/pdf" },
  { kind: FileKind.EPUB, label: "نسخة EPUB", help: "EPUB فقط", accept: ".epub,application/epub+zip" },
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

export function BookFileManager({ bookId, initialAssets }: BookFileManagerProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [busyKind, setBusyKind] = useState<FileKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assetsByKind = useMemo(() => {
    return new Map(assets.map((asset) => [asset.kind, asset]));
  }, [assets]);

  const refreshAssets = async () => {
    const response = await fetch(`/api/admin/book-assets?bookId=${bookId}`, { method: "GET" });
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

      const response = await fetch("/api/admin/book-assets", {
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
      const response = await fetch(`/api/admin/book-assets?assetId=${assetId}`, {
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
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-900">إدارة ملفات الكتاب</h2>
        <p className="mt-2 text-sm text-slate-600">ارفع الغلاف وملفات القراءة (PDF/EPUB) واربطها مباشرة بالكتاب.</p>
      </div>

      {message ? <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        {kindCards.map((item) => {
          const asset = assetsByKind.get(item.kind);
          const isBusy = busyKind === item.kind;

          return (
            <article key={item.kind} className="space-y-3 rounded-xl border border-slate-200 p-4">
              <div>
                <h3 className="font-semibold text-slate-900">{item.label}</h3>
                <p className="text-xs text-slate-500">{item.help}</p>
              </div>

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
                <p className="text-xs text-slate-500">لا يوجد ملف مرفوع لهذا النوع.</p>
              )}

              <label className="block">
                <span className="sr-only">رفع {item.label}</span>
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
