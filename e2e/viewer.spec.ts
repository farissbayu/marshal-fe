import { expect, test } from '@playwright/test'

test('viewer canvas renders and camera modes switch', async ({ page }) => {
  await page.goto('/')

  const canvas = page.locator('canvas.viewer__canvas')
  await expect(canvas).toBeVisible()

  await page.getByLabel(/cars in this batch/i).fill('2')
  await page.getByRole('button', { name: /run batch/i }).click()

  // Pause immediately while the batch is definitely running.
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
  await page.getByRole('button', { name: 'Play' }).click()

  await page.getByRole('button', { name: '1×' }).click()
  await page.waitForTimeout(2000)
  const shot = await canvas.screenshot()
  expect(shot.byteLength).toBeGreaterThan(1500)

  for (const mode of ['overview', 'follow', 'gate', 'track']) {
    await page.getByRole('radio', { name: mode }).check()
    await expect(page.getByRole('radio', { name: mode })).toBeChecked()
  }
})
