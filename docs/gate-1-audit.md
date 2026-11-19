# Gate 1 audit: secrets sweep and history content audit

Gate 1 (plan v2) requires a secrets sweep and a content audit of the full history before the public flip, followed by a **squash to a fresh initial commit at the flip**. This file records each run. Re-run both checks immediately before the flip, on the squashed commit.

## How to run

```bash
gitleaks git --no-banner -v .    # every commit
gitleaks dir --no-banner -v .    # working tree, including untracked files
# content audit: search all history for personal references
for pat in '<owner name>' '<pilot town>' '[/]home[/]' '@gmail' '@'; do git grep -nEi "$pat" $(git rev-list --all) -- . ':!package-lock.json'; done
```

## Run 1, 2026-11-17 (evening 2)

**Secrets sweep.** gitleaks 8.30.1 (official release binary, checksum verified against the release's `checksums.txt`).

- `gitleaks git`: history at that point (1 commit, ac47e8a, about 318 KB): **no leaks found.**
- `gitleaks dir`: the working tree with this evening's changes, including `node_modules` and the vendored OCR assets (about 26.8 MB): **no leaks found.**
- A final `gitleaks git` pass over both commits ran after the evening-2 commit. Its result is in BUILD-STATUS.md.

**Content audit.** Every commit was searched for the items below.

| Searched for | Result |
|---|---|
| Commit authors and committers | One identity only: `Spam Text Map <dev@spamtextmap.local>` |
| The real pilot town (the four live-prototype reports) | Absent. `test/intake-and-hygiene.test.ts` enforces this on every tracked file |
| The owner's name | One occurrence, in BUILD-STATUS.md (evening 1, the owner's name). Removed from the current tree in evening 2. Still present in commit ac47e8a until the squash |
| The owner's email, machine name, home-directory paths | One absolute home path in BUILD-STATUS.md (evening 1). Replaced with a relative path in evening 2. Still present in ac47e8a until the squash |
| Email addresses | Only `*@example.invalid`, `*.example` test fixtures, and the commit identity |
| Private IP addresses | One documentation example (`172.17.0.1`, Docker's default bridge) in docs/self-hosting.md. Not a secret |
| Fixtures (names, numbers, businesses) | All synthetic. Numbers are in the 555-01xx fiction range. Town is the invented "Fairview". Negative controls (`test/negative-controls.ts`) and scrub fixtures use invented names |
| Accounts or tokens | None. `.env` is gitignored. `.env.example` has no working key, and the app refuses to start without one |

**Action required at the flip:** squash to a fresh initial commit, as planned. This drops ac47e8a, which holds the two internal references above. Also decide whether BUILD-STATUS.md ships at all. It is an internal build log, and the recommendation is to delete it in the squash commit.
