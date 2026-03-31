"use client";

import { PaymentAttemptStatus, PaymentProvider } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { formatArabicCurrency } from "@/lib/formatters/intl";
import { buildShamCashQrPayload } from "@/lib/payments/sham-cash-qr";

interface OrderPaymentPanelProps {
  orderId: string;
  isPayable: boolean;
  totalCents: number;
  currency: "SYP" | "USD";
  discountCents: number;
  appliedPromoCode?: string;
  initialAttemptId?: string;
  initialAttemptStatus?: PaymentAttemptStatus;
  shamCashDestinationAccount?: string;
  syriatelCashDestinationAccount?: string;
  enabledLiveProviders?: LiveProviderOption[];
}

type UiStatus = "idle" | "pending" | "verifying" | "success" | "failure";
type LiveProviderOption = "SHAM_CASH" | "SYRIATEL_CASH";

const paymentOptions: Array<{
  provider: LiveProviderOption;
  label: string;
  tone: "indigo" | "emerald";
  instructions: string;
}> = [
  {
    provider: PaymentProvider.SHAM_CASH,
    label: "Sham Cash",
    tone: "indigo",
    instructions: "أنشئ محاولة الدفع أولًا، ثم حوّل المبلغ إلى حساب Sham Cash وأدخل رقم العملية للتحقق.",
  },
  {
    provider: PaymentProvider.SYRIATEL_CASH,
    label: "Syriatel Cash",
    tone: "emerald",
    instructions: "أنشئ محاولة الدفع أولًا، ثم حوّل المبلغ إلى حساب Syriatel Cash وأدخل رقم العملية للتحقق.",
  },
];

const statusLabel: Record<UiStatus, string> = {
  idle: "جاهز للبدء",
  pending: "بانتظار التحقق",
  verifying: "جاري التحقق",
  success: "الدفع مكتمل",
  failure: "تعذر تأكيد الدفع",
};

const promoAudienceHints = [
  "قد يكون بعض الأكواد مخصصًا لمؤسسة معينة (حسابات الأعمال أو الجامعات) ولن يعمل مع حسابات أخرى.",
  "قد يكون الكود مقيدًا بنوع العرض (شراء أو إيجار) أو بحد أدنى لقيمة الطلب.",
];

function mapAttemptStatusToUiStatus(status?: PaymentAttemptStatus): UiStatus {
  if (!status) return "idle";
  if (status === "PAID") return "success";
  if (status === "FAILED") return "failure";
  if (status === "VERIFYING") return "verifying";
  if (status === "SUBMITTED" || status === "PENDING") return "pending";
  return "idle";
}

function toArabicFailureMessage(reason?: string | null): string {
  if (!reason) return "تعذر تأكيد الدفع حاليًا. راجع رقم العملية وحاول مجددًا.";

  const normalized = reason.trim();
  const hasArabicCharacters = /[\u0600-\u06FF]/.test(normalized);
  if (hasArabicCharacters) {
    return normalized;
  }

  return "تعذر تأكيد الدفع لدى مزود الخدمة الآن. راجع البيانات ثم أعد المحاولة.";
}

