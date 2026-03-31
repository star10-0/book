import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/auth-session";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export const metadata: Metadata = {
  title: "تسجيل الدخول",
  description: "سجّل الدخول للوصول إلى حسابك وإدارة مكتبتك الرقمية وطلباتك.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/account");
  }

  const params = await searchParams;

  return (
    <main>
      <section className="mx-auto max-w-md space-y-3" aria-label="نموذج تسجيل الدخول">
        <p className="text-center text-sm text-slate-600">أهلًا بك مجددًا، قم بتسجيل الدخول للمتابعة.</p>
        <SignInForm callbackUrl={params.callbackUrl} />
      </section>
      <SiteFooter />
    </main>
  );
}
