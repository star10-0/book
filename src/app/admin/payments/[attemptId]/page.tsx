import { notFound } from "next/navigation";
import {
  forceGrantPaymentAccessAction,
  reconcileByTxAction,
  releasePaymentTxLockAction,
  retryVerifyPaymentAction,
} from "@/app/admin/payments/actions";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { formatArabicDate } from "@/lib/formatters/intl";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ attemptId: string }> };

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

export default async function AdminPaymentAttemptPage({ params }: PageProps) {
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

  return (
    <div className="space-y-4" dir="rtl">
      <AdminPageCard>
        <AdminPageHeader title={`محاولة دفع: ${attempt.id}`} description="تفاصيل كاملة للمحاولة وإجراءات المعالجة اليدوية الآمنة." />
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>المستخدم: {attempt.user.email}</p>
          <p>الحالة: {attempt.status}</p>
          <p>حالة الدفع: {attempt.payment.status}</p>
          <p>حالة الطلب: {attempt.order.status}</p>
          <p>tx: {txRef || "—"}</p>
          <p>providerReference: {attempt.providerReference || "—"}</p>
          <p>providerRef على Payment: {attempt.payment.providerRef || "—"}</p>
          <p>فشل: {attempt.failureReason || "—"}</p>
          <p>تم التحقق: {attempt.verifiedAt ? formatArabicDate(attempt.verifiedAt, { dateStyle: "short", timeStyle: "short" }) : "—"}</p>
          <p>وصول ممنوح: {accessExists > 0 ? "نعم" : "لا"}</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <form action={retryVerifyPaymentAction} className="rounded border p-3 text-xs"><input type="hidden" name="attemptId" value={attempt.id} /><input type="hidden" name="userId" value={attempt.userId} /><input name="reason" className="mb-2 w-full rounded border px-2 py-1" placeholder="سبب التدخل" required defaultValue="manual retry verify" /><button className="rounded border px-2 py-1">إعادة تحقق</button></form>
          <form action={reconcileByTxAction} className="rounded border p-3 text-xs"><input type="hidden" name="attemptId" value={attempt.id} /><input type="hidden" name="userId" value={attempt.userId} /><input name="transactionReference" className="mb-2 w-full rounded border px-2 py-1" required defaultValue={txRef} /><input name="reason" className="mb-2 w-full rounded border px-2 py-1" required defaultValue="manual tx reconcile" /><button className="rounded border px-2 py-1">مطابقة بالمرجع</button></form>
          <form action={forceGrantPaymentAccessAction} className="rounded border p-3 text-xs"><input type="hidden" name="attemptId" value={attempt.id} /><input name="reason" className="mb-2 w-full rounded border px-2 py-1" required placeholder="سبب إلزامي" /><button className="rounded border px-2 py-1">منح وصول قسري (مع تدقيق)</button></form>
          <form action={releasePaymentTxLockAction} className="rounded border p-3 text-xs"><input type="hidden" name="attemptId" value={attempt.id} /><input name="reason" className="mb-2 w-full rounded border px-2 py-1" required placeholder="سبب تحرير القفل" /><button className="rounded border px-2 py-1">تحرير قفل tx</button></form>
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
