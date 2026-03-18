"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction, type AuthFormState } from "@/app/auth/actions";

const initialState: AuthFormState = {};

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200" dir="rtl">
      <h1 className="text-2xl font-bold text-slate-900">إنشاء حساب</h1>

      <div className="space-y-1.5">
        <label htmlFor="fullName" className="block text-sm font-medium text-slate-800">
          الاسم الكامل
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-slate-800">
          البريد الإلكتروني
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-slate-800">
          كلمة المرور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
      </div>

      {state.error ? <p className="text-sm font-medium text-rose-700">{state.error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
      </button>

      <p className="text-sm text-slate-600">
        لديك حساب بالفعل؟{" "}
        <Link href="/auth/sign-in" className="font-semibold text-indigo-700 hover:text-indigo-600">
          تسجيل الدخول
        </Link>
      </p>
    </form>
  );
}
