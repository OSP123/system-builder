import { describe, expect, it } from "vitest";
import { checkEnv, formatReport } from "@/lib/env-check";

const good = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:pw@dpg-abc123-a/cerulean",
  AUTH_SECRET: "x".repeat(44),
  ADMIN_EMAIL: "admin@example.com",
  ADMIN_PASSWORD: "long-enough-pw",
  RESEND_API_KEY: "re_abc",
  EMAIL_FROM: "Archivum <no-reply@example.com>",
  RENDER_EXTERNAL_URL: "https://system-builder.onrender.com",
  SUPABASE_URL: "https://abc.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_abc",
};

describe("checkEnv", () => {
  it("passes a complete production config", () => {
    expect(checkEnv(good, "22.11.0")).toEqual({ errors: [], warnings: [] });
  });

  it("fails on a missing AUTH_SECRET (the Render manual-service case)", () => {
    const { errors } = checkEnv({ ...good, AUTH_SECRET: undefined }, "22.0.0");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/AUTH_SECRET is missing.*openssl rand -base64 32/);
  });

  it("fails on a short AUTH_SECRET without revealing it", () => {
    const { errors } = checkEnv({ ...good, AUTH_SECRET: "hunter2-secret" }, "22.0.0");
    expect(errors[0]).toMatch(/too short \(14 characters/);
    expect(errors.join(" ")).not.toContain("hunter2");
  });

  it("catches database misconfiguration", () => {
    expect(checkEnv({ ...good, DATABASE_URL: "" }, "22.0.0").errors[0]).toMatch(/DATABASE_URL is missing/);
    expect(checkEnv({ ...good, DATABASE_URL: "mysql://x" }, "22.0.0").errors[0]).toMatch(/must start with postgresql/);
    expect(checkEnv({ ...good, DATABASE_URL: "postgresql://u:p@localhost:5433/db" }, "22.0.0").errors[0]).toMatch(/localhost/);
    // localhost is fine outside production
    expect(checkEnv({ ...good, NODE_ENV: "development", DATABASE_URL: "postgresql://u:p@localhost:5433/db" }, "22.0.0").errors).toEqual([]);
  });

  it("requires a valid ADMIN_EMAIL and a usable APP_URL", () => {
    expect(checkEnv({ ...good, ADMIN_EMAIL: "" }, "22.0.0").errors[0]).toMatch(/ADMIN_EMAIL is missing/);
    expect(checkEnv({ ...good, ADMIN_EMAIL: "not-an-email" }, "22.0.0").errors[0]).toMatch(/not a valid email/);
    expect(checkEnv({ ...good, APP_URL: "example.com" }, "22.0.0").errors[0]).toMatch(/APP_URL must be a full address/);
  });

  it("warns, without failing, on optional settings", () => {
    const { errors, warnings } = checkEnv(
      { ...good, ADMIN_PASSWORD: "", RESEND_API_KEY: "", EMAIL_FROM: "nonsense", RENDER_EXTERNAL_URL: "" },
      "22.0.0",
    );
    expect(errors).toEqual([]);
    expect(warnings.join("\n")).toMatch(/ADMIN_PASSWORD is not set/);
    expect(warnings.join("\n")).toMatch(/RESEND_API_KEY is not set/);
    expect(warnings.join("\n")).toMatch(/EMAIL_FROM should look like/);
    expect(warnings.join("\n")).toMatch(/APP_URL is not set/);
  });

  it("accepts a bare EMAIL_FROM address and flags odd Resend keys", () => {
    expect(checkEnv({ ...good, EMAIL_FROM: "no-reply@example.com" }, "22.0.0").warnings).toEqual([]);
    expect(checkEnv({ ...good, RESEND_API_KEY: "sk_live_123" }, "22.0.0").warnings[0]).toMatch(/doesn't look like a Resend key/);
  });

  it("rejects old Node versions", () => {
    expect(checkEnv(good, "18.19.0").errors[0]).toMatch(/Node 18.19.0 is too old/);
  });
});

describe("formatReport", () => {
  it("leads with a clear failure banner", () => {
    const text = formatReport({ errors: ["AUTH_SECRET is missing."], warnings: ["RESEND_API_KEY is not set."] });
    expect(text.split("\n")[0]).toMatch(/CONFIGURATION CHECK FAILED/);
    expect(text).toContain("✗ AUTH_SECRET is missing.");
    expect(text).toContain("! RESEND_API_KEY is not set.");
  });

  it("catches Supabase connection and key mix-ups", () => {
    const base = { ...good };
    const pooled = "postgresql://postgres.abc:pw@aws-0-us-west-1.pooler.supabase.com";
    expect(checkEnv({ ...base, DATABASE_URL: `${pooled}:6543/postgres` }).errors.join()).toMatch(/pgbouncer=true/);
    expect(checkEnv({ ...base, DATABASE_URL: `${pooled}:6543/postgres?pgbouncer=true` }).errors).toEqual([]);
    expect(checkEnv({ ...base, DATABASE_URL: `${pooled}:5432/postgres` }).errors).toEqual([]);
    expect(checkEnv({ ...base, DATABASE_URL: "postgresql://postgres:pw@db.abc.supabase.co:5432/postgres" }).warnings.join()).toMatch(/IPv6/);

    const report = checkEnv({ ...base, SUPABASE_URL: "https://abc.supabase.co", SUPABASE_SECRET_KEY: "sb_publishable_xyz" });
    expect(report.errors.join()).toMatch(/publishable key/);
    expect(report.errors.join()).not.toContain("sb_publishable_xyz");
    expect(checkEnv({ ...base, SUPABASE_URL: undefined, SUPABASE_SECRET_KEY: "sb_secret_xyz" }).errors.join()).toMatch(/SUPABASE_URL is not/);
    expect(checkEnv({ ...base, SUPABASE_SECRET_KEY: undefined }, "22.11.0").warnings.join()).toMatch(/wipes on every deploy/);
    expect(checkEnv({ ...base, SUPABASE_URL: "https://abc.supabase.co/", SUPABASE_SECRET_KEY: "sb_secret_xyz" }).errors).toEqual([]);
  });
});
