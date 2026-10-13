"use client";

/** Confirm before submitting a destructive server action. */
export function DeleteButton({ action, label = "Delete", confirmText }: { action: () => Promise<void>; label?: string; confirmText: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <button type="submit" className="btn btn-danger">{label}</button>
    </form>
  );
}
