"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useState } from "react";
import type { ActionState } from "@/app/admin/actions";

const ErrorsContext = createContext<Record<string, string>>({});
const PendingContext = createContext(false);

type Props = {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
};

/**
 * A form wired to a server action, exposing field errors to <Field> children.
 * Submits via onSubmit rather than `action=` because React 19 resets
 * uncontrolled inputs after an action, which would wipe the user's input
 * whenever validation fails.
 */
export function ActionForm({ action, children, className }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!state.saved) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 2500);
    return () => clearTimeout(t);
  }, [state]);

  const errors = state.errors ?? {};
  return (
    <ErrorsContext.Provider value={errors}>
      <PendingContext.Provider value={pending}>
      <form
        className={className ?? "space-y-6"}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        {errors._form && (
          <p role="alert" className="rounded-md border border-blood bg-blood/10 px-4 py-2 text-sm text-red-300">
            {errors._form}
          </p>
        )}
        {children}
        {showSaved && (
          <p role="status" className="fixed bottom-6 right-6 rounded-md bg-cerulean px-4 py-2 text-sm font-semibold text-white shadow-lg">
            Saved
          </p>
        )}
      </form>
      </PendingContext.Provider>
    </ErrorsContext.Provider>
  );
}

export function Field({
  name,
  label,
  hint,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const error = useContext(ErrorsContext)[name];
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-parchment">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ash">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const pending = useContext(PendingContext);
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}

export function PublishedToggle({ defaultChecked }: { defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name="published" defaultChecked={defaultChecked} className="h-4 w-4 accent-cerulean" />
      Published (visible to the public)
    </label>
  );
}
