import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getCurrentUser } from "@/lib/auth-session";

export default async function SignUpPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-md">
      <SignUpForm />
    </main>
  );
}
