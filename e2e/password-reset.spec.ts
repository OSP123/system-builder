import { readdir, readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { E2E_RESET_USER } from "./global-setup";

const OUTBOX = "./.test-outbox";

async function latestEmailTo(to: string) {
  const files = (await readdir(OUTBOX).catch(() => [] as string[])).sort();
  for (const f of files.reverse()) {
    const mail = JSON.parse(await readFile(`${OUTBOX}/${f}`, "utf8"));
    if (mail.to === to) return mail as { to: string; subject: string; text: string };
  }
  return null;
}

test("forgot password: email link, single use, signs out other sessions", async ({ page, browser }) => {
  // Another device is already signed in as this user
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto("/admin/login");
  await otherPage.getByLabel("Email").fill(E2E_RESET_USER.email);
  await otherPage.getByLabel("Password").fill(E2E_RESET_USER.password);
  await otherPage.getByRole("button", { name: "Sign in" }).click();
  await otherPage.waitForURL(/\/admin$/);

  // Unknown and known emails get the same answer
  await page.goto("/admin/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByText("+++ Recover access +++")).toBeVisible();
  await page.getByLabel("Email").fill("nobody-here@test.dev");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("If an account exists for that address")).toBeVisible();

  await page.goto("/admin/forgot-password");
  await page.getByLabel("Email").fill(E2E_RESET_USER.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("If an account exists for that address")).toBeVisible();

  const mail = await latestEmailTo(E2E_RESET_USER.email);
  expect(mail?.subject).toContain("reset your password");
  const link = new URL(/https?:\/\/\S+/.exec(mail!.text)![0]);

  // Use the link
  await page.goto(link.pathname + link.search);
  await page.getByLabel("New password", { exact: true }).fill("forgetful-new-pw");
  await page.getByLabel("Confirm new password").fill("something-else");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByText("Passwords do not match")).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill("forgetful-new-pw");
  await page.getByLabel("Confirm new password").fill("forgetful-new-pw");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page).toHaveURL(/\/admin\/login\?reset=1/);
  await expect(page.getByText("Password changed. Sign in with your new password.")).toBeVisible();

  // Old password fails, new one works
  await page.getByLabel("Email").fill(E2E_RESET_USER.email);
  await page.getByLabel("Password").fill(E2E_RESET_USER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await page.getByLabel("Email").fill(E2E_RESET_USER.email);
  await page.getByLabel("Password").fill("forgetful-new-pw");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);

  // The link is spent
  await page.goto(link.pathname + link.search);
  await expect(page.getByText("+++ Link rejected +++")).toBeVisible();

  // The other device's older session no longer works
  await otherPage.goto("/admin");
  await expect(otherPage).toHaveURL(/\/admin\/login/);
  await other.close();
});
