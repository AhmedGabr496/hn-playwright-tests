import type { Locator, Page, Response } from '@playwright/test';

/** Common behaviour for every page object. */
export abstract class BasePage {
  /** Path relative to BASE_URL, e.g. `/newest`. */
  protected abstract readonly path: string;

  /**
   * Hacker News throttles clients per IP, answering with HTTP 429 or with an HTTP 503 "not able to serve your
   * requests this quickly" page. We move between pages like a reader would (spend ~10s scrolling down the page,
   * then click the link), and if we are still throttled we wait 10s and reload the page, up to 3 times.
   */
  protected readonly pauseBetweenPagesMs = 10_000;
  protected readonly rateLimitRetries = 3;
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
    await this.loadPage(() => this.page.goto(url));
  }

  /** Moves to another page like a reader would: reads the current page, then clicks `link`. */
  protected async followLink(link: Locator): Promise<void> {
    await this.readPage();
    await link.hover();
    await this.loadPage(async () => {
      const navigation = this.page.waitForResponse(
        (response) => response.request().isNavigationRequest() && response.frame() === this.page.mainFrame(),
      );
      await link.click();
      const response = await navigation;
      // The response arrives before the new page replaces the current one, so wait for that too.
      await this.page.waitForURL((url) => url.href === response.url());
      return response;
    });
  }

  /** Scrolls down the current page in small steps over about `pauseBetweenPagesMs`, like a person reading it. */
  private async readPage(): Promise<void> {
    const steps = 10;
    const scrollable = await this.page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    for (let step = 0; step < steps; step++) {
      // People read at an uneven pace; the pauses vary but average out to pauseBetweenPagesMs in total.
      await this.page.waitForTimeout((this.pauseBetweenPagesMs / steps) * (0.5 + Math.random()));
      await this.page.mouse.wheel(0, Math.max(0, scrollable) / steps);
    }
  }

  /** Runs `navigate` and checks the page it loads, waiting and reloading that page while rate limited. */
  private async loadPage(navigate: () => Promise<Response | null>): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      const response = await (attempt === 0 ? navigate() : this.page.reload());
      if (response?.ok()) return;

      const rateLimited = response?.status() === 429 || (await this.rateLimitNotice.isVisible());
      if (!rateLimited || attempt === this.rateLimitRetries) {
        const reason = rateLimited ? `rate limited after ${attempt} retries` : 'unexpected response';
        throw new Error(`Failed to load ${this.page.url()}: HTTP ${response?.status() ?? 'no response'} (${reason})`);
      }
      console.warn(
        `Rate limited loading ${this.page.url()} (HTTP ${response?.status()}); ` +
          `retrying in ${this.rateLimitRetryDelayMs / 1000}s`,
      );
      await this.page.waitForTimeout(this.rateLimitRetryDelayMs);
    }
  }
}
