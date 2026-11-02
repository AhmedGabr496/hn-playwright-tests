import type { Locator, Page } from '@playwright/test';
import { type Article, ArticleListComponent } from '@components/article-list.component';
import { BasePage } from './base.page';

export class NewestPage extends BasePage {
  protected override readonly path = '/newest';

  readonly articleList: ArticleListComponent;
  readonly moreLink: Locator;

  constructor(page: Page) {
    super(page);
    this.articleList = new ArticleListComponent(page);
    this.moreLink = page.getByRole('link', { name: 'More', exact: true });
  }

  /** Follows the "More" link's URL, so the response can be checked and rate limiting handled. */
  async goToNextPage(): Promise<void> {
    const nextPageUrl = await this.moreLink.getAttribute('href');
    if (!nextPageUrl) {
      throw new Error('The "More" link has no URL');
    }
    await this.navigateTo(nextPageUrl);
  }

  /**
   * Collects the first `count` articles, paging through "More" as needed.
   * Articles are de-duplicated by id because new submissions shift the list between page loads.
   */
  async collectArticles(count: number, maxPages: number): Promise<Article[]> {
    const articles = new Map<string, Article>();

    for (let pageNumber = 1; articles.size < count; pageNumber++) {
      if (pageNumber > 1) {
        if (pageNumber > maxPages) {
          throw new Error(`Found only ${articles.size} of ${count} articles within ${maxPages} pages`);
        }
        await this.goToNextPage();
      }
      for (const article of await this.articleList.readArticles()) {
        if (!articles.has(article.id)) articles.set(article.id, article);
      }
    }

    return [...articles.values()].slice(0, count);
  }
}
