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

function optionalNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Environment variable "${name}" must be a non-negative number, got "${raw}".`);
  }
  return value;
}

export const env = Object.freeze({
  baseUrl: requireEnv('BASE_URL'),
  /** Minimum gap between page loads, to stay within the site's rate limits. */
  navigationDelayMs: optionalNumberEnv('NAVIGATION_DELAY_MS', 0),
  isCI: Boolean(process.env.CI),
});
