import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth-session";

type AccountLayoutProps = {
  children: ReactNode;
};

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AccountLayout({ children }: AccountLayoutProps) {
  await requireUser({ callbackUrl: "/account" });

  return children;
}
