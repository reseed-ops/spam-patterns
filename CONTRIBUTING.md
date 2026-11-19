# Contributing

Thanks for looking. This is a small, best-effort project with one maintainer. Please read this first.

## Ground rules

- **Synthetic data only.** Never put a real message, a real phone number, a real person's name, or a real business in code, tests, fixtures, issues or commits. Invent everything. Use numbers from the 555-0100 to 555-0199 range, which is reserved for fiction.
- **No third-party scripts, analytics, trackers, CDNs or fonts.** A test enforces this, and the CSP blocks them anyway.
- **Nothing new leaves the server.** A new stored field must be added to the allow-list in `src/db.ts`, to `docs/data-dictionary.md`, and to the privacy page, all in the same PR. Nothing in the report table is published except area-code, category and pattern counts.
- **Public wording.** Use "shared script pattern", never "campaign". Use "claimed origin", never "location". A listing is never an allegation.

## Good first contributions

- **Area-code data corrections.** `data/area-codes.json` is generated from the NANPA NPA database with `scripts/verify-area-codes.mjs` (see docs/area-code-verification.md). Re-run the script against the current NANPA CSV rather than editing the JSON by hand.
- **Skeleton grammar fixtures**: new synthetic messages in the tests that the v1 grammar gets wrong, either missed slots or false matches. These are the most useful contributions.
- **Accessibility fixes** (target: WCAG 2.2 AA, keyboard and screen reader).

## Development

```bash
npm ci && npm run vendor
npm test            # typecheck + full test suite
STM_HMAC_KEY=$(openssl rand -hex 32) STM_DATABASE_PATH=./var/dev.sqlite npm run seed
STM_HMAC_KEY=... STM_DATABASE_PATH=./var/dev.sqlite npm run dev
```

The code is TypeScript run directly by Node 24 (erasable syntax only: no enums, namespaces or parameter properties).

## Changing the skeleton grammar

Grammar changes need a new version (`SKELETON_GRAMMAR_VERSION`). Pattern IDs are stable only within a version. Update the methodology page's revision history, and add fixtures that show the change.

A grammar change is also a matching-rules change: bump `MATCHING_RULES_VERSION` (`src/patterns.ts`), which sends every published pattern back to review. Any change to scrubbing behavior bumps `REDACTION_RULES_VERSION` (`src/scrub.ts`). Record both in [docs/rules-changelog.md](docs/rules-changelog.md).

## Security

Report security problems privately. See [SECURITY.md](SECURITY.md).

## Service worker and releases

`public/sw.js` caches `/static/` files cache-first under a cache named for the release (`stm-v<version>`). Its `VERSION` must equal `package.json`'s `version` (`test/pwa.test.ts` checks this). Bump both in every release that changes anything under `public/`, or returning visitors keep the previous files until the next bump. Never add API, deletion, JSON, or live-count pages to what it stores.

