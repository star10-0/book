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
}

type UiStatus = "idle" | "pending" | "success" | "failure";

const paymentOptions: Array<{ provider: PaymentProvider; label: string; instructions: string }> = [
  {
    provider: PaymentProvider.SHAM_CASH,
    label: "Sham Cash",
    instructions: "حوّل المبلغ المطلوب إلى حساب Sham Cash الرسمي ثم أدخل مرجع العملية كما يظهر في التطبيق.",
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
}: OrderPaymentPanelProps) {
  const router = useRouter();
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>(PaymentProvider.SHAM_CASH);
  const [attemptId, setAttemptId] = useState<string | undefined>(initialAttemptId);
  const [attemptStatus, setAttemptStatus] = useState<PaymentAttemptStatus | undefined>(initialAttemptStatus);
  const [transactionReference, setTransactionReference] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState(appliedPromoCode ?? "");
  const [message, setMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const selectedOption = paymentOptions.find((option) => option.provider === selectedProvider) ?? paymentOptions[0];
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
      setMessage("تم إنشاء طلب الدفع. أرسل الآن مرجع العملية أو إثبات الدفع.");
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

  const verifyMock = (mockOutcome: "paid" | "failed") => {
    if (!attemptId) {
      setMessage("لا توجد محاولة دفع للتحقق.");
      return;
    }

    startTransition(async () => {
      setMessage("");

      const response = await fetch("/api/payments/verify-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          mockOutcome,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        attempt?: { status: PaymentAttemptStatus; failureReason?: string | null };
      };

      if (!response.ok || !payload.attempt) {
        setMessage(payload.message ?? "تعذر تنفيذ التحقق التجريبي.");
        return;
      }

      setAttemptStatus(payload.attempt.status);

      if (payload.attempt.status === "PAID") {
        setMessage("تم تأكيد الدفع بنجاح.");
      } else {
        setMessage(payload.attempt.failureReason ?? "فشل التحقق من عملية الدفع.");
      }

      router.refresh();
    });
  };

  const isFreeOrder = totalCents === 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">الدفع للطلب</h2>
      <p className="mt-1 text-sm text-slate-600">اختر وسيلة الدفع، ثم أدخل مرجع العملية أو إثبات الدفع لإرسالها للمراجعة.</p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="font-semibold text-slate-900">رمز الخصم</p>
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
        <p className="mt-2 text-xs text-slate-700">
          الخصم: {formatArabicCurrency(discountCents / 100, { currency })} · الإجمالي بعد الخصم: {formatArabicCurrency(totalCents / 100, { currency })}
        </p>
      </div>

      {isFreeOrder ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">هذا الطلب مجاني بالكامل بعد تطبيق الخصم.</p>
          <p className="mt-1">لن يتم طلب دفع خارجي. اضغط الزر أدناه لإتمام الطلب ومنح الوصول مباشرة.</p>
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
            {paymentOptions.map((option) => {
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
          </div>

          <div className="mt-4 space-y-3">
            <label className="block text-sm font-semibold text-slate-800" htmlFor="transaction-reference">
              مرجع العملية (تجريبي)
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
              إرسال مرجع/إثبات
            </button>
            <button
              type="button"
              onClick={() => verifyMock("paid")}
              disabled={isPending || !attemptId || attemptStatus === "PAID" || attemptStatus === "FAILED"}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              محاكاة نجاح
            </button>
            <button
              type="button"
              onClick={() => verifyMock("failed")}
              disabled={isPending || !attemptId || attemptStatus === "PAID" || attemptStatus === "FAILED"}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              محاكاة فشل
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
