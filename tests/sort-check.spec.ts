import { test, expect } from '@fixtures';
import type { Article } from '@components/article-list.component';
import sortCases from '@test-data/sort-check.json';
import { findSortViolations } from '@utils/sort.utils';

/** Builds articles in list order from their publish times. */
function toArticles(publishedAt: string[]): Article[] {
  return publishedAt.map((time, index) => ({
    id: `${index + 1}`,
    rank: index + 1,
    title: `Article ${index + 1}`,
    publishedAt: new Date(time),
  }));
}

// Proves the sort check used by the Hacker News test can fail; runs without a browser or network.
test.describe('Sort check', () => {
  test('passes articles sorted from newest to oldest', () => {
    expect(findSortViolations(toArticles(sortCases.sorted))).toEqual([]);
  });

  test('allows articles published in the same second', () => {
    expect(findSortViolations(toArticles(sortCases.sameSecond))).toEqual([]);
  });

  test('reports an article that is followed by a newer one', () => {
    const { publishedAt, violationPositions } = sortCases.outOfOrder;
    const violations = findSortViolations(toArticles(publishedAt));
    expect(violations.map((violation) => violation.position)).toEqual(violationPositions);
  });
});
