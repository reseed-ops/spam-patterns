# Self-hosting

There is one supported path: **Docker Compose on a single host, behind a TLS-terminating reverse proxy.** The service listens on `127.0.0.1:8080`, stores everything in one SQLite file on the `stm-data` volume, and makes no outbound network requests.

## Install

```bash
git clone <repo> spam-text-map && cd spam-text-map
cp .env.example .env
sed -i "s/^STM_HMAC_KEY=.*/STM_HMAC_KEY=$(openssl rand -hex 32)/" .env
# set STM_ABUSE_CONTACT, STM_PRIVACY_CONTACT, STM_SECURITY_CONTACT to monitored addresses
docker compose up -d --build
curl -s http://127.0.0.1:8080/healthz
```

The app refuses to start without a real key. Keep `.env` out of backups that go to third parties.

## Reverse proxy

Example Caddyfile:

```
spamtext.example.org {
  reverse_proxy 127.0.0.1:8080
  log {
    output discard        # no access logs; the app logs nothing either
  }
}
```

Then set `STM_TRUSTED_PROXIES` to the proxy's address **as the app sees it**. Behind Docker's bridge network this is usually the bridge gateway, for example `172.17.0.1`. Check it with `docker compose exec app node -e "..."` or your proxy's docs. If you leave it empty while a proxy sits in front, every visitor shares one rate limit, and same-connection duplicate control stays off.

List exact addresses only (no CIDR ranges); a request from any other peer is treated as the client itself. `STM_CLIENT_IP_HEADER` picks the header a trusted proxy uses: `x-forwarded-for` (default, read right to left past trusted proxies) or `x-real-ip` (one address your proxy sets and overwrites). The selected value must parse as an IP address, or the socket peer is used.

**Warning: a wrong trusted-proxy list lets clients forge their address.** If an address you list can be reached by anyone other than your proxy, or your proxy passes a client-supplied header through unchanged, a client can pick its own rate-limit bucket and dodge same-connection duplicate control. Before setting it, send a request with a forged `X-Forwarded-For` / `X-Real-IP` and confirm the forged value never becomes the client address.

On Railway (observed November 2026, not a Railway guarantee): the app sees the edge proxy as a pool of peers in `100.64.0.0/10` (`100.64.0.1` to `100.64.0.21` at the time), Railway overwrites `X-Real-IP` with the client address, and it rebuilds `X-Forwarded-For` as `client, <edge address>`, so the right-to-left walk would select the edge. Use `STM_CLIENT_IP_HEADER=x-real-ip` there. If Railway adds peers, requests through them fall back to the shared bucket until the list is updated.

Whatever proxy you use, do not enable request-body logging, and do not add error trackers or analytics. The privacy page describes what the app does, not what your proxy does.

## Operating

| Task | Command |
|---|---|
| Pause intake now (read-only mode) | `docker compose exec app touch /data/INTAKE_PAUSED` |
| Resume intake | `docker compose exec app rm /data/INTAKE_PAUSED` |
| Pause via env (on restart) | set `INTAKE_PAUSED=1` in `.env`, then `docker compose up -d` |
| Load synthetic demo data | `docker compose exec app node src/seed.ts` (refused in live mode) |
| List open private flags | `docker compose exec app node src/flags-cli.ts list` (add `--all` for every status) |
| Show a flag and the pattern it affects | `docker compose exec app node src/flags-cli.ts show <flag-id>` |
| Resolve a flag, not upheld (the pattern returns) | `docker compose exec app node src/flags-cli.ts resolve <flag-id> --restore` |
| Resolve a flag, upheld (the pattern stays hidden) | `docker compose exec app node src/flags-cli.ts resolve <flag-id> --uphold` |
| List patterns pending review (scrubbed templates and counts) | `docker compose exec app node src/flags-cli.ts pending` |
| List every computed pattern and its review state | `docker compose exec app node src/flags-cli.ts patterns` |
| Publish a reviewed pattern | `docker compose exec app node src/flags-cli.ts publish <pattern-id>` |
| Reject a pattern (hidden while rejected and unchanged) | `docker compose exec app node src/flags-cli.ts reject <pattern-id>` |
| Back up now | `docker compose exec app node src/backup.ts create /backup` |

