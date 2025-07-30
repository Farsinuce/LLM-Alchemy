import { test, expect } from '@playwright/test';

test('Core gameplay: Mix Fire + Water to create Steam', async ({ page }) => {
  // Navigate to the game
  await page.goto('/game?mode=science');
  
  // Wait for the game to load
  await page.waitForSelector('[data-testid="element-list"]', { timeout: 10000 });
  
  // Verify we start with the basic elements including Fire and Water
  const fireElement = page.locator('[data-testid="element-Fire"]').first();
  const waterElement = page.locator('[data-testid="element-Water"]').first();
  
  await expect(fireElement).toBeVisible();
  await expect(waterElement).toBeVisible();
  
  // Wait for test helpers to be available
  await page.waitForFunction(() => window.testHelpers !== undefined, { timeout: 5000 });
  
  // Mix Fire + Water using test helpers
  const mixResult = await page.evaluate(() => {
    return window.testHelpers!.mixElements('Fire', 'Water');
  });
  
  expect(mixResult).toBe(true);
  
  // Wait for mixing animation to start (mixing spinner should appear)
  await expect(page.locator('[data-testid="mixing-spinner"]')).toBeVisible({ timeout: 5000 });
  
  // Wait for mixing to complete (spinner disappears)
  await expect(page.locator('[data-testid="mixing-spinner"]')).toBeHidden({ timeout: 30000 });
  
  // Verify Steam was created and appears in the element list
  const steamElement = page.locator('[data-testid="element-Steam"]');
  await expect(steamElement).toBeVisible({ timeout: 5000 });
  
  // Verify element count increased (should now have at least 6 elements)
  const elementCount = page.locator('text=/Elements: \\d+/');
  await expect(elementCount).toContainText(/Elements: [6-9]\d*|Elements: \d{2,}/);
});

test('Game loads correctly and displays basic elements', async ({ page }) => {
  // Navigate to the game
  await page.goto('/game?mode=science');
  
  // Wait for the game to load
  await page.waitForSelector('[data-testid="element-list"]', { timeout: 10000 });
  
  // Verify basic UI elements are present
  await expect(page.locator('text=LLM Alchemy')).toBeVisible();
  await expect(page.locator('text=Elements:')).toBeVisible();
  await expect(page.locator('[data-testid="mixing-area"]')).toBeVisible();
  
  // Verify we have the starter elements
  await expect(page.locator('[data-testid="element-Fire"]')).toBeVisible();
  await expect(page.locator('[data-testid="element-Water"]')).toBeVisible();
  await expect(page.locator('[data-testid="element-Earth"]')).toBeVisible();
  await expect(page.locator('[data-testid="element-Air"]')).toBeVisible();
});
