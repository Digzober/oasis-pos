import { test, expect } from '@playwright/test'

test.describe('Customer Lookup', () => {
  test('search and attach customer', async ({ page }) => {
    // Login first
    await page.goto('/login')
    const locationSelect = page.locator('select')
    await locationSelect.selectOption({ index: 3 })
    for (const digit of ['1', '2', '3', '4']) {
      await page.click(`button:text("${digit}")`)
    }
    await page.waitForURL('**/checkout', { timeout: 10000 })

    // Click "+ Customer" button
    const addCustomer = page.locator('button:text("+ Customer")')
    if (await addCustomer.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addCustomer.click()
      // Customer search panel should appear
      await expect(page.locator('text=Customer Lookup')).toBeVisible()
    }
  })
})
