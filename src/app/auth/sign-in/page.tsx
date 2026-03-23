import { redirect } from "next/navigation";

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const callback = params.callbackUrl ? `?callbackUrl=${encodeURIComponent(params.callbackUrl)}` : "";

  redirect(`/login${callback}`);
}
