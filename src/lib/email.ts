import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type Email = { to: string; subject: string; text: string; html: string };

/**
 * Sends an email. Transport, in order of preference:
 *   1. EMAIL_OUTBOX_DIR set → write JSON files there (tests read them)
 *   2. RESEND_API_KEY set   → Resend's HTTP API
 *   3. otherwise            → print to the server log (local development)
 */
export async function sendEmail(email: Email): Promise<void> {
  const outbox = process.env.EMAIL_OUTBOX_DIR;
  if (outbox) {
    await mkdir(outbox, { recursive: true });
    const file = path.join(outbox, `${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    await writeFile(file, JSON.stringify(email, null, 2));
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[email] RESEND_API_KEY not set; not sent.\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Archivum <onboarding@resend.dev>",
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });
  if (!res.ok) {
    // Don't include the response body verbatim in user-facing errors; log it for the operator.
    const detail = await res.text().catch(() => "");
    console.error(`[email] Resend rejected the message (${res.status}): ${detail.slice(0, 500)}`);
    throw new Error("Email could not be sent");
  }
}

/**
 * Base URL for links in emails. Never derived from the request's Host header,
 * which an attacker controls (that would let them poison reset links).
 */
export function appBaseUrl(): string {
  const url = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  if (url) return url.replace(/\/+$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error("Set APP_URL so emailed links point at the right site");
}
