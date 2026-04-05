import { notFound } from "next/navigation";
import {
  forceGrantPaymentAccessAction,
  reconcileByTxAction,
  recoverStuckAttemptAction,
  releasePaymentTxLockAction,
  retryVerifyPaymentAction,
} from "@/app/admin/payments/actions";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { classifyPaymentIncident } from "@/lib/admin/payment-admin";
import { requireAdminScope } from "@/lib/auth-session";
import { formatArabicDate } from "@/lib/formatters/intl";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ attemptId: string }> };

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function extractDiagnosticHint(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const diagnostic = (payload as { diagnostic?: unknown }).diagnostic;
  if (!diagnostic || typeof diagnostic !== "object" || Array.isArray(diagnostic)) {
    return null;
  }

  const code = (diagnostic as { code?: string }).code;

  if (code === "provider_mismatch_possible") {
    const suggestedProvider = (diagnostic as { suggestedProvider?: string }).suggestedProvider;
    if (suggestedProvider === "SHAM_CASH") {
      return "مؤشر تشخيصي: رقم العملية يبدو أقرب إلى Sham Cash. لا تمنح وصولاً تلقائياً؛ اطلب إعادة الاختيار والتحقق عبر المزود الصحيح.";
    }
    if (suggestedProvider === "SYRIATEL_CASH") {
      return "مؤشر تشخيصي: رقم العملية يبدو أقرب إلى Syriatel Cash. لا تمنح وصولاً تلقائياً؛ اطلب إعادة الاختيار والتحقق عبر المزود الصحيح.";
    }
    return "مؤشر تشخيصي: هناك احتمال عدم تطابق بين المزود المختار ورقم العملية.";
  }

  if (code === "tx_not_found_in_selected_provider") {
    return "مؤشر تشخيصي: رقم العملية غير موجود ضمن المزود المختار في هذه المحاولة.";
  }

  return null;
}

function canReconcileByTx(transactionReference: string) {
  return Boolean(transactionReference.trim());
}

