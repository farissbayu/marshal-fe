import { expect, test } from "@playwright/test";

test("Decision feed shows live events", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Decision feed" })).toBeVisible();
  // Mock mode (default in dev) emits a simulator event every ~1.8 s.
  await expect(page.getByTestId("feed-row").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Waiting for the decision stream…")).toBeHidden();
});

test("the exception buttons decide the assistance card", async ({ page }) => {
  await page.goto("/");

  // Mock mode opens with a stuck car waiting.
  const wait = page.getByRole("button", { name: /wait for removal/i });
  await expect(wait).toBeVisible();
  await wait.click();
  await expect(page.getByText(/No exception/)).toBeVisible();

  // Next exception raises a fresh one, and the card comes back with its options.
  await page.getByRole("button", { name: "Next exception" }).click();
  await expect(page.getByRole("button", { name: /wait for removal/i })).toBeVisible();
});
