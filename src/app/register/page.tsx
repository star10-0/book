import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "إنشاء حساب",
  description: "أنشئ حسابًا جديدًا للوصول إلى مكتبتك الرقمية، ثم فعّل مسار الكاتب للدخول إلى الاستوديو ونشر الكتب.",
};

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/account");
  }

  return (
    <main>
      <section className="mx-auto max-w-md space-y-3" aria-label="نموذج إنشاء حساب">
        <p className="text-center text-sm text-slate-600">انضم الآن إلى مكتبة Book الرقمية.</p>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900" dir="rtl">
          <p className="font-semibold">هل تريد النشر ككاتب؟</p>
          <p className="mt-1 text-xs">
            ابدأ بحساب عادي، ثم من «لوحة الكاتب» فعّل ملف الكاتب للدخول إلى الاستوديو، إنشاء الكتب، رفع المحتوى، ثم النشر.
          </p>
        </div>
        <SignUpForm />
      </section>
      <SiteFooter />
    </main>
  );
}
