import type { Locator, Page } from '@playwright/test';

/** Common behaviour for every page object. */
export abstract class BasePage {
  /** Path relative to BASE_URL, e.g. `/newest`. */
  protected abstract readonly path: string;

  private readonly rateLimitNotice: Locator;

  constructor(protected readonly page: Page) {
    this.rateLimitNotice = page.getByText('not able to serve your requests this quickly');
  }

  async open(): Promise<void> {
    const response = await this.page.goto(this.path);
    if (!response?.ok()) {
      throw new Error(`Failed to open ${this.path}: HTTP ${response?.status() ?? 'no response'}`);
    }
    await this.assertNotRateLimited();
  }

  /** Hacker News throttles fast clients with a plain notice; fail clearly instead of timing out on missing elements. */
  protected async assertNotRateLimited(): Promise<void> {
    if (await this.rateLimitNotice.isVisible()) {
      throw new Error(`Rate limited by the server at ${this.page.url()}. Retry later.`);
    }
  }
}
