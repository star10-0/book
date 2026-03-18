import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "إنشاء حساب",
  description: "أنشئ حسابًا جديدًا للبدء في شراء واستئجار الكتب الرقمية على منصة Book.",
};

export default async function SignUpPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main>
      <SiteHeader />
      <div className="mx-auto max-w-md">
        <SignUpForm />
      </div>
      <SiteFooter />
    </main>
  );
}
