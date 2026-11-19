# Rules changelog

Spam Patterns versions two rule sets separately. Both versions are constants in code and are shown on `/methodology` ("Redaction rules v1 · Matching rules v1").

| Rule set | Constant | Covers |
|---|---|---|
| Redaction rules | `REDACTION_RULES_VERSION` in `src/scrub.ts` | Everything that turns submitted text into the stored masked template: normalization, thread reduction, reporter removals, the masks, and the common-word and acronym lists |
| Matching rules | `MATCHING_RULES_VERSION` in `src/patterns.ts` | The three tiers, eligibility (`counted`, not deleted), the 3-report threshold, the near-duplicate settings (3-word shingles, 64-way MinHash, similarity 0.6 to the leader), and skeleton grammar v1 with its stop list |

Bump a version in the same change that alters its behavior, and add an entry here. Skeleton grammar keeps its own version (`SKELETON_GRAMMAR_VERSION`), which is part of the matching rules. A grammar change is therefore also a matching-rules change.

The matching rules version is part of every review fingerprint (see [pattern-review.md](pattern-review.md)). Bumping it sends every published or rejected pattern back to review.

## Redaction rules

### v1 (2026-11-19)
Named as the rules already in use. These are the rules shipped through v0.1.4, including the v0.1.1 screenshot OCR fix and the v0.1.2 screenshot junk-tail handling. No behavior change.

## Matching rules

### v1 (2026-11-19)
Named as the rules already in use: exact, near and formula tiers, the 3-report eligibility threshold, and skeleton grammar v1. No behavior change.

The v0.1.5 review gate is a **publication-workflow change, not a matching change**. Clusters are computed exactly as before. Reaching 3 eligible reports now makes a cluster *pending* review instead of publishing it, and an operator decides whether it is published. The matching rules stay at v1.
