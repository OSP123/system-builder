// Edge-safe session helpers (used by middleware), no Node-only imports here.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "cerulean_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  userId: string;
  role: "ADMIN" | "EDITOR";
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters long");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export type VerifiedSession = SessionPayload & { /** Seconds since epoch. */ issuedAt: number };

export async function verifySession(token: string | undefined): Promise<VerifiedSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string") return null;
    if (payload.role !== "ADMIN" && payload.role !== "EDITOR") return null;
    if (typeof payload.iat !== "number") return null;
    return { userId: payload.userId, role: payload.role, issuedAt: payload.iat };
  } catch {
    return null;
  }
}

/**
 * A session issued before the user's last password change is no longer valid.
 * JWT iat has one-second resolution, so a session issued in the same second as
 * the change (e.g. the one re-issued to the person who changed it) still counts.
 */
export function isSessionStale(issuedAt: number, passwordChangedAt: Date | null): boolean {
  if (!passwordChangedAt) return false;
  return issuedAt < Math.floor(passwordChangedAt.getTime() / 1000);
}
