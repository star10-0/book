import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth-session";

type AccountLayoutProps = {
  children: ReactNode;
};

export default async function AccountLayout({ children }: AccountLayoutProps) {
  await requireUser({ callbackUrl: "/account" });

  return children;
}
