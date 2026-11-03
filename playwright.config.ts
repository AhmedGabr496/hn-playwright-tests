import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  // Leaves room for waiting out Hacker News rate limits (see BasePage.navigateTo).
  timeout: 180_000,
  fullyParallel: true,
  forbidOnly: env.isCI,
  retries: env.isCI ? 1 : 0,
  workers: env.isCI ? 1 : undefined,
  reporter: env.isCI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: env.baseUrl,
    trace: 'on-first-retry',
    // Attach a full-page screenshot and a video of every test to the HTML report, locally and on CI.
    screenshot: { mode: 'on', fullPage: true },
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      // Full Chromium in new headless mode: its requests carry the same headers as a person's browser, whereas
      // the default headless shell announces itself as "HeadlessChrome" and sends no Accept-Language.
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
});
