"use client";

import { useState } from "react";

type BannerImageFieldProps = {
  inputName: string;
  label: string;
  defaultValue?: string | null;
};

export function BannerImageField({ inputName, label, defaultValue }: BannerImageFieldProps) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onUpload = async (file: File | null) => {
    if (!file) return;

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/admin/banner-assets", { method: "POST", body: formData });
      const payload = (await response.json()) as { url?: string | null; error?: string; message?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "تعذر رفع الصورة.");
      }

      setValue(payload.url);
      setMessage(payload.message ?? "تم رفع الصورة.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "حدث خطأ أثناء رفع الصورة.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <label className="space-y-2 text-sm font-medium text-slate-700">
      {label}
      <input
        name={inputName}
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        placeholder="/uploads/banners/... أو https://"
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(event) => onUpload(event.currentTarget.files?.[0] ?? null)}
        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
      />
      {message ? <p className="text-xs font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}
    </label>
  );
}