export function OrderPaymentPanel({
  orderId,
  isPayable,
  totalCents,
  currency,
  discountCents,
  appliedPromoCode,
  initialAttemptId,
  initialAttemptStatus,
  shamCashDestinationAccount,
  syriatelCashDestinationAccount,
  enabledLiveProviders,
}: OrderPaymentPanelProps) {
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | undefined>(initialAttemptId);
  const [attemptStatus, setAttemptStatus] = useState<PaymentAttemptStatus | undefined>(initialAttemptStatus);
  const [transactionReference, setTransactionReference] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState(appliedPromoCode ?? "");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const availablePaymentOptions = useMemo(() => {
    return paymentOptions.filter((option) => {
      if (!enabledLiveProviders || enabledLiveProviders.length === 0) {
        return true;
      }
      return enabledLiveProviders.includes(option.provider);
    });
  }, [enabledLiveProviders]);

  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>(
    availablePaymentOptions[0]?.provider ?? PaymentProvider.SHAM_CASH,
  );

  useEffect(() => {
    if (!availablePaymentOptions.some((option) => option.provider === selectedProvider)) {
      setSelectedProvider(availablePaymentOptions[0]?.provider ?? PaymentProvider.SHAM_CASH);
    }
  }, [availablePaymentOptions, selectedProvider]);

  useEffect(() => {
    setAttemptId(initialAttemptId);
    setAttemptStatus(initialAttemptStatus);
    if (initialAttemptStatus === "PAID") {
      setMessage("تم تأكيد الدفع بنجاح. يمكنك الآن الوصول إلى محتوى الطلب.");
      setMessageTone("success");
    }
  }, [initialAttemptId, initialAttemptStatus]);

  useEffect(() => {
    setTransactionReference("");
    setProofNote("");
    setCopyFeedback("");
    if (attemptStatus !== "PAID") {
      setMessage("");
      setMessageTone("info");
    }
  }, [selectedProvider]);

  useEffect(() => {
    if (!copyFeedback) return;
    const timeout = window.setTimeout(() => setCopyFeedback(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [copyFeedback]);

  const selectedOption =
    availablePaymentOptions.find((option) => option.provider === selectedProvider) ?? availablePaymentOptions[0];

  const shamDestinationLabel = shamCashDestinationAccount?.trim() || "غير متاح حالياً";
  const syriatelDestinationLabel = syriatelCashDestinationAccount?.trim() || "غير متاح حالياً";
  const selectedDestinationLabel =
    selectedProvider === PaymentProvider.SHAM_CASH ? shamDestinationLabel : syriatelDestinationLabel;
  const selectedDestinationMissing = selectedDestinationLabel === "غير متاح حالياً";
  const uiStatus = mapAttemptStatusToUiStatus(attemptStatus);

  const shamCashQrPayload = useMemo(
    () =>
      buildShamCashQrPayload({
        destinationAccount: shamCashDestinationAccount,
        amountMajor: totalCents / 100,
        currency,
        orderReference: orderId,
      }),
    [currency, orderId, shamCashDestinationAccount, totalCents],
  );

  const shamCashQrImageUrl = useMemo(() => {
    if (!shamCashQrPayload.payload) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shamCashQrPayload.payload)}`;
  }, [shamCashQrPayload.payload]);

  const copyText = async (text: string, successMessage: string) => {
    if (!text.trim() || text === "غير متاح حالياً") return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(successMessage);
    } catch {
      setCopyFeedback("تعذر النسخ تلقائيًا. يمكنك النسخ يدويًا.");
    }
  };

  const applyPromoCode = () => {
    if (!promoCodeInput.trim()) {
      setMessage("الرجاء إدخال رمز الخصم أولاً.");
      setMessageTone("error");
      return;
    }

    startTransition(async () => {
      setMessage("");
      setMessageTone("info");

      const response = await fetch("/api/checkout/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, code: promoCodeInput.trim() }),
      });

      const payload = (await response.json()) as { message?: string; promo?: { isFree?: boolean } };

      if (!response.ok) {
        setMessage(payload.message ?? "تعذر تطبيق رمز الخصم.");
        setMessageTone("error");
        return;
      }

      setMessage(payload.promo?.isFree ? "تم تطبيق الرمز وأصبح الطلب مجانيًا بالكامل." : "تم تطبيق رمز الخصم بنجاح.");
      setMessageTone("success");
      router.refresh();
    });
  };

  const completeFreeOrder = () => {
    startTransition(async () => {
      setMessage("");
      setMessageTone("info");

      const response = await fetch("/api/checkout/complete-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(payload.message ?? "تعذر إتمام الطلب المجاني.");
        setMessageTone("error");
        return;
      }

      setMessage("تم إتمام الطلب المجاني ومنح الوصول مباشرة.");
      setMessageTone("success");
      router.refresh();
    });
  };

  const createPaymentAttempt = () => {
    if (selectedDestinationMissing) {
      setMessage("بيانات حساب الاستلام لهذا المزود غير مهيأة على الخادم بعد.");
      setMessageTone("error");
      return;
    }

    startTransition(async () => {
      setMessage("");
      setMessageTone("info");

      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          provider: selectedProvider,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        attempt?: { id: string; status: PaymentAttemptStatus };
      };

      if (!response.ok || !payload.attempt) {
        setMessage(payload.message ?? "تعذر إنشاء محاولة الدفع.");
        setMessageTone("error");
        return;
      }

      setAttemptId(payload.attempt.id);
      setAttemptStatus(payload.attempt.status);
      setMessage(
        selectedProvider === PaymentProvider.SHAM_CASH
          ? "تم إنشاء محاولة الدفع عبر Sham Cash. حوّل المبلغ ثم أدخل رقم العملية."
          : "تم إنشاء محاولة الدفع عبر Syriatel Cash. حوّل المبلغ ثم أدخل رقم العملية.",
      );
      setMessageTone("info");
      router.refresh();
    });
  };

  const submitProof = () => {
    if (!attemptId || !transactionReference.trim()) {
      setMessage("يرجى إدخال رقم عملية صحيح قبل الإرسال.");
      setMessageTone("error");
      return;
    }

    if (attemptStatus !== "SUBMITTED") {
      setMessage("لا يمكن إرسال رقم العملية الآن. أنشئ محاولة دفع جديدة أو انتظر تحديث الحالة.");
      setMessageTone("error");
      return;
    }

    startTransition(async () => {
      setMessage("");
      setMessageTone("info");

      const response = await fetch("/api/payments/submit-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          transactionReference: transactionReference.trim(),
          proofNote: proofNote.trim(),
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        attempt?: { status: PaymentAttemptStatus };
      };

      if (!response.ok || !payload.attempt) {
        setMessage(payload.message ?? "تعذر إرسال رقم العملية.");
        setMessageTone("error");
        return;
      }

      setAttemptStatus(payload.attempt.status);
      setMessage("تم حفظ رقم العملية. يمكنك الآن التحقق من حالة الدفع.");
      setMessageTone("success");
      router.refresh();
    });
  };

  const verifyPaymentStatus = () => {
    if (!attemptId) {
      setMessage("لا توجد محاولة دفع نشطة للتحقق.");
      setMessageTone("error");
      return;
    }

    const previousAttemptStatus = attemptStatus;

    startTransition(async () => {
      setMessage("");
      setMessageTone("info");
      setAttemptStatus("VERIFYING");

      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });

      const payload = (await response.json()) as {
        message?: string;
        attempt?: { status: PaymentAttemptStatus; failureReason?: string | null };
      };

      if (!response.ok || !payload.attempt) {
        setAttemptStatus(previousAttemptStatus);
        setMessage(payload.message ?? "تعذر التحقق من حالة الدفع.");
        setMessageTone("error");
        router.refresh();
        return;
      }

      setAttemptStatus(payload.attempt.status);

      if (payload.attempt.status === "PAID") {
        setMessage("تم تأكيد الدفع بنجاح. أصبح طلبك جاهزًا ويمكنك المتابعة.");
        setMessageTone("success");
      } else if (payload.attempt.status === "FAILED") {
        setMessage(toArabicFailureMessage(payload.attempt.failureReason));
        setMessageTone("error");
      } else {
        setMessage("تم تحديث الحالة، وما زال الدفع قيد المتابعة.");
        setMessageTone("info");
      }

      router.refresh();
    });
  };

  const isFreeOrder = totalCents === 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">إتمام الدفع</h2>
          <p className="mt-1 text-sm text-slate-600">
            خطوات الدفع: اختر الوسيلة ← أنشئ المحاولة ← حوّل المبلغ ← أدخل رقم العملية ← تحقّق من الحالة.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <p className="font-semibold text-slate-900">المبلغ المستحق</p>
          <p className="mt-1 font-bold text-indigo-700">{formatArabicCurrency(totalCents / 100, { currency })}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="font-semibold text-slate-900">رمز الخصم</p>
        <p className="mt-1 text-xs text-slate-600">أدخل الكود كما استلمته من المؤسسة أو الجهة المانحة للخصم.</p>
        <div className="mt-2 flex gap-2">
          <input
            value={promoCodeInput}
            onChange={(event) => setPromoCodeInput(event.target.value.toUpperCase())}
            placeholder="مثال: SCHOOL100"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={applyPromoCode}
            disabled={isPending || !isPayable}
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            تطبيق
          </button>
        </div>
        {appliedPromoCode ? <p className="mt-2 text-xs text-slate-600">الكود المطبق: {appliedPromoCode}</p> : null}
        <dl className="mt-2 space-y-1 text-xs">
          <div className="flex items-center justify-between gap-2 text-slate-700">
            <dt>إجمالي الخصم</dt>
            <dd className="font-semibold">{formatArabicCurrency(discountCents / 100, { currency })}</dd>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-1 text-slate-800">
            <dt className="font-semibold">المبلغ النهائي بعد الخصم</dt>
            <dd className="font-bold">{formatArabicCurrency(totalCents / 100, { currency })}</dd>
          </div>
        </dl>
        <ul className="mt-2 list-disc space-y-1 pr-4 text-xs text-slate-600">
          {promoAudienceHints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      </div>

      {isFreeOrder ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">هذا الطلب مجاني بالكامل بعد تطبيق الخصم.</p>
          <p className="mt-1">لن يتم طلب دفع خارجي. يمكن إتمام الطلب مباشرة ومنح الوصول فورًا.</p>
          <button
            type="button"
            onClick={completeFreeOrder}
            disabled={isPending || !isPayable}
            className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            إتمام الطلب المجاني
          </button>
        </div>
      ) : (
        <>
          {availablePaymentOptions.length === 0 ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              لا توجد وسائل دفع مفعّلة حاليًا لهذا الطلب.
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {availablePaymentOptions.map((option) => {
                  const isActive = option.provider === selectedProvider;
                  return (
                    <button
                      key={option.provider}
                      type="button"
                      onClick={() => setSelectedProvider(option.provider)}
                      className={`rounded-xl border p-3 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                        isActive ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      <p className="font-semibold text-slate-900">{option.label}</p>
                      <p className="mt-1 text-xs text-slate-600">{option.provider === PaymentProvider.SHAM_CASH ? "تحويل سريع عبر QR أو يدوي" : "تحويل يدوي مع رقم العملية"}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">تعليمات الدفع</p>
                <p className="mt-1">{selectedOption?.instructions}</p>

                {selectedDestinationMissing ? (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                    حساب الاستلام لهذا المزود غير متاح حاليًا. يرجى اختيار مزود آخر أو المحاولة لاحقًا.
                  </div>
                ) : null}

                {selectedProvider === PaymentProvider.SHAM_CASH ? (
                  <dl className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-semibold">حساب الاستلام</dt>
                      <dd className="font-mono text-xs sm:text-sm">{shamDestinationLabel}</dd>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <dt className="font-semibold">المبلغ</dt>
                      <dd className="select-all">{formatArabicCurrency(totalCents / 100, { currency })}</dd>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <dt className="font-semibold">مرجع الطلب</dt>
                      <dd className="font-mono text-xs sm:text-sm select-all">{orderId}</dd>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copyText(shamDestinationLabel, "تم نسخ حساب الاستلام.")}
                        className="rounded-lg border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        نسخ الحساب
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            `المبلغ: ${formatArabicCurrency(totalCents / 100, { currency })}\nمرجع الطلب: ${orderId}`,
                            "تم نسخ المبلغ ومرجع الطلب.",
                          )
                        }
                        className="rounded-lg border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        نسخ المبلغ/المرجع
                      </button>
                    </div>

                    {copyFeedback ? <p className="mt-2 text-xs text-indigo-700">{copyFeedback}</p> : null}

                    <div className="mt-3 rounded-xl border border-indigo-200 bg-white p-3">
                      <p className="text-xs font-semibold text-slate-900">رمز QR للدفع السريع</p>
                      {shamCashQrImageUrl ? (
                        <div className="mt-2 flex flex-col items-center gap-2">
                          <Image
                            src={shamCashQrImageUrl}
                            alt="رمز QR لتحويل Sham Cash"
                            width={176}
                            height={176}
                            className="h-44 w-44 rounded-md border border-slate-200 bg-white p-2"
                          />
                          <p className="text-center text-[11px] text-slate-600">
                            يتضمن بيانات التحويل السريع للحساب والمبلغ ومرجع الطلب.
                          </p>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-600">
                          تعذر إنشاء رمز QR الآن. يمكنك متابعة الدفع باستخدام الحساب والمبلغ أعلاه.
                        </p>
                      )}
                    </div>

                    <div className="mt-3 border-t border-indigo-200 pt-2">
                      <p className="font-semibold">خطوات Sham Cash</p>
                      <ol className="mt-1 list-decimal space-y-1 pr-4 text-xs sm:text-sm">
                        <li>اختر Sham Cash ثم اضغط «إنشاء محاولة الدفع».</li>
                        <li>امسح رمز QR أو انسخ الحساب وحوّل المبلغ المطلوب.</li>
                        <li>أدخل رقم العملية ثم اضغط «إرسال رقم العملية».</li>
                        <li>اضغط «تحقّق من حالة الدفع» لتأكيد الطلب.</li>
                      </ol>
                    </div>
                  </dl>
                ) : null}

                {selectedProvider === PaymentProvider.SYRIATEL_CASH ? (
                  <dl className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-semibold">رقم/حساب الاستلام</dt>
                      <dd className="font-mono text-xs sm:text-sm">{syriatelDestinationLabel}</dd>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <dt className="font-semibold">المبلغ</dt>
                      <dd>{formatArabicCurrency(totalCents / 100, { currency })}</dd>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <dt className="font-semibold">مرجع الطلب</dt>
                      <dd className="font-mono text-xs sm:text-sm">{orderId}</dd>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copyText(syriatelDestinationLabel, "تم نسخ رقم/حساب الاستلام.")}
                        className="rounded-lg border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        نسخ الحساب
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            `المبلغ: ${formatArabicCurrency(totalCents / 100, { currency })}\nمرجع الطلب: ${orderId}`,
                            "تم نسخ المبلغ ومرجع الطلب.",
                          )
                        }
                        className="rounded-lg border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        نسخ المبلغ/المرجع
                      </button>
                    </div>

                    {copyFeedback ? <p className="mt-2 text-xs text-emerald-700">{copyFeedback}</p> : null}

                    <div className="mt-3 border-t border-emerald-200 pt-2">
                      <p className="font-semibold">خطوات Syriatel Cash</p>
                      <ol className="mt-1 list-decimal space-y-1 pr-4 text-xs sm:text-sm">
                        <li>اختر Syriatel Cash ثم اضغط «إنشاء محاولة الدفع».</li>
                        <li>افتح التطبيق وحوّل المبلغ إلى رقم/حساب الاستلام أعلاه.</li>
                        <li>أضف مرجع الطلب <span className="font-mono">{orderId}</span> داخل ملاحظات التحويل إن توفرت.</li>
                        <li>بعد نجاح التحويل، أدخل رقم العملية ثم اضغط «إرسال رقم العملية».</li>
                        <li>اضغط «تحقّق من حالة الدفع» لتحديث الحالة ومنح الوصول تلقائيًا.</li>
                      </ol>
                    </div>
                  </dl>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                <label className="block text-sm font-semibold text-slate-800" htmlFor="transaction-reference">
                  رقم العملية
                </label>
                <input
                  id="transaction-reference"
                  type="text"
                  value={transactionReference}
                  onChange={(event) => setTransactionReference(event.target.value)}
                  placeholder="مثال: TXN-2026-0001"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <label className="block text-sm font-semibold text-slate-800" htmlFor="proof-note">
                  إثبات أو ملاحظة الدفع
                </label>
                <textarea
                  id="proof-note"
                  value={proofNote}
                  onChange={(event) => setProofNote(event.target.value)}
                  rows={3}
                  placeholder="أدخل أي تفاصيل إضافية عن التحويل"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={createPaymentAttempt}
                  disabled={isPending || !isPayable || selectedDestinationMissing}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  إنشاء محاولة الدفع
                </button>
                <button
                  type="button"
                  onClick={submitProof}
                  disabled={isPending || !attemptId || attemptStatus !== "SUBMITTED"}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  إرسال رقم العملية
                </button>
                <button
                  type="button"
                  onClick={verifyPaymentStatus}
                  disabled={isPending || !attemptId || attemptStatus === "PAID" || attemptStatus === "FAILED"}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  تحقّق من حالة الدفع
                </button>
              </div>
            </>
          )}
        </>
      )}

      <div
        className={`mt-4 rounded-xl border p-3 text-sm ${
          uiStatus === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : uiStatus === "failure"
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : uiStatus === "verifying"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-slate-200 bg-slate-50 text-slate-800"
        }`}
      >
        <p>
          <span className="font-semibold">حالة الدفع:</span> {statusLabel[uiStatus]}
        </p>
        {attemptId ? (
          <p className="mt-1">
            رقم محاولة الدفع: <span className="font-mono text-xs">{attemptId}</span>
          </p>
        ) : null}
        {uiStatus === "success" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/account/library" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
              الذهاب إلى المكتبة
            </Link>
            <Link href="/account/library" className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
              متابعة القراءة
            </Link>
            <Link href={`/orders/${orderId}/summary`} className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
              عرض الطلب
            </Link>
          </div>
        ) : null}
      </div>

      {message ? (
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-sm ${
            messageTone === "success"
              ? "bg-emerald-50 text-emerald-800"
              : messageTone === "error"
                ? "bg-rose-50 text-rose-800"
                : "bg-slate-100 text-slate-700"
          }`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