Outside Docker, the same commands are `npm run flags -- …` and `npm run backup -- …`, with `STM_DATABASE_PATH` and `STM_HMAC_KEY` set. Patterns are not published automatically: 3 matching reports put a pattern in the review queue, and it is public only after `publish` (see [pattern-review.md](pattern-review.md), which also has the Railway commands). A flag hides its pattern from public views while it is open. The target can be a bare pattern ID or any URL that contains one. Flag contents are private: the CLI prints them to your terminal and nowhere else.

## Backups and restore

**What a backup is.** `src/backup.ts create /backup` writes two files to the `stm-backups` volume: an online-consistent SQLite copy (`stm-<UTC time>.sqlite`, safe while the app runs) and a copy of the deletion journal as it was at that moment (`stm-<UTC time>.deletions.journal`). Each run also deletes backups older than **7 days**, the limit the privacy page states. Run it daily from the host's cron, for example `15 3 * * * cd /srv/spam-text-map && docker compose exec -T app node src/backup.ts create /backup`. Copy the volume off the host if you want protection from disk loss, and apply the same 7-day limit there.

**Why the journal matters.** Every deletion appends the report's receipt hash to `/data/deletions.journal`. At startup the app re-applies every hash in it. An older database backup can therefore never republish a report that was deleted after that backup was taken.

**Restore. Stop the app first.**

```bash
docker compose stop app
docker compose run --rm app node src/backup.ts restore /backup/stm-<UTC time>.sqlite
docker compose up -d
```

The restore:

1. Merges the live journal with the backup's journal (a set union). It never replaces the live journal with an older copy.
2. Moves the current database aside as `*.pre-restore` (it is not deleted) and copies the backup into place.
3. Re-applies every journaled deletion before the app serves anything. The app does this again at startup.

After you confirm the restored instance works, delete the `*.pre-restore` files.

**The residual case.** Suppose the live volume, and with it the live journal, is lost entirely. Then a report deleted after the newest backup *was* taken comes back, because neither surviving copy knows about the deletion. Keeping the backup cadence short narrows this window. Recording deletions in an off-host journal would close it. That work is planned after v0.1.

`.env` (the key) must survive a restore. Without it, existing sender hashes stop matching new ones, pattern IDs change, and retried filings cannot re-issue receipts. Existing receipts still delete, because deletion only needs their hash.

### Restore drill (run it before relying on backups)

Run this against a scratch copy, never the live volume:

```bash
export STM_HMAC_KEY=$(openssl rand -hex 32) STM_DATABASE_PATH=/tmp/drill/live/spam-text-map.sqlite PORT=8092
npm run seed && npm start &                       # scratch instance
# file one report through the UI or /api/preview + /api/reports and keep its receipt
npm run backup -- create /tmp/drill/backups       # backup while running
# delete that report with its receipt (/delete)
kill %1                                           # stop the app
npm run backup -- restore /tmp/drill/backups/stm-*.sqlite
npm start &                                       # the receipt now answers "already deleted"
```

Pass criteria: the backup file still contains the report, the restore output says `Re-applied: 1 report removed`, and the receipt returns `already_deleted` after restart. `test/backup.test.ts` runs the same checks automatically. It also checks the case where the deletion predates the backup and the live journal is lost.

**Drill record, 2026-11-17 (evening 2, scratch copy).** The scratch instance held 16 seeded reports plus 1 filed report, so the backup held 17. That report was deleted after the backup, leaving the live database at 16. The restore printed `Journal: 1 deletions after merge (live 1, backup 0). Re-applied: 1 report removed. Reports now: 16.` After restart, the receipt returned `already_deleted`. **Pass.**

## Key rotation

Generate a new key, put it in `.env`, and restart. The effects: duplicate suppression starts over, pattern IDs change, and old sender hashes stay in the database until they expire under the TTL. To drop them at once, run `update reports set sender_token = null`.

## Responsibilities

You are the operator of your instance. Publish your own contacts, respond to takedown requests, keep the key secret, and do not open live intake until you can meet those duties. Forks are not affiliated with the official instance.
