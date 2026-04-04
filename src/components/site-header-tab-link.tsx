"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
type SiteHeaderTabLinkProps = {
  href: string;
  label: string;
};

const isActivePath = (pathname: string, href: string) => {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export function SiteHeaderTabLink({ href, label }: SiteHeaderTabLinkProps) {
  const pathname = usePathname() || "/";
  const isActive = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      className={`store-header-tab${isActive ? " store-header-tab-active" : ""}`}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
