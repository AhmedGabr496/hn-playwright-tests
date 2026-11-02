import { test, expect } from '@fixtures';
import newestPageData from '@test-data/newest-page.json';
import { findSortViolations } from '@utils/sort.utils';

const { articleCount, maxPages } = newestPageData;

test.describe('Hacker News - Newest', () => {
  test(`first ${articleCount} articles are sorted from newest to oldest`, async ({ newestPage }, testInfo) => {
    await newestPage.open();

    const articles = await newestPage.collectArticles(articleCount, maxPages);
    await testInfo.attach('articles.json', {
      body: JSON.stringify(articles, null, 2),
      contentType: 'application/json',
    });

    expect(articles, `Expected exactly ${articleCount} articles`).toHaveLength(articleCount);
    expect(findSortViolations(articles), 'Articles out of newest → oldest order').toEqual([]);
  });
});
