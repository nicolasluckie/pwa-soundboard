import { test, expect } from '@playwright/test';

test('refresh cache button is present', async ({ page }) => {
  await page.goto('/');

  const refreshButton = page.locator('.refresh-button');
  await expect(refreshButton).toBeVisible();
  await expect(refreshButton).toHaveAttribute('aria-label', 'Refresh app cache');
});

test('refresh dialog opens when button clicked', async ({ page }) => {
  await page.goto('/');

  await page.locator('.refresh-button').click();
  await expect(page.locator('.refresh-dialog')).toBeVisible();
  await expect(
    page.getByText('This will clear the cached app data and reload. Continue?')
  ).toBeVisible();
  await expect(page.getByText('Cancel')).toBeVisible();
  await expect(page.getByText('Refresh')).toBeVisible();
});

test('refresh dialog closes when cancel clicked', async ({ page }) => {
  await page.goto('/');

  await page.locator('.refresh-button').click();
  await expect(page.locator('.refresh-dialog')).toBeVisible();
  await page.getByText('Cancel').click();
  await expect(page.locator('.refresh-dialog')).toBeHidden();
});

test('refresh dialog closes when overlay clicked', async ({ page }) => {
  await page.goto('/');

  await page.locator('.refresh-button').click();
  await expect(page.locator('.refresh-dialog')).toBeVisible();
  await page.locator('.dialog-overlay').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('.refresh-dialog')).toBeHidden();
});
