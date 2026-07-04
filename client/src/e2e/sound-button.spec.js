import { test, expect } from '@playwright/test';

test('soundboard loads and displays buttons', async ({ page }) => {
  await page.goto('/');

  // Check that the title is visible
  await expect(page.locator('h1.title')).toHaveText('Soundboard');

  // Check that at least one sound button is present
  const buttons = page.locator('.sound-button');
  await expect(buttons.first()).toBeVisible();
});

test('search filters sounds', async ({ page }) => {
  await page.goto('/');

  // Type in search
  await page.fill('input[placeholder*="Search"]', 'bruh');

  // Check that filtered results are shown
  const buttons = page.locator('.sound-button');
  await expect(buttons).toHaveCount(1);
});

test('stop all button is present', async ({ page }) => {
  await page.goto('/');

  const stopButton = page.locator('.stop-button');
  await expect(stopButton).toBeVisible();
});

test('add sound button is present', async ({ page }) => {
  await page.goto('/');

  const uploadButton = page.locator('.upload-button');
  await expect(uploadButton).toBeVisible();
});

test('upload modal opens when add sound clicked', async ({ page }) => {
  await page.goto('/');

  await page.locator('.upload-button').click();
  await expect(page.locator('.upload-dialog')).toBeVisible();
  await expect(page.getByText('Add New Sound')).toBeVisible();
});
