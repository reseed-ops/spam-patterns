# Pattern review

Three matching eligible reports are a **review trigger, not publication**. A cluster that reaches the threshold is *pending*. It is not shown publicly anywhere until an operator publishes it: not on the home page, not on `/patterns`, not as a pattern detail page, and not in any count of patterns. Individual reports are unaffected. They count in totals, the area-code table and the map from the moment they are filed, whatever their pattern's state.

## What a review checks

- **The match is real.** The templates really are the same message, the same lightly edited message, or the same script.
- **No personal detail survived scrubbing.** Read every template for names, streets, business names or anything else that identifies someone.
- **The pattern does not read as identifying a person or a single business.** A script used by one identifiable business is not published.

If any check fails, reject. If scrubbing missed something, also treat it as a redaction bug: fix the rules, bump the redaction rules version ([rules-changelog.md](rules-changelog.md)), and add a fixture.

## States

| State | Public? | Meaning |
|---|---|---|
| pending | No | Reached the threshold. Never reviewed, or a decision lapsed (see below) |
| published | Yes, unless a private flag hides it | An operator published this exact membership |
| rejected | No | An operator rejected this exact membership. Stays hidden while it remains rejected and unchanged |

Decisions are stored in the `pattern_reviews` table, keyed by the pattern's stable ID, with a membership fingerprint: SHA-256 over the matching rules version and the sorted set of distinct template hashes in the cluster.

## When a decision lapses (material change)

A published or rejected decision goes back to **pending** when any of these happens:

1. **A template joins or leaves.** The cluster's set of distinct template hashes differs from the reviewed set. A template leaves when every report with that template is deleted, or stops being eligible.
2. **The cluster drops out.** Deletions take it below the threshold, or its stable ID stops being computed. This applies even if it later comes back with exactly the reviewed templates.
3. **The matching rules version changes.** It is part of the fingerprint.

These are not material: more reports of a template that was already reviewed, or deletions that leave every reviewed template present and the cluster at or above the threshold. A published pattern's report count and dates update live.

The app checks for these changes (`reconcileReviews()` in `src/review.ts`) after every filing and deletion, at startup (after the deletion journal is re-applied), on every public pattern read, and in every CLI command. A cluster cannot drop out and come back between two checks. A private flag hides a pattern but is not a membership change. A published pattern under an open or upheld flag keeps its decision and stays hidden until the flag is resolved with `--restore`.

## Commands

The review commands are part of the flags CLI (`src/flags-cli.ts`). They need the same environment as the app (`STM_DATABASE_PATH`, `STM_HMAC_KEY`), because pattern IDs are keyed.

| Task | Local or `npm` | Docker Compose |
|---|---|---|
| List pending patterns, with scrubbed templates and counts | `npm run flags -- pending` | `docker compose exec app node src/flags-cli.ts pending` |
| List every computed pattern and its state | `npm run flags -- patterns` | `docker compose exec app node src/flags-cli.ts patterns` |
| Publish | `npm run flags -- publish <pattern-id>` | `docker compose exec app node src/flags-cli.ts publish <pattern-id>` |
| Reject | `npm run flags -- reject <pattern-id>` | `docker compose exec app node src/flags-cli.ts reject <pattern-id>` |

`publish` works on a pending or a rejected pattern. `reject` works on a pending or a published one, and unpublishes it at once. Each decision records the membership as it is at that moment.

The listing shows each distinct scrubbed template once, with its report count. Templates are private. The CLI prints them to your terminal and nowhere else, so don't paste them into issues or chat.

### Official instance (Railway)

The production database lives on the Railway volume at `/data`, inside the running container. `railway run` runs a command **on your machine** with the service's variables, so it cannot reach that database. Use `railway ssh`, which runs the command inside the container. Run it from the linked deploy directory (`~/stm-railway-deploy`; project `spam-text-map`, environment production, service `spam-text-map`):

```sh
cd ~/stm-railway-deploy
railway ssh -- node --disable-warning=ExperimentalWarning src/flags-cli.ts pending
railway ssh -- node --disable-warning=ExperimentalWarning src/flags-cli.ts patterns
railway ssh -- node --disable-warning=ExperimentalWarning src/flags-cli.ts publish <pattern-id>
railway ssh -- node --disable-warning=ExperimentalWarning src/flags-cli.ts reject <pattern-id>
```

**One-time prerequisite.** `railway ssh` needs an SSH public key registered with the Railway account. Without one it stops with "No registered SSH keys found". Register a key once with `railway ssh keys add` (or `railway ssh keys github`). This was not yet done when v0.1.5 shipped (2026-11-19).

The container already has `STM_DATABASE_PATH` and `STM_HMAC_KEY`. Do not print or copy the key. The running app sees a decision on its next request, with no restart.
