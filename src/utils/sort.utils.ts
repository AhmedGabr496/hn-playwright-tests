import type { Article } from '@components/article-list.component';

export interface SortViolation {
  /** 1-based position of the article that is followed by a newer one. */
  position: number;
  article: string;
  followedBy: string;
}

/**
 * Returns every adjacent pair that breaks newest → oldest order; an empty array means the list is sorted.
 * Equal timestamps are allowed, since Hacker News timestamps have one-second resolution.
 */
export function findSortViolations(articles: Article[]): SortViolation[] {
  const violations: SortViolation[] = [];

  for (let i = 0; i < articles.length - 1; i++) {
    const current = articles[i];
    const next = articles[i + 1];
    if (current.publishedAt.getTime() < next.publishedAt.getTime()) {
      violations.push({ position: i + 1, article: describe(current), followedBy: describe(next) });
    }
  }

  return violations;
}

function describe(article: Article): string {
  return `${article.publishedAt.toISOString()} | #${article.id} | ${article.title}`;
}
