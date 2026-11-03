import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  // Leaves room for paced page loads and rate-limit retries (see BasePage).
  timeout: 180_000,
  forbidOnly: env.isCI,
  retries: env.isCI ? 1 : 0,
  // One worker: every test shares the same IP, and parallel page loads would trip Hacker News' rate limit.
  workers: 1,
  reporter: env.isCI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: env.baseUrl,
    // Fail a stuck step within seconds, with a message saying what it waited for, instead of at the test timeout.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
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
