import { expect, test } from '@playwright/test'

test('3-car batch completes offline and produces a downloadable report', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/cars in this batch/i).fill('3')
  await page.getByRole('button', { name: /run batch/i }).click()

  await expect(page.getByTestId('batch-status')).toHaveText('done', { timeout: 240_000 })

  await expect(page.getByRole('heading', { name: /Report BAT-/ })).toBeVisible()
  await expect(page.getByText(/Gemini unavailable, generated from metrics/i)).toBeVisible()
  await expect(page.locator('.flow')).toHaveCount(7)

  const table = page.locator('table')
  await expect(table.getByText('wrong colour')).toBeVisible()
  await expect(table.getByText('dead lamp')).toBeVisible()
  await expect(table.getByText('FAIL').first()).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /download json/i }).click()
  const file = await download
  expect(file.suggestedFilename()).toContain('report.json')
})
