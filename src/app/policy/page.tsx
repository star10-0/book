import { acceptDevicePolicyAction } from "@/app/auth/actions";
import { DEVICE_POLICY_NOTICE_AR, DEVICE_POLICY_TERMS_VERSION } from "@/lib/policy";
import { requireUser } from "@/lib/auth-session";

type AccountPolicyPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function AccountPolicyPage({ searchParams }: AccountPolicyPageProps) {
  await requireUser({ callbackUrl: "/policy", allowUnacceptedPolicy: true });
  const params = await searchParams;

  return (
    <section dir="rtl" className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">تأكيد سياسة استخدام الحساب</h1>
      <p className="mt-3 text-sm leading-7 text-slate-700">{DEVICE_POLICY_NOTICE_AR}</p>
      <p className="mt-2 text-xs text-slate-500">إصدار السياسة: {DEVICE_POLICY_TERMS_VERSION}</p>

      <form action={acceptDevicePolicyAction} className="mt-6 space-y-4">
        <input type="hidden" name="callbackUrl" value={params.callbackUrl ?? "/account"} />
        <label className="flex items-start gap-3 text-sm text-slate-800">
          <input name="acceptedPolicy" type="checkbox" required className="mt-1 h-4 w-4 rounded border-slate-300" />
          <span>أوافق على سياسة الاستخدام، وأتعهد بعدم مشاركة الحساب مع الغير.</span>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          متابعة إلى الحساب
        </button>
      </form>
    </section>
  );
}
