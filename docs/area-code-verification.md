# Area-code data verification

`data/area-codes.json` is **generated** from the NANPA NPA database by `scripts/verify-area-codes.mjs`. It is not transcribed by hand.

## How to re-verify

```bash
curl -sL https://reports.nanpa.com/public/npa_report.csv -o /tmp/npa_report.csv   # linked from https://www.nanpa.com/reports/npa-reports
node scripts/verify-area-codes.mjs /tmp/npa_report.csv           # prints the delta; exits 1 if the data differs
node scripts/verify-area-codes.mjs /tmp/npa_report.csv --write   # regenerates data/area-codes.json
```

Scope: in-service US geographic codes (50 states, DC, PR, VI, GU, AS, CNMI) and in-service toll-free codes. Canada, the Caribbean and non-geographic services (5XX, 710 and others) are out of scope. Codes that are assigned but not yet in service are reported but not included.

## Verification record, 2026-11-17 (evening 2)

- **Source:** NANPA NPA database CSV, `https://reports.nanpa.com/public/npa_report.csv`, file date 11/17/2026, SHA-256 `640c8a39405819194057d05af8ad6b164cea799d7c17feee2863bdbe90aea3a8`. Fetched from nanpa.com (NANPA's current site). The old `nationalnanpa.com` host does not resolve from this machine.
- **Before:** 374 codes. The evening-1 data was transcribed and cross-checked against the MIT `us-area-codes` package, with about 28 newer overlays added from memory.
- **NANPA in scope:** 385 codes.

| Change | Count | Codes |
|---|---|---|
| Added (in service per NANPA, missing from our data) | 11 | 457 LA, 465 NY, 483 AL, 621 TX, 729 TN, 738 CA, 748 CO, 771 DC, 821 SC, 837 CA, 924 MN |
| Removed (in our data, not in service per NANPA) | 0 | none |
| Re-anchored (state or kind differed) | 0 | none |
| Assigned, not yet in service (not included) | 3 | 451 NC (in service 2028-09-21), 565 GA (2027-12-06), 761 KY (no date) |

Every one of the 374 existing entries, including the ~28 overlays added from memory, matched NANPA on state and kind. The 11 additions were applied. **Nothing in the shipped file is now unverified.** After regeneration, the script reports a zero delta.

Re-run this before Decision A, and whenever NANPA announces a new overlay. 451 and 565 enter service in 2027–2028.
