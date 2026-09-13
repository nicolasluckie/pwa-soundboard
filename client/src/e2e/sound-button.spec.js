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

  // Wait for sounds to load and capture the total count
  const buttons = page.locator('.sound-button');
  await expect(buttons.first()).toBeVisible();
  const total = await buttons.count();

  // Type a search query that should narrow the results
  await page.fill('input[placeholder*="Search"]', 'fuck');

  // Filtered results should be fewer than total but at least one
  const filtered = page.locator('.sound-button');
  await expect(filtered).toHaveCount(await filtered.count());
  const filteredCount = await filtered.count();
  expect(filteredCount).toBeGreaterThan(0);
  expect(filteredCount).toBeLessThan(total);
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
