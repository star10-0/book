import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/auth-session";

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export const metadata: Metadata = {
  title: "تسجيل الدخول",
  description: "سجّل الدخول للوصول إلى مكتبتك الرقمية وإدارة طلباتك وإعاراتك.",
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main>
      <SiteHeader />
      <div className="mx-auto max-w-md">
        <SignInForm callbackUrl={params.callbackUrl} />
      </div>
      <SiteFooter />
    </main>
  );
}
