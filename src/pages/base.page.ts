import type { Locator, Page } from '@playwright/test';

/** Common behaviour for every page object. */
export abstract class BasePage {
  /** Path relative to BASE_URL, e.g. `/newest`. */
  protected abstract readonly path: string;

  /**
   * Hacker News throttles clients per IP, answering with HTTP 429 or with an HTTP 503 "not able to serve your
   * requests this quickly" page. Page loads are not delayed up front; only when we are throttled do we wait 10s
   * and retry the same page. Shared CI runner IPs can stay throttled for a minute or more, hence up to 9 retries.
   */
  protected readonly rateLimitRetries = 9;
  protected readonly rateLimitRetryDelayMs = 10_000;

  private readonly rateLimitNotice: Locator;

  constructor(protected readonly page: Page) {
    this.rateLimitNotice = page.getByText('not able to serve your requests this quickly');
  }

  async open(): Promise<void> {
    await this.navigateTo(this.path);
  }

  /** Navigates to `url` (absolute or relative to BASE_URL), waiting and retrying while rate limited. */
  protected async navigateTo(url: string): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      const response = await this.page.goto(url);
      if (response?.ok()) return;

      const rateLimited = response?.status() === 429 || (await this.rateLimitNotice.isVisible());
      if (!rateLimited || attempt === this.rateLimitRetries) {
        const reason = rateLimited ? `rate limited after ${attempt} retries` : 'unexpected response';
        throw new Error(`Failed to load ${url}: HTTP ${response?.status() ?? 'no response'} (${reason})`);
      }
      console.warn(
        `Rate limited loading ${url} (HTTP ${response?.status()}); retrying in ${this.rateLimitRetryDelayMs / 1000}s`,
      );
      await this.page.waitForTimeout(this.rateLimitRetryDelayMs);
    }
  }
}
