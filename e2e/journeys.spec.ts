import { expect, type Page, test } from "@playwright/test";

async function switchActor(page: Page, roleLabel: string) {
  await page.getByRole("button", { name: "Identitas actor" }).click();
  await page.getByRole("menuitem", { name: roleLabel, exact: true }).click();
  await expect(page.getByRole("button", { name: "Identitas actor" })).toContainText(roleLabel);
}

test("Journey 1 — supervisor resolves an assistance case", async ({ page }) => {
  await page.goto("/assistance");
  await page.getByText("VIN-005").first().click();
  await expect(page).toHaveURL(/\/assistance\/case-01/);

  await expect(page.getByText(/rekomendasi AI/i).first()).toBeVisible();
  await expect(page.locator('[role="radio"][aria-checked="true"]')).toHaveCount(0);

  await page.getByText("Bypass kiri").click();
  await page.getByRole("button", { name: "Submit Keputusan" }).click();
  await page.getByRole("button", { name: "Kirim keputusan" }).click();

  await expect(page.getByText("Hasil Keputusan")).toBeVisible();
  await expect(page.getByText("BYPASS_LEFT").first()).toBeVisible();
});

test("Journey 2 — supervisor confirms rework, worker marks repair done", async ({ page }) => {
  await page.goto("/quality/rework");
  await page.getByText("VIN-001").first().click();
  await expect(page).toHaveURL(/\/cars\/VIN-001\/report/);

  await page.getByRole("button", { name: "Konfirmasi Rework" }).click();
  await expect(page.getByText("IN_REPAIR").first()).toBeVisible();

  await switchActor(page, "Worker");
  await page.getByRole("button", { name: "Tandai Selesai" }).click();
  await expect(page.getByText("WAITING").first()).toBeVisible();
});

test("Journey 3 — engineer generates and reviews a scenario", async ({ page }) => {
  await page.goto("/lab?tab=requests");
  await switchActor(page, "Engineer");

  await page
    .getByLabel("Deskripsi situasi (bahasa alami)")
    .fill("Forklift melintas di jalur keluar gudang saat kendaraan sedang melintas.");
  await page.getByRole("button", { name: "Generate Scenario" }).click();

  await expect(page.getByText(/JOB-\d+/)).toBeVisible();
  await page.waitForURL(/\/lab\/scenarios\/S\d+/, { timeout: 25_000 });
  await expect(page.getByText("Spec (read-only)")).toBeVisible();
  await expect(page.getByText("Validator Notes")).toBeVisible();
});

test("Journey 4 — engineer evaluates releases and approval is gated", async ({ page }) => {
  await page.goto("/lab?tab=releases");
  await switchActor(page, "Engineer");

  await page.getByText("R1.1").first().click();
  await expect(page).toHaveURL(/\/lab\/releases\/R1\.1/);
  await page.getByRole("button", { name: "Evaluate Release" }).click();
  await expect(page.getByRole("button", { name: "Approve Release" })).toBeDisabled({
    timeout: 25_000,
  });

  await page.getByRole("link", { name: /Kembali ke daftar release/ }).click();
  await page.getByText("R1.2").first().click();
  await expect(page).toHaveURL(/\/lab\/releases\/R1\.2/);
  await page.getByRole("button", { name: "Evaluate Release" }).click();

  const approveButton = page.getByRole("button", { name: "Approve Release" });
  await expect(approveButton).toBeEnabled({ timeout: 25_000 });
  await approveButton.click();
  await page.getByRole("button", { name: "Approve release" }).click();
  await expect(page.getByText("Release telah disetujui.")).toBeVisible();
});
