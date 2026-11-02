# Hacker News – Playwright E2E Tests

[![Playwright Tests](https://github.com/AhmedGabr496/hn-playwright-tests/actions/workflows/playwright.yml/badge.svg)](https://github.com/AhmedGabr496/hn-playwright-tests/actions/workflows/playwright.yml)

End-to-end tests for [Hacker News](https://news.ycombinator.com), written in **TypeScript** with **Playwright** and structured using the **Page Object Model**.

## What is tested

| Test | Description |
| --- | --- |
| `tests/newest-sorting.spec.ts` | Opens [`/newest`](https://news.ycombinator.com/newest), pages through **More** to collect the first **100** articles and validates they are sorted from **newest to oldest**. |

How the check works:

- Each article's exact publish time is read from the `title` attribute of its age element (e.g. `2026-11-02T14:40:05`, UTC), not from the relative "5 minutes ago" text.
- Articles are de-duplicated by id, because new submissions shift the list while the test pages through it.
- Equal timestamps are allowed (Hacker News uses one-second resolution).
- Hacker News rate-limits each IP. It returns HTTP 429, or HTTP 503 with "Sorry, we're not able to serve your requests this quickly", and shared CI runner IPs hit this often. Page loads are not delayed up front. Only when a page is throttled do the page objects wait 10s and retry it, up to 3 times.
- To make fewer requests, each static file (CSS, JS, images) is downloaded once per worker and then served from memory. Hacker News sends no cache headers, so otherwise every page load would cost 6 requests instead of 1.
- On failure, the report lists every out-of-order pair, and the collected articles are attached to the HTML report as `articles.json`.
- Every run, local or CI, attaches a full-page screenshot and a video recording of each test to the HTML report (`npm run report`).

## Project structure

```
├── .github/workflows/playwright.yml    # CI pipeline (runs on every push to master)
├── src/
│   ├── config/env.ts                   # Loads & validates environment variables
│   ├── pages/                          # Page objects (one class per page)
│   │   ├── base.page.ts                #   shared navigation + rate-limit guard
│   │   └── newest.page.ts              #   /newest page
│   ├── components/                     # Reusable UI components shared across pages
│   │   └── article-list.component.ts   #   ranked story list
│   ├── fixtures/index.ts               # Injects page objects into tests, caches static files
│   └── utils/
│       ├── sort.utils.ts               #   sort-order validation helpers
│       └── static-assets.utils.ts      #   serves static files from a per-worker cache
├── test-data/newest-page.json          # Test data (no values hard-coded in tests)
├── tests/                              # Test specs
├── .env.example                        # Template for required environment variables
└── playwright.config.ts
```

### Design principles

- **Page Object Model.** Page objects expose `readonly` locators and user-level actions. Reusable parts of the UI live in components, so a markup change is fixed in one place. Specs never contain selectors.
- **Fixtures.** Page objects are injected into tests (`async ({ newestPage }) => …`), so tests have no setup boilerplate.
- **No hard-coded data.** Environment-specific values come from environment variables, and test data comes from JSON files in `test-data/`.
- **Path aliases.** Imports such as `@pages/newest.page` and `@fixtures` keep them short and refactor-friendly (see `tsconfig.json`).

## Getting started

**Prerequisites:** Node.js 24 (see `.nvmrc`).

```bash
npm ci                              # install dependencies
cp .env.example .env                # create local environment config
npx playwright install chromium     # install the browser
```

## Running tests

```bash
npm test               # run all tests (headless)
npm run test:headed    # run with a visible browser
npm run report         # open the last HTML report
npm run typecheck      # TypeScript type check
```

## Configuration

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `BASE_URL` | Yes | Base URL of the application under test, e.g. `https://news.ycombinator.com` |

- **Locally,** values are read from `.env`, which is git-ignored and must never be committed.
- **In CI,** values come from GitHub repository **Variables**. Sensitive values (credentials, tokens) belong in **Secrets**.
- Missing required variables stop the run immediately with a clear error.

### Test data

Test inputs live in `test-data/*.json` and are imported with full type inference:

```json
{ "articleCount": 100, "maxPages": 6 }
```

## CI/CD

GitHub Actions (`.github/workflows/playwright.yml`) runs on **every push to `master`** and can also be started manually (*Actions → Playwright Tests → Run workflow*). The pipeline installs dependencies, type-checks, runs the tests in Chromium and uploads the HTML report, including the screenshots and videos, as a build artifact. On CI, a failed test is retried once with a trace recorded.

**One-time setup:** in the repo, go to *Settings → Secrets and variables → Actions → Variables* and add `BASE_URL` = `https://news.ycombinator.com`.

## Extending the framework

- **New page:** create `src/pages/<name>.page.ts` extending `BasePage` (set `path`, define locators in the constructor), then register it as a fixture in `src/fixtures/index.ts`.
- **New component:** add it to `src/components/` and compose it into the pages that use it. For example, `ArticleListComponent` can be reused for `/news`, `/ask` and `/show`.
- **New test:** add `tests/<feature>.spec.ts`, import `test`/`expect` from `@fixtures`, and keep its inputs in `test-data/`.
- **New environment variable:** add it to `.env.example`, read it with `requireEnv()` in `src/config/env.ts`, and add it to the workflow `env` from Variables or Secrets.
