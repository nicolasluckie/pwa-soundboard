import { test, expect } from '@playwright/test';

const TEST_AUDIO_PATH = '../data/audio/demos/bruh-sound-effect.mp3';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('upload modal opens with form fields', async ({ page }) => {
  await page.locator('.upload-button').click();

  await expect(page.locator('.upload-dialog')).toBeVisible();
  await expect(page.getByText('Add New Sound')).toBeVisible();
  await expect(page.locator('input[placeholder="My Cool Sound"]')).toBeVisible();
  await expect(page.locator('input[placeholder="my-cool-sound"]')).toBeVisible();
  await expect(page.locator('.color-swatch')).toHaveCount(6);
});

test('upload modal closes on cancel', async ({ page }) => {
  await page.locator('.upload-button').click();
  await expect(page.locator('.upload-dialog')).toBeVisible();

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('.upload-dialog')).not.toBeVisible();
});

test('upload modal closes on X button', async ({ page }) => {
  await page.locator('.upload-button').click();
  await expect(page.locator('.upload-dialog')).toBeVisible();

  await page.locator('.dialog-close').click();
  await expect(page.locator('.upload-dialog')).not.toBeVisible();
});

test('upload button is disabled without file', async ({ page }) => {
  await page.locator('.upload-button').click();

  const submitButton = page.getByRole('button', { name: 'Upload' });
  await expect(submitButton).toBeDisabled();
});

test('name auto-fills from filename', async ({ page }) => {
  await page.locator('.upload-button').click();

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(TEST_AUDIO_PATH);

  await expect(page.locator('input[placeholder="My Cool Sound"]')).toHaveValue('bruh-sound-effect');
});

test('slug auto-generates from name', async ({ page }) => {
  await page.locator('.upload-button').click();

  await page.fill('input[placeholder="My Cool Sound"]', 'My Cool Sound!');

  await expect(page.locator('input[placeholder="my-cool-sound"]')).toHaveValue('my-cool-sound');
});

test('upload button stays disabled without file', async ({ page }) => {
  await page.locator('.upload-button').click();

  await page.fill('input[placeholder="My Cool Sound"]', 'Test Sound');

  const submitButton = page.getByRole('button', { name: 'Upload' });
  await expect(submitButton).toBeDisabled();
});

test('upload button is enabled with file and name', async ({ page }) => {
  await page.locator('.upload-button').click();

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(TEST_AUDIO_PATH);

  // Name auto-fills from filename, so button should be enabled
  const submitButton = page.getByRole('button', { name: 'Upload' });
  await expect(submitButton).toBeEnabled();
});

test('successful upload adds sound to grid', async ({ page }) => {
  const uniqueName = `E2E Test ${Date.now()}`;

  await page.route('**/api/upload', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        sample: {
          id: 'e2e-test-sound',
          name: uniqueName,
          file: 'user/e2e-test-sound.mp3',
          color: '#00d4ff',
          emoji: '🔊',
          tags: ['meme'],
        },
      }),
    })
  );

  await page.locator('.upload-button').click();

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(TEST_AUDIO_PATH);

  await page.locator('input[placeholder="My Cool Sound"]').fill(uniqueName);

  await page.getByRole('button', { name: 'Upload' }).click();

  // Modal should close
  await expect(page.locator('.upload-dialog')).not.toBeVisible();

  // New sound should appear in the grid
  await expect(page.getByText(uniqueName)).toBeVisible();
});

test('upload error shows error message', async ({ page }) => {
  // Intercept the upload API and return an error
  await page.route('**/api/upload', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'ffmpeg conversion failed' }),
    })
  );

  await page.locator('.upload-button').click();

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(TEST_AUDIO_PATH);

  await page.locator('input[placeholder="My Cool Sound"]').fill('Error Test');

  await page.getByRole('button', { name: 'Upload' }).click();

  await expect(page.locator('.upload-error')).toHaveText('ffmpeg conversion failed');
  await expect(page.locator('.upload-dialog')).toBeVisible();
});
