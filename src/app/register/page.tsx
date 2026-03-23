import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "إنشاء حساب",
  description: "أنشئ حسابًا جديدًا للوصول إلى مكتبتك الرقمية وبدء شراء أو استئجار الكتب.",
};

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/account");
  }

  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-md space-y-3" aria-label="نموذج إنشاء حساب">
        <p className="text-center text-sm text-slate-600">انضم الآن إلى مكتبة Book الرقمية.</p>
        <SignUpForm />
      </section>
      <SiteFooter />
    </main>
  );
}
