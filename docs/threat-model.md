# Threat model

Scope: a single self-hosted instance running the Docker Compose deployment behind a TLS reverse proxy.

## Assets

1. Sender numbers. A spammer's number is usually not personal data, but a spoofed innocent person's number is. So we treat every number as personal.
2. Reporter identity: IP address, writing style, and the reporter's own name and contacts inside a screenshot.
3. Third parties named in messages: recipients, businesses, towns.
4. Public credibility: a pattern page must not read as an accusation.

## Adversaries and mitigations

| Threat | Mitigation | Residual risk |
|---|---|---|
| **Key compromise.** An attacker obtains `STM_HMAC_KEY` and the database. | The key lives in env only, with no default, and the app refuses to start without one. Sender hashes expire after 30 days. Hashes are never exported. | The protection is pseudonymization, not anonymization. With the key plus a stored area code and prefix, a number falls to at most 10,000 guesses. Rotate the key on any suspicion of compromise. |
| **Database theft** without the key | No full numbers, no raw text, no IPs, and receipt hashes only | Prefix + city + category + day may identify a small business in a sparse dataset |
| **Server-side screenshot leak** (proxy buffering, upload spill, error trackers) | There is no upload. OCR runs in the browser, and the server rejects `image/*` and `multipart/*` with 415 | The browser's own memory and history (out of scope) |
| **Hosted OCR provider retention** | None used in v0.1 | If hosted OCR is ever added, the provider and its retention policy must be named in the UI before upload, under its own gate |
| **Prompt injection or hostile text** in a spam message | No model is involved. Fields come only from the form and are validated against enums and patterns. Text is masked and HTML-escaped | None known |
| **Scrubbing misses** a name or address | Over-masking rules, a mandatory review step, reporter removals, and templates that are never public | Narrowed in evening 2 (sentence-initial, all-caps, street, Spanish and common-word-name rules). What still gets through is listed under "Scrubber residual risks" below. Stored templates are never published |
| **Smear or poisoning**: matching reports filed to create a pattern | A 3-report threshold that triggers human review rather than publication (match is real, nothing personal survived, does not single out a person or one business); a decision lapses when membership changes. Short-window duplicate suppression (same sender hash + template). Same-connection suppression for 7 days in memory (same IPv4 or IPv6 /64 + sender hash + template; reset by restarts). Per-IP caps (noise control only). Membership is never published. A private flag hides a pattern pending review. Plain-language tier labels | Three reports from three IPs takes minutes. The threshold stops accidents, not adversaries; review catches obvious smears but a reviewer cannot verify who filed. The wording ("shared script pattern", "does not establish a common sender") is the main defense |
| **Re-identification** via combined fields | Public output is limited to area-code counts, category counts and day ranges. No prefix, city or hour is ever published. Future releases are marginals only, with a minimum bucket of 10 and a 7-day delay (see feed-spec.md) | Small live counts on the Overview can still be sparse. This is reviewed before Decision B |
| **Wallet attack / flooding** | Per-IP caps, a global daily cap, body size limits, and an intake pause that takes effect immediately (pause file or env var). There is no paid extraction, so there is no spend to cap | Rotating IPs can use up the daily cap. That is accepted: the cap fails closed |
| **Lost receipt** | None by design: possession of the code is the only authority | The reporter can still use the private flag route |
| **Restore resurrects deleted reports** | An append-only deletion journal outside the DB, re-applied at startup | The journal must be kept with the deployment, not with the backups |
| **Malicious PR adds tracking** | Strict CSP (`default-src 'none'`, `script-src 'self' 'wasm-unsafe-eval'`) plus a test that scans for third-party tags and analytics | A reviewer must still read the PR |
| **Hostile lookalike fork** | The README names the official instance. The Apache license grants no trademark rights | Reputational |
| **Trusted-proxy misconfiguration** | `STM_TRUSTED_PROXIES` (exact addresses only): the forwarding header (`STM_CLIENT_IP_HEADER`) is honored only from listed proxies, and the selected value must parse as an IP. `cf-connecting-ip` mode reads that header only when the listed proxy's `X-Real-IP` lies in `STM_UPSTREAM_CIDRS` (Cloudflare's ranges); otherwise `X-Real-IP` is used | If unset behind a proxy, every visitor shares one rate limit and same-connection dedup is off. If it lists an address clients can reach, or the proxy passes client headers through, clients choose their own bucket |

## Scrubber residual risks

The scrubber (`src/scrub.ts`) masks by deterministic rules. It does not guess. The hardening fixtures in `test/scrub.test.ts` cover sentence-initial names with no greeting, all-caps names, street names with and without house numbers, Spanish messages, and names that are also common words. Each case below **cannot be masked deterministically** without masking ordinary words, so it is documented here instead of guessed at. In every case the reporter still sees the scrubbed text at review and can remove words, and stored templates are never published.

| Case | Example (synthetic) | Why it is not masked | Mitigation |
|---|---|---|---|
| A **lowercase name** outside a greeting or persona slot | `call dmitri at the office` | Lowercase text has no case signal. Masking every word that is not in the common-word list would mask most trade and product words | Reporter removals at review |
| A **sentence-initial name that is also a common word**, with no comma | `Bill your roof is due`, `Will you be home?` | `Bill` and `Will` are on the common-word list (`src/commonwords.ts`), so they are kept at a sentence start. Taking them off would mask "Will you…" everywhere | Greeting (`Hi Bill,`), vocative (`Bill,`), persona (`this is Will`) and full-name (`Will Summers`) positions are masked. Only the bare sentence-start case remains |
| A **street name with no suffix and no preposition** | `the Larkspur job went well` | Masked when capitalized (mid-sentence rule). Leaks only when lowercase: `the larkspur job` | Reporter removals |
| A **spelled-out house number** that is not part of a street phrase | `four ten, the blue house` | Spelled numbers are masked only as runs of 7+ digits (phone numbers). Shorter runs are ordinary words | Street rule masks `four ten larkspur lane` as one place |
| **Languages other than English and Spanish** | French or Vietnamese text | Greeting, persona and title rules exist only for English and Spanish. The capitalization rules still apply, so capitalized names are masked, but greeting-slot labels are generic | Over-masking. Reporter review |
| **Spanish common words** missing from the small Spanish list | `Tenemos` → kept, `Ofrecemos` → masked | The Spanish list is short, so some ordinary sentence-initial Spanish words are masked as names | Over-masking is the safe direction. It slightly weakens clustering for Spanish texts |
| **All-caps acronyms** not on the acronym list | `CALL ABC ROOFING` | Unknown acronyms are masked as names | Over-masking. Add real acronyms to `ACRONYMS` with a fixture |

## Explicitly out of scope for v0.1

Federation (removed from the roadmap), any number-level or report-level feed, automatic blocking, and accounts.
