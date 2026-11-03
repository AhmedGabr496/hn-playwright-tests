import path from 'node:path';
import dotenv from 'dotenv';

// Locally, values come from the git-ignored `.env` file. In CI, they are injected
// from GitHub repository Variables/Secrets, and real env vars always take precedence.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        'Locally: copy .env.example to .env. In CI: define it as a GitHub repository variable or secret.',
    );
  }
  return value;
}

function optionalIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Environment variable "${name}" must be a whole number of 0 or more, got "${raw}".`);
  }
  return value;
}

export const env = Object.freeze({
  baseUrl: requireEnv('BASE_URL'),
  /** Time spent reading (scrolling down) each page before clicking through to the next one. */
  pagePauseMs: optionalIntegerEnv('PAGE_PAUSE_MS', 10_000),
  /** How many times a rate-limited page (HTTP 429/503) is reloaded before the test fails. */
  rateLimitRetries: optionalIntegerEnv('RATE_LIMIT_RETRIES', 3),
  /** Wait before each of those reloads. */
  rateLimitRetryDelayMs: optionalIntegerEnv('RATE_LIMIT_RETRY_DELAY_MS', 10_000),
  isCI: Boolean(process.env.CI),
});
