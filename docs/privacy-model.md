# Privacy model

This document states what the software does. Where it describes a check, a test in `test/` enforces it.

## Data flow

1. **Screenshot (optional).** The screenshot is read on the device. Where the browser exposes the Shape Detection API's `TextDetector`, that on-device reader runs first; on any failure (missing API, error, empty result) Tesseract.js reads it in the browser instead, and its assets are fetched only when that fallback runs. The review screen names the reader that ran. For Tesseract, the worker, the WASM core and the English language data are served from this origin with `workerBlobURL: false` and `cacheMethod: 'none'`. The image is never sent to the server. No server route accepts `image/*` or `multipart/*` bodies; they get a 415 (`test/intake-and-hygiene.test.ts`). The image is never put in a draft, thumbnail, storage API or error payload (`report.js` is statically checked). EXIF metadata never reaches the server because the image never does.
2. **Preview.** The browser sends JSON text: sender number, message, category, optional city, removals and source. The server runs `prepare()`, which validates the input, scrubs it and derives fields. It stores nothing and returns the preview. The preview contains no hash.
3. **File.** The browser re-sends the same draft with the `previewHash` it showed you and a random idempotency key. The server recomputes the record. If the record differs from what you reviewed, nothing is saved and the revised preview comes back (409). Otherwise exactly one row is written, through the allow-list.
4. **Full number.** It is used only inside `prepare()` to derive the area code, the prefix and `HMAC(sender-token-v1, number)`, and is then dropped. It never appears in a response, the database or a log.

## Storage allow-list

`src/db.ts` defines `REPORT_COLUMNS`. `insertReport()` rejects any other key and validates every value: area code and prefix must be 3 digits, category must be in the enum, the city must be letters only and must appear in the message, and the template must contain no digits or `@` outside masks. A test shows that adding fields like `full_number` or `raw_message`, or smuggling a full number into an allowed column, throws before the database is touched. See [data-dictionary.md](data-dictionary.md).

## Scrubbing (deterministic)

`src/scrub.ts` applies these steps in order:

1. Normalize the text and strip invisible and bidi characters.
2. Reduce the thread: drop status-bar and app chrome, delivery markers, contact headers (saved names or the number), the recipient's replies (`Me:`, `STOP`, `Who is this?`) and other conversations (conversation-list rows ending in a time, truncated previews), then keep the longest remaining message.
3. Apply the reporter's own removals.
4. Mask emails, links, phone numbers (including spelled-out ones), then every digit run.
5. Mask the greeting name, vocative names, the sender persona, the reported city and other places.
6. Mask every remaining mid-sentence capitalized word that is not on a small allow-list.

The scrubber fails closed when nothing safe remains, when a digit or @ sign survives masking (reported to the reporter as a separate, specific error), or when the input is too long. Over-masking is the intended failure direction. The reporter reviews the result and can remove more.

Prompt-injection text inside a spam message is inert. No model is involved, structured fields come only from validated form inputs, and the text is masked like any other text.

## What is public

| Field | Public form |
|---|---|
| Area code | Counts per area code on the Overview (claimed origin) |
| Category | Per-pattern category counts |
| Filing day (UTC) | Date ranges on the Overview and patterns; never an hour |
| Pattern membership | Counts only, and only for patterns published after review; members are never listed |

These are never public: message text, templates, the prefix, the city, sender hashes, template hashes, MinHash signatures, review fingerprints, receipt codes or their hashes. Pending and rejected patterns are not public in any form. A snapshot test crawls every page and API response and asserts that none of these appear (`test/hmac-leak.test.ts`).

## Retention

| Item | Retention |
|---|---|
| Report rows | Until deleted with the receipt |
| Sender hash | Erased after `STM_SENDER_TOKEN_TTL_DAYS` (default 30) |
| Idempotency records | 24 hours |
| Deletion tombstones and journal | Indefinitely (hashes only) |
| Rate-limit state | In memory only, keyed by HMAC of the IP, cleared by a timer at the end of each hour |
| Same-connection duplicate codes | In memory only: `HMAC(dedupKey, netId \| sender hash \| template hash)`, where netId is the IPv4 address or the IPv6 /64 and `dedupKey` is 32 random bytes made at startup, never saved and not derived from `STM_HMAC_KEY`. Expire 7 days after the last matching filing, swept hourly, and wiped by any restart or deploy. Used only when the client address came from a trusted proxy |
| Pattern review decisions | Kept while the pattern exists; a lapsed decision is kept as pending with a note. Pattern ID, status, membership fingerprint, counts, day. No report IDs |
| Flags | Kept with their status after the maintainer resolves them. An upheld flag is what keeps its pattern hidden |
| Service-worker cache (visitor's browser, not the server) | Until the next release replaces it or the visitor clears site data. Holds only the app's own files: CSS/JS, icons, the logo and diagram, the OCR worker, core and language data, the `/report` page shell and an offline page. Never report data, API or deletion responses, JSON, or pages with live counts |
| Backups (database + journal copy) | At most 7 days (`npm run backup` prunes older ones) |

The app writes no request logs. The hosting provider's own network and HTTP logging is separate and is not covered by this table (Railway, for example, documents the client's source IP in its HTTP logs).

A report stored with `counted = 0` because of the same-connection check implies that an earlier report with the same sender hash and template came from the same connection. That link is stored; the IP address is not. Because the key dies with the process, the flag cannot be recomputed from the database.

## Deletion

The receipt is 160 bits, derived as `HMAC(receipt-v1, idempotency key)`. That lets a retried filing re-issue the same code while only `sha256(receipt)` is stored. The code goes in a POST body and never in a URL. Deletion removes the row, which recomputes counts and pattern eligibility on the next request (patterns are computed live), and writes a tombstone plus an append-only journal entry. The journal sits outside the database and is re-applied at startup, so restoring an older backup cannot bring a deleted report back. Restores merge the live and backup journals and never replace the live one with an older copy. One case remains. If the live volume is lost entirely, a report deleted after the newest backup would return. docs/self-hosting.md describes this case. Copies that were already downloaded cannot be recalled, and the deletion success page says so.

## Contest and takedown

The private flag form at `/privacy#contest` (also `POST /api/flag`) stores the reason, target, details and optional contact for the maintainer only. While a flag is open, the flagged pattern is removed from public views. The contact addresses come from `STM_ABUSE_CONTACT`, `STM_PRIVACY_CONTACT` and `STM_SECURITY_CONTACT`.
