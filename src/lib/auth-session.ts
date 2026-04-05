import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type AdminScope } from "@prisma/client";
import { hasAcceptedCurrentDevicePolicy } from "@/lib/policy";
import { hasAdminScope, isAdminRole, isCreatorOrAdminRole } from "@/lib/authz";
import { assertServerEnv, readRequiredServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "book_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

function getAuthSecret() {
  assertServerEnv();
  return readRequiredServerEnv("AUTH_SECRET");
}

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function verifySignature(payload: string, signature: string) {
  const expected = signPayload(payload);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

type SessionPayload = {
  sub: string;
  exp: number;
  sv: number;
};

function encodeSession(payload: SessionPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  if (!verifySignature(encodedPayload, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;

    if (!payload.sub || typeof payload.exp !== "number" || typeof payload.sv !== "number") {
      return null;
    }

    if (Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function startUserSession(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });

  if (!user) {
    throw new Error("Cannot start session for non-existent user.");
  }

  const expires = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  const token = encodeSession({
    sub: userId,
    exp: Math.floor(expires.getTime() / 1000),
    sv: user.sessionVersion,
  });

  const store = await cookies();

  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endUserSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = decodeSession(token);

  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      sessionVersion: true,
      acceptedTermsVersion: true,
      acceptedDevicePolicyAt: true,
      requirePasswordReset: true,
      adminScopes: true,
      creatorProfile: {
        select: {
          slug: true,
          displayName: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  if (user.sessionVersion !== payload.sv) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.fullName,
    role: user.role,
    acceptedTermsVersion: user.acceptedTermsVersion,
    acceptedDevicePolicyAt: user.acceptedDevicePolicyAt,
    requirePasswordReset: user.requirePasswordReset,
    adminScopes: user.adminScopes,
    creatorProfile: user.creatorProfile,
  };
}

export async function requireUser(options?: { callbackUrl?: string; allowUnacceptedPolicy?: boolean }) {
  const user = await getCurrentUser();

  if (!user) {
    const callback = options?.callbackUrl ? `?callbackUrl=${encodeURIComponent(options.callbackUrl)}` : "";
    redirect(`/login${callback}`);
  }

  if (
    !options?.allowUnacceptedPolicy &&
    !hasAcceptedCurrentDevicePolicy({
      acceptedTermsVersion: user.acceptedTermsVersion,
      acceptedDevicePolicyAt: user.acceptedDevicePolicyAt,
    })
  ) {
    const callback = options?.callbackUrl ? `?callbackUrl=${encodeURIComponent(options.callbackUrl)}` : "";
    redirect(`/policy${callback}`);
  }


  if (!options?.allowUnacceptedPolicy && user.requirePasswordReset) {
    const callback = options?.callbackUrl ? `&callbackUrl=${encodeURIComponent(options.callbackUrl)}` : "";
    redirect(`/account/profile?forcePasswordReset=1${callback}`);
  }
  return user;
}

export async function requireAdmin(options?: { callbackUrl?: string }) {
  const user = await requireUser(options);

  if (!isAdminRole(user.role)) {
    redirect("/");
  }

  return user;
}

export async function requireAdminScope(requiredScope: AdminScope, options?: { callbackUrl?: string }) {
  const admin = await requireAdmin(options);

  if (!hasAdminScope({ adminScopes: admin.adminScopes, required: requiredScope })) {
    redirect("/admin");
  }

  return admin;
}

export async function requireCreator(options?: { callbackUrl?: string }) {
  const user = await requireUser(options);

  if (!isCreatorOrAdminRole(user.role)) {
    redirect("/account/profile");
  }

  return user;
}
