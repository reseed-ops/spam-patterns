# Aggregate data release spec (v1, not yet released)

**Status:** There is no feed. Nothing has been released. Releasing data is a separate decision (Decision C). Until it is made, `/data` serves this schema and explains the empty state.

There will never be a report-level feed: no rows, no hashes, no prefixes, no fingerprints tied to reports, and no combinations of city and hour.

## Contents of a release

A release is a single JSON document (schema at `/data/schema.json`) with four **separate marginals**. They are never joined into cross-tabs:

- `by_area_code`: report counts per sender area code (claimed origin)
- `by_category`: counts per category enum value
- `by_skeleton`: counts per formula skeleton string, with `grammar_version`
- `by_day`: counts per UTC day

## Rules (all required before any release)

1. **Minimum bucket of 10.** Any bucket under 10 reports is omitted.
2. **7-day delay.** A report becomes eligible 7 days after filing. `latest_included_day` is at least 7 days before `generated_day`.
3. **Day granularity or coarser.** Never hour.
4. **Differencing check.** Before publishing, compare the new release with every prior release. No suppressed bucket may be derivable by subtraction, either between releases or across marginals. If one is, coarsen or withhold.
5. **Deletion.** Deleted reports are excluded from every future release. The page states that copies already downloaded cannot be recalled.
6. **Eligibility.** The same rule as the live site: the report exists and is not a short-window duplicate.
7. **Notice.** Every release carries this text verbatim: "No warranty of accuracy. Area codes are claimed origin. A listing is not an allegation against any person or business. Reports are voluntary submissions and counts do not measure spam prevalence."
8. **License.** CC0, only to the extent Reseed and submitters hold rights. Templates and spammers' wording are never released.

## Versioning

`schema_version` changes only on breaking changes. `grammar_version` follows the skeleton grammar, and skeleton keys are comparable only within one grammar version.

## Not implemented in v0.1

The release generator and the differencing checker. Both are planned before Decision C.
