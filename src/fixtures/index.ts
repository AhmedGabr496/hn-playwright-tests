import { test as base } from '@playwright/test';
import { NewestPage } from '@pages/newest.page';
import { type StaticAssetCache, serveStaticAssetsFromCache } from '@utils/static-assets.utils';

type PageFixtures = {
  newestPage: NewestPage;
};

type WorkerFixtures = {
  staticAssetCache: StaticAssetCache;
};

/** Page objects are injected into tests as fixtures — register new pages here. */
export const test = base.extend<PageFixtures, WorkerFixtures>({
  // One cache per worker, so each static file is requested from the site only once per run.
  staticAssetCache: [
    async ({}, use) => {
      await use(new Map());
    },
    { scope: 'worker' },
  ],

  page: async ({ page, baseURL, staticAssetCache }, use) => {
    // baseURL comes from BASE_URL in .env.example (or your .env), which playwright.config.ts requires.
    await serveStaticAssetsFromCache(page, baseURL!, staticAssetCache);
    await use(page);
  },

  newestPage: async ({ page }, use) => {
    await use(new NewestPage(page));
  },
});

export { expect } from '@playwright/test';
