"use client";

import { PaymentAttemptStatus, PaymentProvider } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatArabicCurrency } from "@/lib/formatters/intl";

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
  enabledLiveProviders?: LiveProviderOption[];
}

type UiStatus = "idle" | "pending" | "success" | "failure";
type LiveProviderOption = "SHAM_CASH" | "SYRIATEL_CASH";

const paymentOptions: Array<{ provider: LiveProviderOption; label: string; instructions: string }> = [
  {
    provider: PaymentProvider.SHAM_CASH,
    label: "Sham Cash",
    instructions: "حوّل المبلغ المطلوب يدويًا إلى حساب Sham Cash أدناه، مع الاحتفاظ بمرجع الطلب، ثم أدخل رقم العملية (tx).",
  },
  {
    provider: PaymentProvider.SYRIATEL_CASH,
    label: "Syriatel Cash",
    instructions: "أرسل المبلغ عبر Syriatel Cash ثم أضف رقم العملية أو لقطة الإشعار في خانة الإثبات.",
  },
];

const statusLabel: Record<UiStatus, string> = {
  idle: "بانتظار بدء الدفع",
  pending: "قيد المتابعة",
  success: "تم الدفع بنجاح",
  failure: "فشل الدفع",
};

const promoAudienceHints = [
  "قد يكون بعض الأكواد مخصصًا لمؤسسة معينة (حسابات الأعمال/الجامعات) ولن يعمل مع حسابات أخرى.",
  "قد يكون الكود مقيدًا بنوع العرض (شراء أو إيجار) أو بحد أدنى لقيمة الطلب.",
];

