"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState } from "react";
import type { ActionState } from "@/app/admin/actions";
import { failureNotice, successLine } from "@/lib/notices";
import { SaveNotice, type Notice } from "./SaveNotice";

const ErrorsContext = createContext<Record<string, string>>({});
const PendingContext = createContext(false);

type Props = {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
};

const SUCCESS_MS = 6000;

/**
 * A form wired to a server action, exposing field errors to <Field> children
 * and announcing every save result with a notice.
 *
 * Submits via onSubmit rather than `action=` because React 19 resets
 * uncontrolled inputs after an action, which would wipe the user's input
 * whenever validation fails.
 */
export function ActionForm({ action, children, className }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [notice, setNotice] = useState<Notice | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const counter = useRef(0);

  // Result of the latest submit.
  useEffect(() => {
    const errors = state.errors ?? {};
    if (state.saved) {
      setNotice({ kind: "saved", detail: successLine("saved"), id: ++counter.current });
    } else if (Object.keys(errors).length > 0) {
      setNotice({ ...failureNotice(errors), id: ++counter.current });
      // Bring the first problem into view.
      const first = formRef.current?.querySelector<HTMLElement>("[data-field-error], [data-form-error]");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state]);

  // Create actions redirect to the new record's editor with ?created=1.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("created") !== "1") return;
    setNotice({ kind: "created", detail: successLine("created"), id: ++counter.current });
    url.searchParams.delete("created");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  // Successes fade on their own; failures stay until dismissed or resubmitted.
  useEffect(() => {
    if (!notice || (notice.kind !== "saved" && notice.kind !== "created")) return;
    const t = setTimeout(() => setNotice(null), SUCCESS_MS);
    return () => clearTimeout(t);
  }, [notice]);

  const errors = state.errors ?? {};
  return (
    <ErrorsContext.Provider value={errors}>
      <PendingContext.Provider value={pending}>
        <form
          ref={formRef}
          className={className ?? "space-y-6"}
          onSubmit={(e) => {
            e.preventDefault();
            setNotice(null);
            const data = new FormData(e.currentTarget);
            startTransition(() => formAction(data));
          }}
        >
          {errors._form && (
            <p data-form-error className="border border-blood bg-blood/15 px-4 py-2 text-sm text-red-300">
              {errors._form}
            </p>
          )}
          {children}
        </form>
        {notice && <SaveNotice notice={notice} onDismiss={() => setNotice(null)} />}
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
      {error && (
        <p data-field-error className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const pending = useContext(PendingContext);
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Transmitting…" : children}
    </button>
  );
}

export function PublishedToggle({ defaultChecked }: { defaultChecked?: boolean }) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input type="checkbox" name="published" defaultChecked={defaultChecked} className="h-5 w-5 accent-cerulean" />
      Published (visible to the public)
    </label>
  );
}
