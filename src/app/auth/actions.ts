"use server";

import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth-password";
import { endUserSession, startUserSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export type AuthFormState = {
  error?: string;
};

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveSafeCallbackUrl(rawCallbackUrl: string) {
  if (!rawCallbackUrl.startsWith("/")) {
    return "/account/orders";
  }

  if (rawCallbackUrl.startsWith("//")) {
    return "/account/orders";
  }

  return rawCallbackUrl;
}

export async function signInAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = readField(formData, "email").toLowerCase();
  const password = readField(formData, "password");
  const callbackUrl = resolveSafeCallbackUrl(readField(formData, "callbackUrl") || "/account/orders");

  if (!email || !password) {
    return { error: "يرجى إدخال البريد الإلكتروني وكلمة المرور." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      isActive: true,
    },
  });

  if (!user || !user.passwordHash || !user.isActive) {
    return { error: "بيانات الدخول غير صحيحة أو الحساب غير مفعل." };
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    return { error: "بيانات الدخول غير صحيحة أو الحساب غير مفعل." };
  }

  await startUserSession(user.id);
  redirect(callbackUrl);
}

export async function signUpAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fullName = readField(formData, "fullName");
  const email = readField(formData, "email").toLowerCase();
  const password = readField(formData, "password");

  if (!fullName || !email || !password) {
    return { error: "جميع الحقول مطلوبة." };
  }

  if (password.length < 8) {
    return { error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل." };
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (existing) {
    return { error: "هذا البريد الإلكتروني مسجل بالفعل." };
  }

  const createdUser = await prisma.user.create({
    data: {
      fullName,
      email,
      role: UserRole.USER,
      isActive: true,
      passwordHash: await hashPassword(password),
    },
    select: {
      id: true,
    },
  });

  await startUserSession(createdUser.id);
  redirect("/account/orders");
}

export async function signOutAction() {
  await endUserSession();
  redirect("/");
}
