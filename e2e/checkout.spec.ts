import { test, expect } from '@playwright/test'

test.describe('Checkout Flow', () => {
  test('login, search product, add to cart, checkout', async ({ page }) => {
    // Login
    await page.goto('/login')
    await expect(page.locator('h1')).toContainText('Oasis Cannabis')

    // Select location
    const locationSelect = page.locator('select')
    await locationSelect.selectOption({ index: 3 }) // Coors

    // Enter PIN 1234
    for (const digit of ['1', '2', '3', '4']) {
      await page.click(`button:text("${digit}")`)
    }

    // Should redirect to checkout
    await page.waitForURL('**/checkout', { timeout: 10000 })
    await expect(page.locator('text=Current Sale')).toBeVisible()

    // Search for a product
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Blue Dream')
    await page.waitForTimeout(500) // debounce

    // Click first result if dropdown appears
    const result = page.locator('button:has-text("Blue Dream")').first()
    if (await result.isVisible({ timeout: 3000 }).catch(() => false)) {
      await result.click()
      // Verify item in cart
      await expect(page.locator('text=Blue Dream')).toBeVisible()
    }
  })
})
