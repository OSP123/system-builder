import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  isSessionStale,
  signSession,
  verifySession,
  type SessionPayload,
  type VerifiedSession,
} from "./session";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummyHash: string | undefined;

/** Returns the user if credentials are valid, otherwise null. */
export async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    // Compare against a dummy hash so response time doesn't reveal whether the email exists.
    dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
    await bcrypt.compare(password, dummyHash);
    return null;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  // Same message as a wrong password, so disabled accounts aren't revealed.
  return user.disabled ? null : user;
}

export async function createSession(payload: SessionPayload) {
  const token = await signSession(payload);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<VerifiedSession | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/**
 * Guard for admin pages and server actions. Middleware already blocks
 * unauthenticated requests, but server actions must re-check on their own.
 */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  const user = await db.user.findUnique({ where: { id: session.userId } });
  // A deleted or disabled account, or a session from before a password change,
  // loses access on its next request, cookie or not.
  if (!user || user.disabled || isSessionStale(session.issuedAt, user.passwordChangedAt)) redirect("/admin/login");
  return user;
}

/** Guard for admin-only pages and actions (user management). */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/admin");
  return user;
}
