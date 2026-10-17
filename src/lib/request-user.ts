import { getSession } from "./auth";
import { db } from "./db";
import { isSessionStale } from "./session";

/**
 * The signed-in user for an API route, re-read from the database: the cookie's
 * role may be stale, and the account may be disabled. Null if not allowed in.
 */
export async function currentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, disabled: true, passwordChangedAt: true } });
  if (!user || user.disabled || isSessionStale(session.issuedAt, user.passwordChangedAt)) return null;
  return user;
}
