import { test, expect } from '@playwright/test';


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
