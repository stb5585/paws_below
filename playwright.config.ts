import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 75_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'mobile-landscape', use: { ...devices['iPhone 13 landscape'], browserName: 'chromium' } },
    { name: 'portrait-guard', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'wide-19-5', use: { ...devices['Desktop Chrome'], viewport: { width: 1560, height: 720 } } },
    { name: 'wide-20-9', use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 720 } } },
    { name: 'tablet-4-3', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 960 } } }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 60_000
  }
});
