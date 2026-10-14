"use client";

import { NOTICE_TITLES, type NoticeKind } from "@/lib/notices";

export type Notice = { kind: NoticeKind; detail: string; id: number };

/**
 * Prominent save result, pinned under the header. Success reads as a
 * cogitator readout; failure as a blood-red warning that stays until dismissed.
 */
export function SaveNotice({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  const success = notice.kind === "saved" || notice.kind === "created";
  return (
    // Outer element positions; inner carries the look (.cogitator sets its own position).
    <div className="fixed left-1/2 top-20 z-50 w-[min(92vw,32rem)] -translate-x-1/2">
    <div
      key={notice.id}
      role={success ? "status" : "alert"}
      aria-live={success ? "polite" : "assertive"}
      className={`notice-in p-4 shadow-[0_12px_40px_rgba(0,0,0,0.8)] ${
        success ? "cogitator" : "border-2 border-blood-bright bg-[#1a0806] text-parchment"
      }`}
    >
      <div className="relative flex items-start gap-3">
        <span aria-hidden className={`mt-0.5 text-2xl leading-none ${success ? "" : "text-blood-bright"}`}>
          {success ? "✠" : "☠"}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-xs uppercase tracking-[0.3em] ${success ? "" : "font-mono text-blood-bright"}`}>
            +++ {NOTICE_TITLES[notice.kind]} +++
          </p>
          <p className={`mt-1 ${success ? "text-sm" : "font-serif text-base"}`}>{notice.detail}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={`text-lg leading-none opacity-70 hover:opacity-100 ${success ? "" : "text-parchment"}`}
        >
          ×
        </button>
      </div>
    </div>
    </div>
  );
}
