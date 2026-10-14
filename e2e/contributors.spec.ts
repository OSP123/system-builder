import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

const CONTRIB = { email: "scribe@test.dev", name: "Scribe Varro", password: "scribe-password-1" };

async function login(page: Page, email: string, password: string, { expectSuccess = true } = {}) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Wait for the sign-in to finish before navigating, or the request is cancelled.
  if (expectSuccess) await page.waitForURL(/\/admin$/);
}

async function logout(page: Page) {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
}

test("contributors add their own records and can't touch anyone else's", async ({ page }) => {
  // Admin: a published world with a character, and a new contributor account
  await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await expect(page.getByRole("heading", { name: "All worlds" })).toBeVisible();
  await page.getByRole("link", { name: "+ New world" }).click();
  await expect(page.getByRole("heading", { name: "New world" })).toBeVisible();
  await page.getByLabel("Name").fill("Shared World");
  await page.getByLabel("Published (visible to the public)").check();
  await page.getByRole("button", { name: "Create world" }).click();
  await expect(page.getByRole("heading", { name: "Shared World" })).toBeVisible();
  await page.getByRole("link", { name: "Characters", exact: true }).click();
  await page.getByRole("link", { name: "+ New character" }).click();
  await expect(page.getByRole("heading", { name: "New character" })).toBeVisible();
  await page.getByLabel("Name").fill("Lord Admin");
  await page.getByRole("button", { name: "Create character" }).click();
  await expect(page.getByRole("status")).toContainText("Record inducted");

  await page.getByRole("link", { name: "Users" }).click();
  await page.getByRole("link", { name: "+ New user" }).click();
  await page.getByLabel("Email").fill(CONTRIB.email);
  await page.getByLabel("Display name").fill(CONTRIB.name);
  await page.getByLabel("Temporary password").fill("short");
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByText("Use at least 10 characters")).toBeVisible();
  await page.getByLabel("Temporary password").fill(CONTRIB.password);
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByRole("status")).toContainText("Record inducted");
  await expect(page.getByRole("heading", { name: CONTRIB.name })).toBeVisible();

  // The admin can't demote or delete themselves
  await page.goto("/admin/users");
  await page.getByRole("table").getByRole("link", { name: E2E_ADMIN.email }).click();
  await expect(page.getByText("You can't disable or demote yourself.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete user" })).toHaveCount(0);
  await logout(page);

  // Contributor
  await login(page, CONTRIB.email, CONTRIB.password);
  await expect(page.getByRole("heading", { name: "Open to contributors" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin$/); // admin-only page bounces

  await page.getByRole("link", { name: /Shared World/ }).click();
  await expect(page.getByText("Contributor access")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save world" })).toHaveCount(0);

  // Add their own character
  await page.getByRole("link", { name: "Characters", exact: true }).click();
  await page.getByRole("link", { name: "+ New character" }).click();
  await expect(page.getByRole("heading", { name: "New character" })).toBeVisible();
  await page.getByLabel("Name").fill("Scribe's Hero");
  await page.getByRole("button", { name: "Create character" }).click();
  await expect(page.getByRole("status")).toContainText("Record inducted");
  await page.getByLabel("Rank or title").fill("Sergeant");
  await page.getByRole("button", { name: "Save character" }).click();
  await expect(page.getByRole("status")).toContainText("Record sanctified");

  // The list shows who wrote what; the admin's record is sealed
  await page.getByRole("link", { name: "← Characters" }).click();
  const mine = page.getByRole("row", { name: /Scribe's Hero/ });
  await expect(mine.getByText("You", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Lord Admin" }).click();
  await expect(page.getByText("+++ Sealed record +++")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save character" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete character" })).toHaveCount(0);

  // Change own password
  await page.getByRole("link", { name: CONTRIB.name }).click();
  await page.getByLabel("Current password").fill(CONTRIB.password);
  await page.getByLabel("New password", { exact: true }).fill("scribe-password-2");
  await page.getByLabel("Confirm new password").fill("scribe-password-2");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByRole("status")).toContainText("Record sanctified");
  await logout(page);

  // Admin disables the contributor; they can no longer sign in
  await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.goto("/admin/users");
  await page.getByRole("link", { name: CONTRIB.name }).click();
  await page.getByLabel(/Disabled/).check();
  await page.getByRole("button", { name: "Save user" }).click();
  await expect(page.getByRole("status")).toContainText("Record sanctified");
  await logout(page);

  await login(page, CONTRIB.email, "scribe-password-2", { expectSuccess: false });
  await expect(page.getByText("Invalid email or password")).toBeVisible();
});