export default async function AdminPaymentAttemptPage({ params }: PageProps) {
  await requireAdminScope("PAYMENT_ADMIN", { callbackUrl: "/admin/payments" });
  const { attemptId } = await params;

  const attempt = await prisma.paymentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      user: { select: { id: true, email: true } },
      payment: true,
      order: true,
      adminAuditLogs: { orderBy: { createdAt: "desc" }, include: { actorAdmin: { select: { email: true } } } },
    },
  });

  if (!attempt) notFound();

  const accessExists = await prisma.accessGrant.count({
    where: {
      userId: attempt.userId,
      orderItem: { orderId: attempt.orderId },
      status: "ACTIVE",
    },
  });

  const txRef = (attempt.requestPayload as { transactionReference?: string } | null)?.transactionReference || "";
  const providerReferenceMatchesPayment = !attempt.payment.providerRef || attempt.payment.providerRef === attempt.providerReference;
  const incident = classifyPaymentIncident({
    attemptStatus: attempt.status,
    paymentStatus: attempt.payment.status,
    orderStatus: attempt.order.status,
    hasAccessGrant: accessExists > 0,
    failureReason: attempt.failureReason,
    hasTransactionReference: Boolean(txRef),
    providerReferenceMatchesPayment,
  });
  const diagnosticHint = extractDiagnosticHint(attempt.responsePayload);

  return (
    <div className="space-y-4" dir="rtl">
      <AdminPageCard>
        <AdminPageHeader title={`محاولة دفع: ${attempt.id}`} description="تفاصيل كاملة للمحاولة وإجراءات المعالجة اليدوية الآمنة." />
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>المستخدم: {attempt.user.email}</p>
          <p>الحالة: {attempt.status}</p>
          <p>حالة الدفع: {attempt.payment.status}</p>
          <p>حالة الطلب: {attempt.order.status}</p>
          <p>paymentId: {attempt.paymentId}</p>
          <p>orderId: {attempt.orderId}</p>
          <p>tx: {txRef || "—"}</p>
          <p>providerReference: {attempt.providerReference || "—"}</p>
          <p>providerRef على Payment: {attempt.payment.providerRef || "—"}</p>
          <p>incident: {incident ?? "—"}</p>
          <p>فشل: {attempt.failureReason || "—"}</p>
          <p>createdAt: {formatArabicDate(attempt.createdAt, { dateStyle: "short", timeStyle: "short" })}</p>
          <p>updatedAt: {formatArabicDate(attempt.updatedAt, { dateStyle: "short", timeStyle: "short" })}</p>
          <p>تم التحقق: {attempt.verifiedAt ? formatArabicDate(attempt.verifiedAt, { dateStyle: "short", timeStyle: "short" }) : "—"}</p>
          <p>وصول ممنوح: {accessExists > 0 ? "نعم" : "لا"}</p>
          <p>providerRef متطابق: {providerReferenceMatchesPayment ? "نعم" : "لا"}</p>
        </div>
        {diagnosticHint ? (
          <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{diagnosticHint}</p>
        ) : null}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <form action={retryVerifyPaymentAction} className="rounded border p-3 text-xs"><input type="hidden" name="attemptId" value={attempt.id} /><input type="hidden" name="userId" value={attempt.userId} /><input name="reason" className="mb-2 w-full rounded border px-2 py-1" placeholder="سبب التدخل" required defaultValue="manual retry verify" /><button className="rounded border px-2 py-1">إعادة تحقق</button></form>
          <form action={reconcileByTxAction} className="rounded border p-3 text-xs"><input type="hidden" name="attemptId" value={attempt.id} /><input type="hidden" name="userId" value={attempt.userId} /><input name="transactionReference" className="mb-2 w-full rounded border px-2 py-1" required defaultValue={txRef} /><input name="reason" className="mb-2 w-full rounded border px-2 py-1" required defaultValue="manual tx reconcile" /><button disabled={!canReconcileByTx(txRef)} className="rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50">مطابقة بالمرجع</button></form>
          <form action={recoverStuckAttemptAction} className="rounded border p-3 text-xs"><input type="hidden" name="attemptId" value={attempt.id} /><input type="hidden" name="userId" value={attempt.userId} /><input name="transactionReference" className="mb-2 w-full rounded border px-2 py-1" defaultValue={txRef} placeholder="transactionReference (اختياري)" /><input name="reason" className="mb-2 w-full rounded border px-2 py-1" required defaultValue="manual attempt recovery" /><button className="rounded border px-2 py-1">استرداد محاولة عالقة</button></form>
          <form action={forceGrantPaymentAccessAction} className="rounded border border-rose-200 bg-rose-50 p-3 text-xs"><input type="hidden" name="attemptId" value={attempt.id} /><input name="reason" className="mb-2 w-full rounded border px-2 py-1" required placeholder="سبب إلزامي ومحدد" /><button className="rounded border border-rose-300 px-2 py-1 text-rose-800">منح وصول قسري (حساس)</button></form>
          <form action={releasePaymentTxLockAction} className="rounded border p-3 text-xs"><input type="hidden" name="attemptId" value={attempt.id} /><input name="reason" className="mb-2 w-full rounded border px-2 py-1" required placeholder="سبب تحرير القفل" /><button disabled={attempt.status !== "VERIFYING"} className="rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50">تحرير قفل tx</button></form>
        </div>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="Payloads" description="طلب/استجابة مزود الدفع لأغراض التحقيق." />
        <pre className="overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{prettyJson(attempt.requestPayload)}</pre>
        <pre className="mt-3 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{prettyJson(attempt.responsePayload)}</pre>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="سجل التدقيق الإداري" description="كل تدخل إداري على هذه المحاولة." />
        <ul className="space-y-2 text-sm">
          {attempt.adminAuditLogs.map((log) => (
            <li key={log.id} className="rounded border p-2">
              <p>{log.action} — {log.reason || "—"}</p>
              <p className="text-xs text-slate-500">{log.actorAdmin.email} — {formatArabicDate(log.createdAt, { dateStyle: "short", timeStyle: "short" })}</p>
            </li>
          ))}
        </ul>
      </AdminPageCard>
    </div>
  );
}
