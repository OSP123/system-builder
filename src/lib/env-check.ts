/**
 * Validates the environment before the server boots, so a misconfigured deploy
 * fails at startup with a readable message instead of crashing on first use.
 * Never includes secret values in messages, only what is wrong and how to fix it.
 */

type Env = Record<string, string | undefined>;
export type EnvReport = { errors: string[]; warnings: string[] };

const WHERE = "Set it in your host's environment settings (on Render: the service → Environment).";
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function checkEnv(env: Env, nodeVersion: string = process.versions.node): EnvReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const production = env.NODE_ENV === "production";
  const val = (k: string) => env[k]?.trim() || "";

  // Database
  const db = val("DATABASE_URL");
  if (!db) {
    errors.push(`DATABASE_URL is missing. Use your Postgres connection string (on Supabase: Connect → Session pooler). ${WHERE}`);
  } else if (!/^postgres(ql)?:\/\//.test(db)) {
    errors.push("DATABASE_URL must start with postgresql:// or postgres://.");
  } else if (production && /@(localhost|127\.0\.0\.1)[:/]/.test(db)) {
    errors.push("DATABASE_URL points at localhost, which only exists on your own machine. Use the hosted database's URL.");
  }
  if (/@db\.[a-z0-9]+\.supabase\.co[:/]/.test(db)) {
    warnings.push("DATABASE_URL uses Supabase's direct connection, which is IPv6-only and unreachable from Render. Use the Session pooler string (Connect → Session pooler).");
  } else if (/pooler\.supabase\.com:6543\//.test(db) && !/[?&]pgbouncer=true/.test(db)) {
    errors.push("DATABASE_URL uses Supabase's transaction pooler (port 6543) without ?pgbouncer=true, which breaks Prisma. Use the Session pooler (port 5432) instead.");
  }

  // Sessions
  const secret = val("AUTH_SECRET");
  if (!secret) {
    errors.push(`AUTH_SECRET is missing. Generate one with \`openssl rand -base64 32\`. ${WHERE}`);
  } else if (secret.length < 32) {
    errors.push(`AUTH_SECRET is too short (${secret.length} characters; needs at least 32). Generate one with \`openssl rand -base64 32\`.`);
  }

  // Admin account
  const adminEmail = val("ADMIN_EMAIL");
  if (!adminEmail) errors.push(`ADMIN_EMAIL is missing (the admin account's login email). ${WHERE}`);
  else if (!EMAIL.test(adminEmail)) errors.push("ADMIN_EMAIL is not a valid email address.");
  const adminPassword = env.ADMIN_PASSWORD ?? "";
  if (!adminPassword) {
    warnings.push("ADMIN_PASSWORD is not set. That's fine once the admin account exists; it's only needed to create it.");
  } else if (adminPassword.length < 10) {
    warnings.push(`ADMIN_PASSWORD is ${adminPassword.length} characters; it must be at least 10 to create or reset the admin account.`);
  }

  // Links in emails
  const appUrl = val("APP_URL");
  if (appUrl && !/^https?:\/\/[^\s/]+/.test(appUrl)) {
    errors.push("APP_URL must be a full address like https://example.com.");
  } else if (production && !appUrl && !val("RENDER_EXTERNAL_URL")) {
    warnings.push("APP_URL is not set, so password-reset emails can't build links. Set it to the site's public address.");
  }

  // Email delivery
  const resend = val("RESEND_API_KEY");
  if (!resend) {
    warnings.push("RESEND_API_KEY is not set: password-reset emails will be written to the server log instead of sent.");
  } else if (!resend.startsWith("re_")) {
    warnings.push("RESEND_API_KEY doesn't look like a Resend key (they start with re_).");
  }
  const from = val("EMAIL_FROM");
  if (from) {
    const address = /<([^>]+)>\s*$/.exec(from)?.[1] ?? from;
    if (!EMAIL.test(address)) warnings.push('EMAIL_FROM should look like "Archivum <no-reply@yourdomain.com>".');
  }

  // Image uploads (Supabase Storage; otherwise local disk)
  const storageKey = val("SUPABASE_SECRET_KEY");
  const storageUrl = val("SUPABASE_URL");
  if (storageKey.startsWith("sb_publishable_")) {
    errors.push("SUPABASE_SECRET_KEY holds the publishable key. Use the secret key (Supabase: Project Settings → API Keys → Secret keys, starts with sb_secret_).");
  } else if (storageKey && !storageUrl) {
    errors.push("SUPABASE_SECRET_KEY is set but SUPABASE_URL is not (https://<project>.supabase.co).");
  } else if (storageUrl && !/^https:\/\/[^\s/]+$/.test(storageUrl.replace(/\/+$/, ""))) {
    errors.push("SUPABASE_URL must look like https://<project>.supabase.co.");
  } else if (production && !storageKey) {
    warnings.push("SUPABASE_SECRET_KEY is not set: uploaded images are stored on local disk, which Render wipes on every deploy.");
  }

  // Runtime
  const major = Number(nodeVersion.split(".")[0]);
  if (!(major >= 20)) {
    errors.push(`Node ${nodeVersion} is too old; use Node 20 or newer (on Render: set NODE_VERSION=22).`);
  }

  return { errors, warnings };
}

export function formatReport({ errors, warnings }: EnvReport): string {
  const lines: string[] = [];
  if (errors.length) {
    lines.push("+++ CONFIGURATION CHECK FAILED: the server will not start +++");
    for (const e of errors) lines.push(`  ✗ ${e}`);
  } else {
    lines.push("+++ Configuration check passed +++");
  }
  for (const w of warnings) lines.push(`  ! ${w}`);
  return lines.join("\n");
}
