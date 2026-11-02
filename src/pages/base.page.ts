import type { Locator, Page } from '@playwright/test';
import { env } from '@config/env';

/** Common behaviour for every page object. */
export abstract class BasePage {
  /** Path relative to BASE_URL, e.g. `/newest`. */
  protected abstract readonly path: string;

  /**
   * Hacker News throttles clients per IP with an HTTP 503 "not able to serve your requests this quickly" page.
   * Page loads are spaced by NAVIGATION_DELAY_MS, and if we are still throttled we back off (10s, 20s, 40s)
   * instead of failing or hammering the site.
   */
  protected readonly rateLimitRetries = 3;
  protected readonly rateLimitBackoffMs = 10_000;

  private readonly rateLimitNotice: Locator;
  private lastNavigationAt = 0;

  constructor(protected readonly page: Page) {
    this.rateLimitNotice = page.getByText('not able to serve your requests this quickly');
  }

  async open(): Promise<void> {
    await this.navigateTo(this.path);
  }

  /** Navigates to `url` (absolute or relative to BASE_URL), backing off and retrying while rate limited. */
  protected async navigateTo(url: string): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      await this.respectNavigationDelay();
      const response = await this.page.goto(url);
      if (response?.ok()) return;

      const rateLimited = await this.rateLimitNotice.isVisible();
      if (!rateLimited || attempt === this.rateLimitRetries) {
        const reason = rateLimited ? `rate limited after ${attempt} retries` : 'unexpected response';
        throw new Error(`Failed to load ${url}: HTTP ${response?.status() ?? 'no response'} (${reason})`);
      }
      const backoffMs = this.rateLimitBackoffMs * 2 ** attempt;
      console.warn(`Rate limited loading ${url} (HTTP ${response?.status()}); retrying in ${backoffMs / 1000}s`);
      await this.page.waitForTimeout(backoffMs);
    }
  }

  private async respectNavigationDelay(): Promise<void> {
    const waitMs = this.lastNavigationAt + env.navigationDelayMs - Date.now();
    if (waitMs > 0) {
      await this.page.waitForTimeout(waitMs);
    }
    this.lastNavigationAt = Date.now();
  }
}