function mapAttemptStatusToUiStatus(status?: PaymentAttemptStatus): UiStatus {
  if (!status) return "idle";
  if (status === "PAID") return "success";
  if (status === "FAILED") return "failure";
  if (status === "SUBMITTED" || status === "VERIFYING" || status === "PENDING") return "pending";
  return "idle";
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
  enabledLiveProviders,
}: OrderPaymentPanelProps) {
  const router = useRouter();
  const availablePaymentOptions = paymentOptions.filter((option) => {
    if (!enabledLiveProviders || enabledLiveProviders.length === 0) {
      return true;
    }
    return enabledLiveProviders.includes(option.provider);
  });
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>(
    availablePaymentOptions[0]?.provider ?? PaymentProvider.SHAM_CASH,
  );
  const [attemptId, setAttemptId] = useState<string | undefined>(initialAttemptId);
  const [attemptStatus, setAttemptStatus] = useState<PaymentAttemptStatus | undefined>(initialAttemptStatus);
  const [transactionReference, setTransactionReference] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState(appliedPromoCode ?? "");
  const [message, setMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const selectedOption = availablePaymentOptions.find((option) => option.provider === selectedProvider) ?? availablePaymentOptions[0];
  const uiStatus = mapAttemptStatusToUiStatus(attemptStatus);

  const applyPromoCode = () => {
    if (!promoCodeInput.trim()) {
      setMessage("الرجاء إدخال رمز الخصم أولاً.");
      return;
    }

    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/checkout/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, code: promoCodeInput.trim() }),
      });

      const payload = (await response.json()) as { message?: string; promo?: { isFree?: boolean } };

      if (!response.ok) {
        setMessage(payload.message ?? "تعذر تطبيق رمز الخصم.");
        return;
      }

      setMessage(payload.promo?.isFree ? "تم تطبيق الرمز، أصبح الطلب مجانيًا بالكامل." : "تم تطبيق رمز الخصم بنجاح.");
      router.refresh();
    });
  };

  const completeFreeOrder = () => {
    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/checkout/complete-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(payload.message ?? "تعذر إتمام الطلب المجاني.");
        return;
      }

      setMessage("تم إتمام الطلب المجاني ومنح الوصول للكتب.");
      router.refresh();
    });
  };

  const createPaymentAttempt = () => {
    startTransition(async () => {
      setMessage("");

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
        payment?: { id: string };
        attempt?: { id: string; status: PaymentAttemptStatus };
      };

      if (!response.ok || !payload.attempt) {
        setMessage(payload.message ?? "تعذر إنشاء محاولة الدفع.");
        return;
      }

      setAttemptId(payload.attempt.id);
      setAttemptStatus(payload.attempt.status);
      setMessage(
        selectedProvider === PaymentProvider.SHAM_CASH
          ? "تم إنشاء طلب الدفع. حوّل الآن عبر Sham Cash ثم أدخل رقم العملية (tx)."
          : "تم إنشاء طلب الدفع. نفّذ التحويل ثم أدخل رقم العملية (tx).",
      );
      router.refresh();
    });
  };

  const submitProof = () => {
    if (!attemptId || !transactionReference.trim()) {
      setMessage("يرجى إدخال مرجع عملية صالح قبل الإرسال.");
      return;
    }

    startTransition(async () => {
      setMessage("");

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
        setMessage(payload.message ?? "تعذر إرسال إثبات الدفع.");
        return;
      }

      setAttemptStatus(payload.attempt.status);
      setMessage("تم إرسال الإثبات. حالة الطلب الآن: قيد المتابعة.");
      router.refresh();
    });
  };

  const verifyPaymentStatus = () => {
    if (!attemptId) {
      setMessage("لا توجد محاولة دفع للتحقق.");
      return;
    }

    startTransition(async () => {
      setMessage("");

      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        attempt?: { status: PaymentAttemptStatus; failureReason?: string | null };
      };

      if (!response.ok || !payload.attempt) {
        setMessage(payload.message ?? "تعذر تنفيذ التحقق من الدفع.");
        return;
      }

      setAttemptStatus(payload.attempt.status);

      if (payload.attempt.status === "PAID") {
        setMessage("تم تأكيد الدفع بنجاح.");
      } else if (payload.attempt.status === "FAILED") {
        setMessage(payload.attempt.failureReason ?? "فشل التحقق من عملية الدفع.");
      } else {
        setMessage("تم تحديث حالة التحقق، ما تزال العملية قيد المتابعة.");
      }

      router.refresh();
    });
  };

  const isFreeOrder = totalCents === 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">الدفع للطلب</h2>
      <p className="mt-1 text-sm text-slate-600">اختر وسيلة الدفع، ثم نفّذ التحويل اليدوي وأدخل رقم العملية (tx) لإرسالها للتحقق.</p>

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
          <p className="mt-1">لن يتم طلب دفع خارجي. هذا يُعامل كطلب مجاني/تكميلي (Complimentary).</p>
          <p className="mt-1">اضغط الزر أدناه لإتمام الطلب ومنح الوصول مباشرة.</p>
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
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">تعليمات الدفع</p>
            <p className="mt-1">{selectedOption.instructions}</p>
            {selectedProvider === PaymentProvider.SHAM_CASH ? (
              <dl className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-semibold">حساب الاستلام</dt>
                  <dd className="font-mono text-xs sm:text-sm">{shamCashDestinationAccount ?? "غير متاح حالياً"}</dd>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <dt className="font-semibold">المبلغ</dt>
                  <dd>{formatArabicCurrency(totalCents / 100, { currency })}</dd>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <dt className="font-semibold">مرجع الطلب</dt>
                  <dd className="font-mono text-xs sm:text-sm">{orderId}</dd>
                </div>
                <div className="mt-3 border-t border-indigo-200 pt-2">
                  <p className="font-semibold">خطوات الدفع عبر Sham Cash</p>
                  <ol className="mt-1 list-decimal space-y-1 pr-4 text-xs sm:text-sm">
                    <li>افتح تطبيق Sham Cash وحوّل المبلغ الكامل إلى حساب الاستلام أعلاه.</li>
                    <li>اكتب مرجع الطلب <span className="font-mono">{orderId}</span> في ملاحظات التحويل إن أمكن.</li>
                    <li>بعد نجاح التحويل، أدخل رقم العملية (tx) في الحقل أدناه ثم اضغط زر إرسال رقم العملية.</li>
                    <li>اضغط زر تحقق من حالة الدفع لإتمام التحقق ومنح الوصول تلقائياً عند نجاح العملية.</li>
                  </ol>
                </div>
              </dl>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            <label className="block text-sm font-semibold text-slate-800" htmlFor="transaction-reference">
              رقم العملية (tx)
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
              disabled={isPending || !isPayable}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              إنشاء طلب دفع
            </button>
            <button
              type="button"
              onClick={submitProof}
              disabled={isPending || !attemptId}
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
              تحقق من حالة الدفع
            </button>
          </div>
        </>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <p>
          <span className="font-semibold text-slate-800">حالة الدفع:</span> {statusLabel[uiStatus]}
        </p>
        {attemptId ? (
          <p className="mt-1 text-slate-600">
            رقم المحاولة: <span className="font-mono text-xs">{attemptId}</span>
          </p>
        ) : null}
      </div>

      {message ? <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p> : null}
    </section>
  );
}
