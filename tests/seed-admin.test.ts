import bcrypt from "bcryptjs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ensureAdmin } from "@/lib/seed-admin";
import { resetDb } from "./helpers";

const env = { ADMIN_EMAIL: "Boss@Test.dev", ADMIN_PASSWORD: "first-password" };
const hashOf = async () => (await db.user.findUnique({ where: { email: "boss@test.dev" } }))!.passwordHash;

describe("ensureAdmin", () => {
  beforeEach(resetDb);
  afterAll(() => db.$disconnect());

  it("creates the admin on first run", async () => {
    const r = await ensureAdmin(db, env);
    expect(r.action).toBe("created");
    expect(r.admin).toMatchObject({ email: "boss@test.dev", role: "ADMIN" });
    expect(await bcrypt.compare("first-password", await hashOf())).toBe(true);
  });

  it("does not overwrite a password changed in the app on later runs", async () => {
    await ensureAdmin(db, env);
    await db.user.update({ where: { email: "boss@test.dev" }, data: { passwordHash: await bcrypt.hash("changed-in-app", 4) } });
    const r = await ensureAdmin(db, { ...env, ADMIN_PASSWORD: "different-env-value" });
    expect(r.action).toBe("unchanged");
    expect(await bcrypt.compare("changed-in-app", await hashOf())).toBe(true);
  });

  it("resets the password only when ADMIN_RESET_PASSWORD=true, and signs out old sessions", async () => {
    await ensureAdmin(db, env);
    const r = await ensureAdmin(db, { ...env, ADMIN_PASSWORD: "recovered-password", ADMIN_RESET_PASSWORD: "true" });
    expect(r.action).toBe("password-reset");
    expect(await bcrypt.compare("recovered-password", await hashOf())).toBe(true);
    expect(r.admin.passwordChangedAt).toBeInstanceOf(Date);
  });

  it("restores admin role and re-enables the account", async () => {
    await ensureAdmin(db, env);
    await db.user.update({ where: { email: "boss@test.dev" }, data: { role: "EDITOR", disabled: true } });
    const r = await ensureAdmin(db, env);
    expect(r.admin).toMatchObject({ role: "ADMIN", disabled: false });
  });

  it("needs a password only when creating or resetting", async () => {
    await expect(ensureAdmin(db, { ADMIN_EMAIL: "boss@test.dev" })).rejects.toThrow(/ADMIN_PASSWORD/);
    await ensureAdmin(db, env);
    await expect(ensureAdmin(db, { ADMIN_EMAIL: "boss@test.dev" })).resolves.toMatchObject({ action: "unchanged" });
    await expect(ensureAdmin(db, { ...env, ADMIN_PASSWORD: "short" , ADMIN_RESET_PASSWORD: "true" })).rejects.toThrow(/10 characters/);
  });
});
