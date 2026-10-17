import { expect, test } from '@playwright/test'

test('assistance card can be decided by the supervisor', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/cars in this batch/i).fill('3')
  await page.getByRole('button', { name: /run batch/i }).click()
  // Slow the simulation so the case stays open long enough to click.
  await page.getByRole('button', { name: '1×' }).click()

  await expect(page.getByRole('heading', { name: /assistance needed/i })).toBeVisible({
    timeout: 120_000,
  })
  await page.getByRole('button', { name: 'manual_override' }).click()
  await expect(page.getByText('Assist decided')).toBeVisible()
  await expect(page.getByTestId('batch-status')).toHaveText('done', { timeout: 240_000 })
})
