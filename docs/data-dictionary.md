# Data dictionary

## `reports` (internal; the storage allow-list)

| Column | Type | Null | Format / allowed values | Meaning | Public? |
|---|---|---|---|---|---|
| `id` | text | no | 22-char random base64url | Row identifier | No |
| `created_at` | text | no | ISO 8601 UTC | Filing time. Used only for the duplicate window, token expiry and the release delay | No |
| `created_day` | text | no | `YYYY-MM-DD` UTC | Filing day | As date ranges and counts |
| `area_code` | text | no | `[2-9]\d\d`, in `data/area-codes.json` | Sender area code (claimed origin) | As counts |
| `prefix` | text | no | `[2-9]\d\d` | The 3 digits after the area code | No |
| `sender_token` | text | yes | 64 hex | `HMAC-SHA256(HKDF(key,"sender-token-v1"), 10-digit number)`. NULL after the TTL | Never |
| `category` | text | no | enum in `src/categories.ts` | Chosen by the reporter, default `unknown` | As counts |
| `city` | text | yes | letters, spaces, `.'-`, optional `, ST`; must appear in the message | City named in the message | No |
| `template` | text | no | ≤1500 chars; no digits or `@` outside masks | Slot-masked message | Never |
| `template_hash` | text | no | 64 hex | SHA-256 of the canonical template (exact tier) | Never |
| `skeleton` | text | yes | e.g. `GREETING>PERSONA>OFFER>CTA` | Grammar-v1 skeleton; NULL when fewer than 3 slots | In pattern pages and future aggregates |
| `skeleton_version` | text | no | `v1` | Grammar version | Yes |
| `minhash` | text | no | JSON array of 64 uint32 | MinHash over masked 3-token shingles (near tier) | Never |
| `source` | text | no | `manual` / `screenshot` | Entry route (as reported by the client) | No |
| `counted` | integer | no | 0 / 1 | 0 = same sender hash + template within the duplicate window, or the same sender hash + template from the same connection within 7 days while the server has been running (in-memory check, only behind a trusted proxy) | No |
| `receipt_hash` | text | no | 64 hex | SHA-256 of the deletion receipt | Never |

## Other tables

- `filings(idem_hash, request_hash, report_id, created_at)` holds the idempotency records: the SHA-256 of the client key and the reviewed preview hash. Rows expire after 24 hours.
- `deletions(receipt_hash, deleted_day)` holds tombstones so that a repeated delete is idempotent. A matching append-only `deletions.journal` file lives next to the DB.
- `flags(id, created_day, reason, target, details, contact, status)` holds private contest and takedown flags for the maintainer.
- `pattern_reviews(pattern_id, status, fingerprint, template_count, report_count, decided_day, note)` holds the operator's review decisions (`pending`, `published`, `rejected`). `fingerprint` is SHA-256 over the matching rules version and the sorted set of distinct template hashes in the cluster. It is never published. See [pattern-review.md](pattern-review.md).
- `daily_counter(day, submissions)` backs the global daily cap.
- `meta(key, value)` holds the schema version.

## Pattern objects (computed live; public only once published after review)

| Field | Meaning |
|---|---|
| `id` | Opaque: tier letter + grammar version + 12 hex of `HMAC(pattern-id-v1, tier:key)`. Stable within a deployment and grammar version |
| `tier` / `label` | `exact` "identical message", `near` "same message, lightly edited", or `formula` "shared script pattern" |
| `count` | Eligible reports (3 or more; reaching 3 triggers review, not publication) |
| `firstDay`, `latestDay` | UTC days |
| `categories` | Count per category |
| `distinctAreaCodes` | The number of distinct area codes (no list) |
| `skeleton`, `example` | The skeleton, and an example generated from slot names only |

Aggregate release fields are defined in [feed-spec.md](feed-spec.md) and `/data/schema.json`.
