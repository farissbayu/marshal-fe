import { expect, test } from "@playwright/test";

test("Dashboard renders the supervisor screen", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Marshal", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gate and lanes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Waiting on you" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Decision feed" })).toBeVisible();
  await expect(page.getByText("Off the line")).toBeVisible();
});
