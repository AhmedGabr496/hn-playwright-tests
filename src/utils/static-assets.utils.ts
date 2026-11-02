import type { Page } from '@playwright/test';

interface CachedAsset {
  status: number;
  contentType?: string;
  body: Buffer;
}

/** Static files keyed by URL, shared across the tests of a worker. */
export type StaticAssetCache = Map<string, CachedAsset>;

const STATIC_RESOURCE_TYPES = new Set(['stylesheet', 'script', 'image', 'font']);

/**
 * Downloads each static file from `baseUrl`'s host once and serves it from `cache` afterwards.
 * Hacker News sends no cache headers, so the browser would re-download its CSS, JS and images on every
 * page load: 6 requests per page instead of 1, all counted against the site's per-IP rate limit.
 * Pages themselves always come from the site.
 */
export async function serveStaticAssetsFromCache(page: Page, baseUrl: string, cache: StaticAssetCache): Promise<void> {
  const { host } = new URL(baseUrl);

  await page.route(
    (url) => url.host === host,
    async (route) => {
      const request = route.request();
      if (!STATIC_RESOURCE_TYPES.has(request.resourceType())) {
        return route.fallback();
      }

      let asset = cache.get(request.url());
      if (!asset) {
        const response = await route.fetch();
        if (!response.ok()) {
          return route.fulfill({ response });
        }
        asset = { status: response.status(), contentType: response.headers()['content-type'], body: await response.body() };
        cache.set(request.url(), asset);
      }
      await route.fulfill(asset);
    },
  );
}
