import { test, expect } from '@playwright/test'

test.describe('Online Order', () => {
  test('storefront events page loads', async ({ page }) => {
    await page.goto('/events')
    // Events page should render without auth
    await expect(page.locator('h1')).toContainText('Upcoming Events')
  })

  test('cart page shows empty state', async ({ page }) => {
    await page.goto('/cart')
    await expect(page.locator('text=Your cart is empty')).toBeVisible()
  })
})
