import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildContentSecurityPolicy } from "./lib/security/csp";

export function middleware(request: NextRequest) {
  const isApiRequest = request.nextUrl.pathname.startsWith("/api");

  if (isApiRequest) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  }

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

  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy({
      isDevelopment,
      nonce,
    }),
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/books).*)"],
};
