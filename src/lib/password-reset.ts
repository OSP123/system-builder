import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { appBaseUrl, sendEmail } from "./email";
import { SITE } from "./site";

/**
 * "Forgot password" links.
 *
 * - Requests always look the same to the requester, so the form can't be used
 *   to discover which emails have accounts.
 * - Tokens are random, single-use, expire after an hour, and only their
 *   SHA-256 hash is stored. Requesting a new link voids older ones.
 * - At most MAX_PER_HOUR emails per account per hour, to stop inbox flooding.
 */

export const TOKEN_TTL_MS = 60 * 60 * 1000;
export const MAX_PER_HOUR = 3;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function requestPasswordReset(rawEmail: string, now = new Date()): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.disabled) return;

  const recent = await db.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gt: new Date(now.getTime() - 60 * 60 * 1000) } },
  });
  if (recent >= MAX_PER_HOUR) return;

  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    // Void older links by marking them spent (not deleting: they still count toward the hourly limit).
    db.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } }),
    // Housekeeping: nothing older than a day matters any more.
    db.passwordResetToken.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),
    db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + TOKEN_TTL_MS) },
    }),
  ]);

  const link = `${appBaseUrl()}/admin/reset-password?token=${encodeURIComponent(token)}`;
  try {
    await sendEmail({
      to: user.email,
      subject: `${SITE.name}: reset your password`,
      text: [
        `+++ ${SITE.name.toUpperCase()} · TRANSMISSION +++`,
        "",
        "A request was made to reset the password for your account.",
        `Open this link within the hour to choose a new one:`,
        "",
        link,
        "",
        "If you did not ask for this, ignore this message; your password stays as it is.",
      ].join("\n"),
      html: `
        <div style="font-family:Georgia,serif;background:#0a0705;color:#cfc0a0;padding:32px">
          <p style="font-family:monospace;letter-spacing:.3em;color:#9e1b14;font-size:12px">+++ ${SITE.name.toUpperCase()} · TRANSMISSION +++</p>
          <p>A request was made to reset the password for your account.</p>
          <p><a href="${link}" style="display:inline-block;background:#6e1210;color:#e8dcc0;padding:10px 18px;text-decoration:none;border:1px solid #8a4a22">Choose a new password</a></p>
          <p style="font-size:13px;color:#7d6c55">The link works once and expires within the hour. If you did not ask for this, ignore this message; your password stays as it is.</p>
        </div>`,
    });
  } catch (e) {
    // Report to the operator only; the requester sees the same message either way.
    console.error("[password-reset] could not send email", e);
  }
}

/** The account a reset token belongs to, if the token is still usable. */
export async function findValidToken(token: string, now = new Date()) {
  if (!token) return null;
  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, disabled: true } } },
  });
  if (!row || row.usedAt || row.expiresAt <= now || row.user.disabled) return null;
  return row;
}

/** Sets a new password from a reset link. Returns false if the link is invalid, used or expired. */
export async function resetPasswordWithToken(token: string, newPassword: string, now = new Date()): Promise<boolean> {
  const row = await findValidToken(token, now);
  if (!row) return false;
  const passwordHash = await bcrypt.hash(newPassword, 12);

  return db.$transaction(async (tx) => {
    // Claim the token atomically so two simultaneous submits can't both use it.
    const claimed = await tx.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } });
    if (claimed.count !== 1) return false;
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash, passwordChangedAt: now } });
    await tx.passwordResetToken.deleteMany({ where: { userId: row.userId, NOT: { id: row.id } } });
    return true;
  });
}
