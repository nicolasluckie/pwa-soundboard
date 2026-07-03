import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PW_SKIP_BUILD ? 'http://localhost:3000' : 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PW_SKIP_BUILD
    ? {
        command: 'node ../server/index.js',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        env: {
          HOST: '127.0.0.1',
          PORT: '3000',
          ORIGIN: 'http://localhost:3000',
        },
      }
    : {
        command: 'node ../server/index.js & npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        env: {
          HOST: '127.0.0.1',
          PORT: '3000',
          ORIGIN: 'http://localhost:5173',
        },
      },
});
