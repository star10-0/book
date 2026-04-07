"use client";

import { PaymentAttemptStatus, PaymentProvider } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { formatArabicCurrency } from "@/lib/formatters/intl";
import { mapAttemptStatusToUiStatus, toArabicPaymentFailureMessage, type PaymentUiStatus } from "@/lib/payments/ui-state";

interface OrderPaymentPanelProps {
  orderId: string;
  isPayable: boolean;
  totalCents: number;
  currency: "SYP" | "USD";
  discountCents: number;
  appliedPromoCode?: string;
  initialAttemptId?: string;
  initialAttemptStatus?: PaymentAttemptStatus;
  initialTransactionReference?: string;
  shamCashDestinationAccount?: string;
  syriatelCashDestinationAccount?: string;
  enabledLiveProviders?: LiveProviderOption[];
}

type LiveProviderOption = "SHAM_CASH" | "SYRIATEL_CASH";

type CheckoutStep = {
  id: number;
  title: string;
  description: string;
};

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

const statusLabel: Record<PaymentUiStatus, string> = {
  idle: "جاهز للبدء",
  pending: "بانتظار المتابعة",
  verifying: "جاري التحقق",
  success: "الدفع مكتمل",
  failure: "تعذر تأكيد الدفع",
};

const checkoutSteps: CheckoutStep[] = [
  { id: 1, title: "اختر وسيلة الدفع", description: "حدّد المزود الأنسب لإتمام التحويل." },
  { id: 2, title: "أنشئ محاولة الدفع", description: "ثبّت العملية قبل التحويل." },
  { id: 3, title: "أدخل رقم العملية", description: "أرسل مرجع التحويل بعد الدفع." },
  { id: 4, title: "تحقق من الحالة", description: "أكمل التأكيد النهائي ومنح الوصول." },
];

