"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type AuthFormState } from "@/app/auth/actions";

const initialState: AuthFormState = {};

type SignInFormProps = {
  callbackUrl?: string;
};

export function SignInForm({ callbackUrl }: SignInFormProps) {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200" dir="rtl" noValidate>
      <h1 className="text-2xl font-bold text-slate-900">تسجيل الدخول</h1>

      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/account"} />

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
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
        {state.fieldErrors?.email ? (
          <p id="email-error" className="text-sm font-medium text-rose-700" role="alert">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-slate-800">
          كلمة المرور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
        {state.fieldErrors?.password ? (
          <p id="password-error" className="text-sm font-medium text-rose-700" role="alert">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p className="text-sm font-medium text-rose-700" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "جارٍ تسجيل الدخول..." : "دخول"}
      </button>

      <p className="text-sm text-slate-600">
        ليس لديك حساب؟{" "}
        <Link href="/register" className="font-semibold text-indigo-700 hover:text-indigo-600">
          إنشاء حساب جديد
        </Link>
      </p>
    </form>
  );
}
