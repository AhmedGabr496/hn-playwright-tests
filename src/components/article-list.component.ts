import type { Locator, Page } from '@playwright/test';

export interface Article {
  id: string;
  rank: number;
  title: string;
  publishedAt: Date;
}

/**
 * The ranked story list shared by Hacker News listing pages (/newest, /news, /ask, /show, ...).
 * All knowledge of the list's markup lives here.
 */
export class ArticleListComponent {
  readonly rows: Locator;

  constructor(page: Page) {
    this.rows = page.locator('tr.athing.submission');
  }

  /** Reads every article on the current page in a single browser round trip. */
  async readArticles(): Promise<Article[]> {
    await this.rows.first().waitFor();

    const rawArticles = await this.rows.evaluateAll((rows) =>
      rows.map((row) => ({
        id: row.id,
        rank: row.querySelector('.rank')?.textContent ?? '',
        title: row.querySelector('.titleline > a')?.textContent ?? '',
        // The timestamp lives in the metadata row rendered directly below each article row.
        timestamp: row.nextElementSibling?.querySelector('.age')?.getAttribute('title') ?? '',
      })),
    );

    return rawArticles.map(({ id, rank, title, timestamp }) => ({
      id,
      rank: Number.parseInt(rank, 10),
      title: title.trim(),
      publishedAt: parseTimestamp(timestamp, id),
    }));
  }
}

/** Parses HN's UTC timestamp, e.g. `2026-11-02T14:40:05` (optionally followed by a Unix epoch). */
function parseTimestamp(raw: string, articleId: string): Date {
  const [isoDateTime = ''] = raw.trim().split(/\s+/);
  const date = new Date(isoDateTime.endsWith('Z') ? isoDateTime : `${isoDateTime}Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Article ${articleId} has an unparseable timestamp: "${raw}"`);
  }
  return date;
}
