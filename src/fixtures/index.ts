import { test as base } from '@playwright/test';
import { NewestPage } from '@pages/newest.page';

type PageFixtures = {
  newestPage: NewestPage;
};

/** Page objects are injected into tests as fixtures — register new pages here. */
export const test = base.extend<PageFixtures>({
  newestPage: async ({ page }, use) => {
    await use(new NewestPage(page));
  },
});

export { expect } from '@playwright/test';
