import { readdir, readFile, rm } from "node:fs/promises";
import bcrypt from "bcryptjs";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { findValidToken, MAX_PER_HOUR, requestPasswordReset, resetPasswordWithToken } from "@/lib/password-reset";

const OUTBOX = "./.test-outbox-reset";

async function sentEmails() {
  const files = await readdir(OUTBOX).catch(() => [] as string[]);
  return Promise.all(files.sort().map(async (f) => JSON.parse(await readFile(`${OUTBOX}/${f}`, "utf8"))));
}

async function latestToken() {
  const emails = await sentEmails();
  const m = /token=([A-Za-z0-9_-]+)/.exec(emails.at(-1).text);
  return decodeURIComponent(m![1]);
}

describe("password reset", () => {
  beforeEach(async () => {
    await db.$executeRawUnsafe('TRUNCATE "PasswordResetToken", "User" RESTART IDENTITY CASCADE');
    await rm(OUTBOX, { recursive: true, force: true });
    vi.stubEnv("EMAIL_OUTBOX_DIR", OUTBOX);
    vi.stubEnv("APP_URL", "https://archivum.test");
    await db.user.create({ data: { email: "scribe@test.dev", passwordHash: await bcrypt.hash("old-password-1", 4) } });
  });
  afterEach(() => vi.unstubAllEnvs());
  afterAll(async () => {
    await rm(OUTBOX, { recursive: true, force: true });
    await db.$disconnect();
  });

  it("emails a link for a known address and nothing for an unknown one", async () => {
    await requestPasswordReset("nobody@test.dev");
    expect(await sentEmails()).toHaveLength(0);

    await requestPasswordReset("  Scribe@Test.dev ");
    const [mail] = await sentEmails();
    expect(mail.to).toBe("scribe@test.dev");
    expect(mail.text).toContain("https://archivum.test/admin/reset-password?token=");
  });

  it("stores only a hash of the token", async () => {
    await requestPasswordReset("scribe@test.dev");
    const token = await latestToken();
    const row = await db.passwordResetToken.findFirst();
    expect(row!.tokenHash).not.toBe(token);
    expect(row!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("resets the password once, then the link is spent", async () => {
    await requestPasswordReset("scribe@test.dev");
    const token = await latestToken();
    expect(await resetPasswordWithToken(token, "new-password-22")).toBe(true);
    const user = await db.user.findUnique({ where: { email: "scribe@test.dev" } });
    expect(await bcrypt.compare("new-password-22", user!.passwordHash)).toBe(true);
    expect(user!.passwordChangedAt).toBeInstanceOf(Date);
    expect(await resetPasswordWithToken(token, "third-password-3")).toBe(false);
  });

  it("rejects expired and unknown tokens", async () => {
    await requestPasswordReset("scribe@test.dev");
    const token = await latestToken();
    const later = new Date(Date.now() + 61 * 60 * 1000);
    expect(await findValidToken(token, later)).toBeNull();
    expect(await resetPasswordWithToken(token, "new-password-22", later)).toBe(false);
    expect(await resetPasswordWithToken("made-up-token", "new-password-22")).toBe(false);
  });

  it("a newer link voids the older one", async () => {
    await requestPasswordReset("scribe@test.dev");
    const first = await latestToken();
    await new Promise((r) => setTimeout(r, 5));
    await requestPasswordReset("scribe@test.dev");
    const second = await latestToken();
    expect(await findValidToken(first)).toBeNull();
    expect(await findValidToken(second)).not.toBeNull();
  });

  it(`sends at most ${MAX_PER_HOUR} emails per hour`, async () => {
    for (let i = 0; i < MAX_PER_HOUR + 2; i++) await requestPasswordReset("scribe@test.dev");
    expect(await sentEmails()).toHaveLength(MAX_PER_HOUR);
  });

  it("disabled accounts get no email and can't use an existing link", async () => {
    await requestPasswordReset("scribe@test.dev");
    const token = await latestToken();
    await db.user.update({ where: { email: "scribe@test.dev" }, data: { disabled: true } });
    expect(await resetPasswordWithToken(token, "new-password-22")).toBe(false);
    await requestPasswordReset("scribe@test.dev");
    expect(await sentEmails()).toHaveLength(1);
  });
});