function statusToneClasses(uiStatus: PaymentUiStatus) {
  if (uiStatus === "success") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (uiStatus === "failure") return "border-rose-200 bg-rose-50 text-rose-900";
  if (uiStatus === "verifying") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
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
  initialTransactionReference,
  shamCashDestinationAccount,
  syriatelCashDestinationAccount,
  enabledLiveProviders,
}: OrderPaymentPanelProps) {
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | undefined>(initialAttemptId);
  const [attemptStatus, setAttemptStatus] = useState<PaymentAttemptStatus | undefined>(initialAttemptStatus);
  const [transactionReference, setTransactionReference] = useState(initialTransactionReference ?? "");
  const [hasSubmittedReference, setHasSubmittedReference] = useState(Boolean(initialTransactionReference?.trim()));
  const [proofNote, setProofNote] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState(appliedPromoCode ?? "");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [showSyriatelTransferDetails, setShowSyriatelTransferDetails] = useState(false);
  const [isPending, startTransition] = useTransition();
  const attemptStatusRef = useRef<PaymentAttemptStatus | undefined>(initialAttemptStatus);

  useEffect(() => {
    attemptStatusRef.current = attemptStatus;
  }, [attemptStatus]);

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
    setTransactionReference(initialTransactionReference ?? "");
    setHasSubmittedReference(Boolean(initialTransactionReference?.trim()));
    if (initialAttemptStatus === "PAID") {
      setMessage("تم تأكيد الدفع بنجاح. يمكنك الآن الوصول إلى محتوى الطلب.");
      setMessageTone("success");
    }
  }, [initialAttemptId, initialAttemptStatus, initialTransactionReference]);

  useEffect(() => {
    setTransactionReference("");
    setHasSubmittedReference(false);
    setProofNote("");
    setCopyFeedback("");
    setShowSyriatelTransferDetails(false);
    if (attemptStatusRef.current !== "PAID") {
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

  const isFreeOrder = totalCents === 0;
  const paymentBlockedByOrderState = !isPayable;
  const paymentProviderUnavailable = availablePaymentOptions.length === 0;
  const isAttemptTerminal = attemptStatus === "PAID" || attemptStatus === "FAILED";

  const canCreateAttempt = !isFreeOrder && !paymentBlockedByOrderState && !paymentProviderUnavailable && !selectedDestinationMissing && !isAttemptTerminal;
  const canSubmitReference = Boolean(attemptId) && attemptStatus === "SUBMITTED";
  const canVerifyAttempt = Boolean(attemptId) && attemptStatus === "SUBMITTED" && hasSubmittedReference;

  const createAttemptDisabledReason = isFreeOrder
    ? "الطلب مجاني بالكامل ولا يحتاج إلى محاولة دفع."
    : paymentBlockedByOrderState
      ? "لا يمكن إنشاء محاولة دفع لأن حالة الطلب لم تعد قابلة للدفع."
      : paymentProviderUnavailable
        ? "لا توجد وسيلة دفع مفعّلة حاليًا لهذا الطلب."
        : selectedDestinationMissing
          ? "حساب الاستلام للمزود المختار غير متاح حاليًا."
          : isAttemptTerminal
            ? "هذه المحاولة وصلت إلى حالة نهائية. أنشئ طلبًا جديدًا إذا احتجت إعادة الشراء."
            : undefined;

  const submitDisabledReason = !attemptId
    ? "أنشئ محاولة دفع أولًا لتفعيل إرسال رقم العملية."
    : attemptStatus !== "SUBMITTED"
      ? "لا يمكن إرسال رقم العملية في الحالة الحالية."
      : undefined;

  const verifyDisabledReason = !attemptId
    ? "أنشئ محاولة دفع أولًا."
    : attemptStatus !== "SUBMITTED"
      ? "التحقق متاح فقط بعد إنشاء المحاولة وفي حالة انتظار المرجع."
      : !hasSubmittedReference
        ? "أدخل رقم العملية أولًا ثم اضغط إرسال رقم العملية."
        : undefined;

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
    if (!canCreateAttempt) {
      setMessage(createAttemptDisabledReason ?? "لا يمكن إنشاء محاولة دفع الآن.");
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
      setHasSubmittedReference(false);
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
      setHasSubmittedReference(true);
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

    if (!hasSubmittedReference) {
      setMessage("أدخل رقم العملية وأرسله أولًا قبل التحقق من حالة الدفع.");
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
        setMessage(toArabicPaymentFailureMessage(payload.attempt.failureReason));
        setMessageTone("error");
      } else {
        setMessage("تم تحديث الحالة، وما زال الدفع قيد المتابعة.");
        setMessageTone("info");
      }

      router.refresh();
    });
  };

  const currentStep = !attemptId ? 1 : !hasSubmittedReference ? 3 : canVerifyAttempt ? 4 : uiStatus === "success" ? 4 : 2;

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <header className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">Checkout</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">إتمام الدفع</h2>
            <p className="mt-1 text-sm text-slate-600">مسار واضح من اختيار المزود وحتى تأكيد الطلب النهائي.</p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-left shadow-sm">
            <p className="text-xs font-semibold text-slate-500">المبلغ المستحق الآن</p>
            <p className="mt-1 text-2xl font-black text-indigo-700">{formatArabicCurrency(totalCents / 100, { currency })}</p>
          </div>
        </div>

        <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="مراحل إتمام الدفع">
          {checkoutSteps.map((step) => {
            const isActive = step.id === currentStep;
            return (
              <li
                key={step.id}
                className={`rounded-xl border px-3 py-2.5 text-xs ${
                  isActive ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white"
                }`}
              >
                <p className={`font-bold ${isActive ? "text-indigo-700" : "text-slate-700"}`}>{step.title}</p>
                <p className="mt-1 text-slate-600">{step.description}</p>
              </li>
            );
          })}
        </ol>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">وسيلة الدفع</h3>
                <p className="mt-1 text-sm text-slate-600">اختر المزود الذي ستُكمل التحويل من خلاله.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                المحدد: {selectedOption?.label ?? "-"}
              </span>
            </div>

            {availablePaymentOptions.length === 0 ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                لا توجد وسائل دفع مفعّلة حاليًا لهذا الطلب. جرّب إتمامه لاحقًا أو تواصل مع الدعم.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {availablePaymentOptions.map((option) => {
                  const isActive = option.provider === selectedProvider;
                  const toneClasses =
                    option.tone === "indigo"
                      ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                      : "border-emerald-300 bg-emerald-50 text-emerald-800";

                  return (
                    <button
                      key={option.provider}
                      type="button"
                      onClick={() => setSelectedProvider(option.provider)}
                      className={`rounded-2xl border p-4 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                        isActive ? toneClasses : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <p className="text-base font-bold">{option.label}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {option.provider === PaymentProvider.SHAM_CASH
                          ? "تحويل سريع عبر QR أو يدوي"
                          : "تحويل يدوي مع رقم العملية"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {!isFreeOrder ? (
            <section className="space-y-4 rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">بيانات التحويل وتعليمات التنفيذ</h3>
                <p className="mt-1 text-sm text-slate-600">{selectedOption?.instructions}</p>
              </div>

              {selectedDestinationMissing ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  حساب الاستلام لهذا المزود غير متاح حاليًا. اختر مزودًا آخر أو أعد المحاولة لاحقًا.
                </div>
              ) : null}

              {selectedProvider === PaymentProvider.SHAM_CASH ? (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <dl className="space-y-2 text-sm text-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-semibold">حساب الاستلام</dt>
                      <dd className="font-mono text-xs sm:text-sm">{shamDestinationLabel}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-semibold">المبلغ</dt>
                      <dd className="font-bold select-all">{formatArabicCurrency(totalCents / 100, { currency })}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-semibold">مرجع الطلب</dt>
                      <dd className="font-mono text-xs sm:text-sm select-all">{orderId}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => copyText(shamDestinationLabel, "تم نسخ حساب الاستلام.")}
                      className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
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
                      className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      نسخ المبلغ/المرجع
                    </button>
                  </div>

                  {copyFeedback ? <p className="mt-2 text-xs font-semibold text-indigo-700">{copyFeedback}</p> : null}

                  <div className="mt-4 rounded-xl border border-indigo-200 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-900">رمز QR للدفع السريع</p>
                    <div className="mt-2 flex flex-col items-center gap-2">
                      <Image
                        src="/1/1.jpg"
                        alt="رمز QR لتحويل Sham Cash"
                        width={176}
                        height={176}
                        className="h-44 w-44 rounded-md border border-slate-200 bg-white p-2"
                      />
                      <p className="text-center text-[11px] text-slate-600">يتضمن بيانات الحساب والمبلغ ومرجع الطلب.</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedProvider === PaymentProvider.SYRIATEL_CASH ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <dl className="space-y-2 text-sm text-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-semibold">المبلغ</dt>
                      <dd className="font-bold select-all">{formatArabicCurrency(totalCents / 100, { currency })}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-900">رمز QR للدفع السريع</p>
                    <div className="mt-2 flex flex-col items-center gap-2">
                      <Image
                        src="/1/3.jpg"
                        alt="رمز QR لتحويل Syriatel Cash"
                        width={176}
                        height={176}
                        className="h-44 w-44 rounded-md border border-slate-200 bg-white p-2"
                      />
                      <p className="text-center text-[11px] text-slate-600">امسح الرمز لإتمام التحويل عبر Syriatel Cash.</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowSyriatelTransferDetails((current) => !current)}
                      className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      إظهار بيانات التحويل
                    </button>
                  </div>

                  {showSyriatelTransferDetails ? (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
                      <dl className="space-y-2 text-sm text-slate-800">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="font-semibold">رقم/حساب الاستلام</dt>
                          <dd className="font-mono text-xs sm:text-sm">{syriatelDestinationLabel}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="font-semibold">المبلغ</dt>
                          <dd className="font-bold">{formatArabicCurrency(totalCents / 100, { currency })}</dd>
                        </div>
                      </dl>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => copyText(syriatelDestinationLabel, "تم نسخ رقم/حساب الاستلام.")}
                          className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          نسخ الحساب
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {copyFeedback ? <p className="mt-2 text-xs font-semibold text-emerald-700">{copyFeedback}</p> : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {!isFreeOrder && availablePaymentOptions.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
              <h3 className="text-base font-bold text-slate-900">مرجع العملية وإثبات الدفع</h3>
              <p className="mt-1 text-sm text-slate-600">بعد التحويل أدخل رقم العملية بدقة ثم أرسلها للتحقق.</p>

              <div className="mt-4 space-y-3">
                <label className="block text-sm font-semibold text-slate-800" htmlFor="transaction-reference">
                  رقم العملية
                </label>
                <input
                  id="transaction-reference"
                  type="text"
                  value={transactionReference}
                  onChange={(event) => {
                    setTransactionReference(event.target.value);
                    setHasSubmittedReference(false);
                  }}
                  placeholder="مثال: TXN-2026-0001"
                  disabled={!attemptId || attemptStatus !== "SUBMITTED"}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <label className="block text-sm font-semibold text-slate-800" htmlFor="proof-note">
                  ملاحظة أو إثبات الدفع (اختياري)
                </label>
                <textarea
                  id="proof-note"
                  value={proofNote}
                  onChange={(event) => setProofNote(event.target.value)}
                  rows={3}
                  placeholder="أدخل أي تفاصيل إضافية عن التحويل"
                  disabled={!attemptId || attemptStatus !== "SUBMITTED"}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                {!attemptId ? <p className="text-xs text-slate-500">أنشئ محاولة الدفع أولًا لتفعيل إدخال رقم العملية.</p> : null}
                {attemptId && !hasSubmittedReference ? (
                  <p className="text-xs text-amber-700">بعد إدخال الرقم، اضغط «إرسال رقم العملية» قبل التحقق من حالة الدفع.</p>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-bold text-slate-900">ملخص التنفيذ</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2 text-slate-700">
                <dt>وسيلة الدفع</dt>
                <dd className="font-semibold text-slate-900">{selectedOption?.label ?? "-"}</dd>
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-700">
                <dt>إجمالي الخصم</dt>
                <dd className="font-semibold">{formatArabicCurrency(discountCents / 100, { currency })}</dd>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
                <dt className="font-semibold text-slate-800">الإجمالي المطلوب</dt>
                <dd className="text-lg font-black text-indigo-700">{formatArabicCurrency(totalCents / 100, { currency })}</dd>
              </div>
            </dl>
            {attemptId ? (
              <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-700">
                رقم محاولة الدفع: <span className="font-mono">{attemptId}</span>
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-base font-bold text-slate-900">الإجراء التالي</h3>
            <p className="mt-1 text-sm text-slate-600">
              {!attemptId
                ? "ابدأ بإنشاء محاولة الدفع لتفعيل بقية خطوات الإرسال والتحقق."
                : !hasSubmittedReference
                  ? "أدخل رقم العملية الآن ثم أرسله قبل خطوة التحقق."
                  : canVerifyAttempt
                    ? "بعد الإرسال اضغط تحقق من حالة الدفع لإكمال الطلب."
                    : uiStatus === "success"
                      ? "تم التأكيد. يمكنك فتح مكتبتك أو متابعة التسوق."
                      : "تابع تحديث الحالة أو أنشئ محاولة جديدة عند الحاجة."}
            </p>

            {createAttemptDisabledReason ? (
              <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">{createAttemptDisabledReason}</p>
            ) : null}

            {isFreeOrder ? (
              <button
                type="button"
                onClick={completeFreeOrder}
                disabled={isPending || !isPayable}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                إتمام الطلب المجاني
              </button>
            ) : (
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={createPaymentAttempt}
                  disabled={isPending || !canCreateAttempt}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  إنشاء محاولة الدفع
                </button>
                <button
                  type="button"
                  onClick={submitProof}
                  disabled={isPending || !canSubmitReference}
                  className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  إرسال رقم العملية
                </button>
                {submitDisabledReason ? <p className="text-xs text-slate-500">{submitDisabledReason}</p> : null}
                <button
                  type="button"
                  onClick={verifyPaymentStatus}
                  disabled={isPending || !canVerifyAttempt}
                  className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  تحقق من حالة الدفع
                </button>
                {verifyDisabledReason ? <p className="text-xs text-slate-500">{verifyDisabledReason}</p> : null}
              </div>
            )}
          </section>

          <section className={`rounded-2xl border p-4 text-sm ${statusToneClasses(uiStatus)}`}>
            <p>
              <span className="font-semibold">حالة الدفع:</span> {statusLabel[uiStatus]}
            </p>
            {uiStatus === "success" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/account/library" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                  الذهاب إلى المكتبة
                </Link>
                <Link href="/books" className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                  متابعة التسوق
                </Link>
                <Link
                  href={`/orders/${orderId}/summary`}
                  className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  عرض الطلب
                </Link>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-slate-900">رمز الخصم</h3>
            <p className="mt-1 text-xs text-slate-600">أدخل الكود كما استلمته من الجهة المانحة.</p>
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
          </section>
        </aside>
      </div>

      {message ? (
        <p
          className={`rounded-xl px-3 py-2 text-sm ${
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
