"use server";

import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth-password";
import { endUserSession, startUserSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"fullName" | "email" | "password", string>>;
};

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveSafeCallbackUrl(rawCallbackUrl: string) {
  if (!rawCallbackUrl.startsWith("/")) {
    return "/account";
  }

  if (rawCallbackUrl.startsWith("//")) {
    return "/account";
  }

  return rawCallbackUrl;
}

export async function signInAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = readField(formData, "email").toLowerCase();
  const password = readField(formData, "password");
  const callbackUrl = resolveSafeCallbackUrl(readField(formData, "callbackUrl") || "/account");

  const fieldErrors: AuthFormState["fieldErrors"] = {};

  if (!email) {
    fieldErrors.email = "يرجى إدخال البريد الإلكتروني.";
  }

  if (!password) {
    fieldErrors.password = "يرجى إدخال كلمة المرور.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "تحقق من الحقول المطلوبة ثم أعد المحاولة.", fieldErrors };
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

  const fieldErrors: AuthFormState["fieldErrors"] = {};

  if (!fullName) {
    fieldErrors.fullName = "يرجى إدخال الاسم الكامل.";
  }

  if (!email) {
    fieldErrors.email = "يرجى إدخال البريد الإلكتروني.";
  }

  if (!password) {
    fieldErrors.password = "يرجى إدخال كلمة المرور.";
  } else if (password.length < 8) {
    fieldErrors.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "تحقق من الحقول المطلوبة ثم أعد المحاولة.", fieldErrors };
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (existing) {
    return {
      error: "هذا البريد الإلكتروني مسجل بالفعل.",
      fieldErrors: { email: "هذا البريد الإلكتروني مستخدم مسبقًا." },
    };
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
  redirect("/account");
}

export async function signOutAction() {
  await endUserSession();
  redirect("/");
}
