"use client";

import { useActionState } from "react";
import { forgotPassword, type ForgotState } from "../actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(forgotPassword, {});
  if (state.sent) {
    return (
      <div role="status" className="cogitator mt-8 p-4 text-sm">
        <p className="text-xs uppercase tracking-[0.3em]">+++ Transmission sent +++</p>
        <p className="mt-2">
          If an account exists for that address, a reset link is on its way. It works once and expires within the hour.
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="mt-8 space-y-4">
      <p className="text-sm text-ash">Enter your account&apos;s email and we&apos;ll send you a link to choose a new password.</p>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="field" />
      </div>
      {state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" className="btn btn-primary w-full justify-center" disabled={pending}>
        {pending ? "Transmitting…" : "Send reset link"}
      </button>
    </form>
  );
}
