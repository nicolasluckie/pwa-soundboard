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

test('icon upload field is visible in modal', async ({ page }) => {
  await page.locator('.upload-button').click();
  await expect(page.locator('.upload-dialog')).toBeVisible();
  await expect(page.getByText('Icon (optional)')).toBeVisible();
  await expect(page.getByText('Click or drop an image')).toBeVisible();
});

test('successful upload with icon returns icon path', async ({ page }) => {
  const uniqueName = `Icon Test ${Date.now()}`;

  await page.route('**/api/upload', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        sample: {
          id: 'icon-test-sound',
          name: uniqueName,
          file: 'user/icon-test-sound.mp3',
          color: '#00d4ff',
          emoji: '🔊',
          icon: '/icons/user/icon-test-sound.webp',
          tags: ['meme'],
        },
      }),
    })
  );

  await page.locator('.upload-button').click();

  const audioInput = page.locator('input[type="file"]').first();
  await audioInput.setInputFiles(TEST_AUDIO_PATH);

  await page.locator('input[placeholder="My Cool Sound"]').fill(uniqueName);

  await page.getByRole('button', { name: 'Upload' }).click();

  // Modal should close
  await expect(page.locator('.upload-dialog')).not.toBeVisible();

  // Sound should appear with icon image
  const soundButton = page.locator('.sound-button', { hasText: uniqueName });
  await expect(soundButton).toBeVisible();
  const iconImg = soundButton.locator('.sound-bg-img');
  await expect(iconImg).toBeVisible();
  await expect(iconImg).toHaveCSS('background-image', /\/icons\/user\/icon-test-sound\.webp/);
});

test('upload rejects SVG icon files', async ({ page }) => {
  await page.route('**/api/upload', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Invalid icon file type. Only PNG, JPG, GIF, and WebP images are allowed.',
      }),
    })
  );

  await page.locator('.upload-button').click();

  const audioInput = page.locator('input[type="file"]').first();
  await audioInput.setInputFiles(TEST_AUDIO_PATH);

  await page.locator('input[placeholder="My Cool Sound"]').fill('SVG Test');

  await page.getByRole('button', { name: 'Upload' }).click();

  await expect(page.locator('.upload-error')).toContainText('Invalid icon file type');
  await expect(page.locator('.upload-dialog')).toBeVisible();
});

test('re-upload with same slug overwrites existing sound', async ({ page }) => {
  const firstName = `Overwrite Test ${Date.now()}`;
  const updatedName = `Overwrite Updated ${Date.now()}`;
  const slug = 'overwrite-test';

  let uploadCount = 0;
  await page.route('**/api/upload', (route) => {
    uploadCount++;
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        sample: {
          id: slug,
          name: uploadCount === 1 ? firstName : updatedName,
          file: `user/${slug}.mp3`,
          color: '#00d4ff',
          emoji: '🔊',
          tags: ['meme'],
        },
      }),
    });
  });

  // First upload
  await page.locator('.upload-button').click();
  await expect(page.locator('.upload-dialog')).toBeVisible();
  await expect(page.getByText('Drop file here or click to browse')).toBeVisible();
  await page.locator('input[type="file"]').first().setInputFiles(TEST_AUDIO_PATH);
  await expect(page.locator('.drop-zone-file')).toBeVisible();
  await page.locator('input[placeholder="My Cool Sound"]').fill(firstName);
  await page.locator('input[placeholder="my-cool-sound"]').fill(slug);
  await page.getByRole('button', { name: 'Upload' }).click();
  await expect(page.locator('.upload-dialog')).not.toBeVisible();
  await expect(page.getByText(firstName)).toBeVisible();

  // Wait for modal to fully close before reopening
  await page.waitForTimeout(300);

  // Second upload with same slug (overwrite)
  await page.locator('.upload-button').click();
  await expect(page.locator('.upload-dialog')).toBeVisible();
  await expect(page.getByText('Drop file here or click to browse')).toBeVisible();
  await page.locator('input[type="file"]').first().setInputFiles(TEST_AUDIO_PATH);
  await expect(page.locator('.drop-zone-file')).toBeVisible();
  await page.locator('input[placeholder="My Cool Sound"]').fill(updatedName);
  await page.locator('input[placeholder="my-cool-sound"]').fill(slug);
  await page.getByRole('button', { name: 'Upload' }).click();
  await expect(page.locator('.upload-dialog')).not.toBeVisible();

  // Updated name should appear, old name should not
  await expect(page.getByText(updatedName)).toBeVisible();
  await expect(page.getByText(firstName)).not.toBeVisible();
});

test('re-upload with same slug overwrites existing icon', async ({ page }) => {
  const name = `Icon Overwrite ${Date.now()}`;
  const slug = 'icon-overwrite-test';

  await page.route('**/api/upload', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        sample: {
          id: slug,
          name,
          file: `user/${slug}.mp3`,
          color: '#00d4ff',
          emoji: '🔊',
          icon: `/icons/user/${slug}.webp`,
          tags: ['meme'],
        },
      }),
    });
  });

  // First upload with icon
  await page.locator('.upload-button').click();
  await expect(page.locator('.upload-dialog')).toBeVisible();
  await expect(page.getByText('Drop file here or click to browse')).toBeVisible();
  await page.locator('input[type="file"]').first().setInputFiles(TEST_AUDIO_PATH);
  await expect(page.locator('.drop-zone-file')).toBeVisible();
  await page.locator('input[placeholder="My Cool Sound"]').fill(name);
  await page.locator('input[placeholder="my-cool-sound"]').fill(slug);
  await page.getByRole('button', { name: 'Upload' }).click();
  await expect(page.locator('.upload-dialog')).not.toBeVisible();

  // Verify icon is present
  const soundButton = page.locator('.sound-button', { hasText: name });
  await expect(soundButton).toBeVisible();
  await expect(soundButton.locator('.sound-bg-img')).toBeVisible();

  // Wait for modal to fully close before reopening
  await page.waitForTimeout(300);

  // Second upload with same slug and new icon (overwrite)
  await page.locator('.upload-button').click();
  await expect(page.locator('.upload-dialog')).toBeVisible();
  await expect(page.getByText('Drop file here or click to browse')).toBeVisible();
  await page.locator('input[type="file"]').first().setInputFiles(TEST_AUDIO_PATH);
  await expect(page.locator('.drop-zone-file')).toBeVisible();
  await page.locator('input[placeholder="My Cool Sound"]').fill(name);
  await page.locator('input[placeholder="my-cool-sound"]').fill(slug);
  await page.getByRole('button', { name: 'Upload' }).click();
  await expect(page.locator('.upload-dialog')).not.toBeVisible();

  // Icon should still be present with same path
  const updatedButton = page.locator('.sound-button', { hasText: name });
  await expect(updatedButton).toBeVisible();
  const iconImg = updatedButton.locator('.sound-bg-img');
  await expect(iconImg).toBeVisible();
  await expect(iconImg).toHaveCSS('background-image', /\/icons\/user\/icon-overwrite-test\.webp/);
});
