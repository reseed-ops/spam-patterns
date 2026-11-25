# Spam Patterns

A pilot tracking recurring spam texts.

Spam Patterns takes anonymous reports of unsolicited text messages and groups them by the script they follow, so that no-link, lead-generation-style texts can be recognized as a pattern. Intake is built for privacy first. The closest related work is SpamHunter, which extracts SMS spam from screenshots people posted publicly and publishes a dataset that includes sender numbers. Spam Patterns makes a different privacy tradeoff: screenshots are read on the reporter's device, full numbers are never stored, and nothing at report level is ever published.

> Status: v0.1, pre-release. The code runs in **demo mode** by default. Opening a live public intake and releasing any data are separate, later decisions; neither is implied by this repository.

## What it does

- **Two ways to report, one review.** You can type the text in, or upload a screenshot that is read on your device, by the browser's built-in text detection where available, otherwise by [Tesseract.js](https://github.com/naptha/tesseract.js) in your browser (the image is never uploaded). Both routes end at the same review screen, which shows the scrubbed message, the sender fields we keep, and the fields that may appear publicly. Nothing is saved until you select **File this report**, and only the version you reviewed is saved.
- **Deterministic scrubbing.** Fixed rules remove greeting names, sender first names, phone numbers, every other digit run, emails, links, places and other likely names. They also drop phone UI chrome, your own replies, and other conversations visible in a screenshot. No model output is trusted.
- **Formula-level grouping.** Matching runs in three separate tiers, each with its own label: *identical message*, *same message, lightly edited*, and *shared script pattern* (the same sequence of moves: greeting → persona → local claim → trade → offer → question). Three matching eligible reports trigger a review: a pattern is published only after a maintainer checks that the match is real, that no personal detail survived scrubbing, and that it does not read as identifying a person or a single business ([pattern review](docs/pattern-review.md)). A shared script pattern never implies a shared sender.
- **A map that knows its limits.** A server-rendered tile map (a state list on narrow screens) and a table carry equal weight. Both show the sender's claimed area code, and each has a warning beside it that area codes can be spoofed.
- **Installable, with a narrow service worker.** The site is a PWA: it can be added to a home screen for one-tap filing. Its service worker (`public/sw.js`) stores only the app's own static files, the on-device OCR assets and the `/report` page shell, so repeat filers skip the multi-megabyte OCR download. It never stores POST responses, API or deletion endpoints, JSON, or pages with live counts.
- **A junk-mail guide.** `/junk-mail` is a static public-service page listing the paper junk-mail opt-outs that work and their limits. It collects nothing.
- **A people-search opt-out page.** `/opt-out` explains people-search sites and the limits of opting out, lists the checked opt-out routes for the major sites, and builds a removal-request email in the browser (a `mailto:` link opened in your own email app). Nothing typed there is sent to the server.
- **A scams guide.** `/scams` is a static page describing common scams by medium (text, email, phone, social media, paper mail, QR codes) and what to do about each. It collects nothing and loads no page script.
- **Deletion.** Each report comes with a receipt code (160 bits). Only its hash is stored. Deleting a report removes it from counts and patterns right away.

## What it does not do

It does not block numbers, verify senders, accuse anyone, or measure how much spam is sent. It publishes no number lists, no prefixes, no message text and no hashes. Area codes are claimed origin, not location. Related work on calls and links is listed below. We make no claim to be first or only.

## Related work

- SpamHunter builds a dataset of SMS spam from public screenshots, including sender numbers.
- CallShield and SpamBlocker are number-reputation blockers.
- The FTC publishes Do Not Call reported-calls data, and the FCC publishes consumer complaint data. Both cover calls and volume, not message text.
- PhishTank and URLhaus are mature crowdsourced abuse feeds for links.
- Number-reputation forums such as 800notes show the failure mode we want to avoid: people smearing a number in public.

## Run it

```bash
cp .env.example .env
sed -i "s/^STM_HMAC_KEY=.*/STM_HMAC_KEY=$(openssl rand -hex 32)/" .env
docker compose up -d --build        # http://127.0.0.1:8080
docker compose exec app node src/seed.ts   # optional: synthetic demo data
```

Without Docker (Node 24+):

```bash
npm ci && npm run vendor
export STM_HMAC_KEY=$(openssl rand -hex 32) STM_DATABASE_PATH=./var/stm.sqlite
npm run seed && npm start
npm test
```

To pause intake with no deploy, run `docker compose exec app touch /data/INTAKE_PAUSED`. Every page keeps working, and new reports are refused with a read-only notice.

## Documentation

- [Privacy model](docs/privacy-model.md) and [threat model](docs/threat-model.md)
- [Aggregate data spec](docs/feed-spec.md) and [data dictionary](docs/data-dictionary.md)
- [Self-hosting](docs/self-hosting.md)
- [Pattern review](docs/pattern-review.md) and [rules changelog](docs/rules-changelog.md)
- The methodology (skeleton grammar v1, thresholds, stop-skeletons) is served at `/methodology`.

## Official instance and forks

Reseed LLC will name the official instance here once it exists. Forks and self-hosted copies are not affiliated with it. The Apache license grants no trademark rights. If you run a fork, please use a different name.

## Maintenance

One maintainer works on this best effort, with no service-level promise and no roadmap commitments. Issues are triaged weekly. Security and takedown requests skip the queue. The expected steady state is low volume and few outside contributions. That is fine. The hosted instance is kept cheap enough to run indefinitely, or to archive without regret.

## License

Code: [Apache License 2.0](LICENSE). Approved aggregate data releases, when there are any, will be CC0, and only to the extent Reseed and submitters hold rights. Senders' own wording is never released.
