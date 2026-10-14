"use client";

import { useActionState } from "react";
import { resetPasswordFromLink, type ActionState } from "../actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(resetPasswordFromLink, {});
  const errors = state.errors ?? {};
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="mb-1 block text-sm">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required className="field" />
        {errors.password ? (
          <p className="mt-1 text-xs text-red-400">{errors.password}</p>
        ) : (
          <p className="mt-1 text-xs text-ash">At least 10 characters.</p>
        )}
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm">Confirm new password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required className="field" />
        {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>}
      </div>
      {errors._form && <p role="alert" className="text-sm text-red-400">{errors._form}</p>}
      <button type="submit" className="btn btn-primary w-full justify-center" disabled={pending}>
        {pending ? "Transmitting…" : "Set new password"}
      </button>
    </form>
  );
}
