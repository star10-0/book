import type { NextRequest, NextResponse as NextResponseType } from "next/server";
import { NextResponse } from "next/server";
import { buildContentSecurityPolicy } from "./lib/security/csp";

function applySecurityHeaders({
  response,
  isDevelopment,
  nonce,
  pathname,
}: {
  response: NextResponseType;
  isDevelopment: boolean;
  nonce?: string;
  pathname: string;
}) {
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy({
      isDevelopment,
      nonce,
    }),
  );

  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");

  if (pathname.startsWith("/api") || pathname.startsWith("/uploads/books")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isDevelopment = process.env.NODE_ENV === "development";
  const nonce = isDevelopment ? undefined : crypto.randomUUID().replace(/-/g, "");
  const requestHeaders = new Headers(request.headers);

  if (nonce) {
    requestHeaders.set("x-nonce", nonce);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  applySecurityHeaders({
    response,
    isDevelopment,
    nonce,
    pathname,
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
