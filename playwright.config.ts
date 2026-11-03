import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

// Settings come from your own .env if it exists, otherwise from the committed .env.example (as on CI).
// A real environment variable overrides both.
dotenv.config({ path: [path.resolve(__dirname, '.env'), path.resolve(__dirname, '.env.example')], quiet: true });
for (const name of ['BASE_URL', 'PAGE_PAUSE_MS', 'RATE_LIMIT_RETRIES', 'RATE_LIMIT_RETRY_DELAY_MS']) {
  if (!process.env[name]) throw new Error(`Missing setting "${name}": add it to .env.example (or your .env)`);
}
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  // Leaves room for paced page loads and rate-limit retries (see BasePage).
  timeout: 180_000,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // One worker: every test shares the same IP, and parallel page loads would trip Hacker News' rate limit.
  workers: 1,
  reporter: isCI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL,
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
