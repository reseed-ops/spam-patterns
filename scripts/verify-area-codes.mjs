// Verify data/area-codes.json against the NANPA NPA database CSV.
//
//   curl -sL https://reports.nanpa.com/public/npa_report.csv -o /tmp/npa_report.csv
//   node scripts/verify-area-codes.mjs /tmp/npa_report.csv            # print the delta, exit 1 if any
//   node scripts/verify-area-codes.mjs /tmp/npa_report.csv --write    # regenerate the JSON from NANPA
//
// Scope: in-service US geographic codes (states, DC, territories) and the
// in-service toll-free codes. Canada, the Caribbean and other non-geographic
// services are out of scope for this US area-code product.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const [csvPath, ...flags] = process.argv.slice(2);
if (!csvPath) {
  console.error('usage: node scripts/verify-area-codes.mjs <npa_report.csv> [--write]');
  process.exit(2);
}
const write = flags.includes('--write');
const jsonPath = fileURLToPath(new URL('../data/area-codes.json', import.meta.url));

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

const rows = parseCsv(readFileSync(csvPath, 'utf8'));
const fileDate = rows[0][0] === 'File Date' ? rows[0][1] : 'unknown';
const header = rows[1];
if (!header || !header.includes('NPA_ID') || !header.includes('LOCATION')) {
  console.error('not a NANPA NPA database CSV (missing NPA_ID / LOCATION header)');
  process.exit(2);
}
const recs = rows.slice(2).filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((k, i) => [k, r[i] ?? ''])));

const NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};
const TERRITORIES = { PR: 'Puerto Rico', VI: 'US Virgin Islands', GU: 'Guam', AS: 'American Samoa', CNMI: 'CNMI' };
const TERRITORY_CODE = { CNMI: 'MP' };

const expected = {};
const unmapped = [];
for (const r of recs) {
  if (r.IN_SERVICE !== 'Y') continue;
  if (r.COUNTRY === 'US' && r.USE === 'G') {
    const loc = r.LOCATION.trim();
    if (NAMES[loc]) expected[r.NPA_ID] = { region: NAMES[loc], state: loc, kind: 'geographic' };
    else if (TERRITORIES[loc]) expected[r.NPA_ID] = { region: TERRITORIES[loc], state: TERRITORY_CODE[loc] ?? loc, kind: 'territory' };
    else unmapped.push(`${r.NPA_ID} (${loc})`);
  } else if (/^toll-free$/i.test(r.SERVICE.trim())) {
    expected[r.NPA_ID] = { region: 'Toll-free (non-geographic)', state: null, kind: 'toll_free' };
  }
}
const planned = recs
  .filter((r) => r.COUNTRY === 'US' && r.USE === 'G' && r.ASSIGNED === 'Yes' && r.IN_SERVICE !== 'Y')
  .map((r) => `${r.NPA_ID} ${r.LOCATION}${r.IN_SERVICE_DT ? ' (in service ' + r.IN_SERVICE_DT + ')' : ' (no date)'}`);

const current = JSON.parse(readFileSync(jsonPath, 'utf8'));
const have = current.codes;
const added = [], removed = [], reanchored = [];
for (const [code, e] of Object.entries(expected)) {
  if (!have[code]) added.push(`${code} ${e.region}`);
  else if (have[code].state !== e.state || have[code].kind !== e.kind)
    reanchored.push(`${code} ${have[code].region}/${have[code].kind} -> ${e.region}/${e.kind}`);
}
for (const [code, e] of Object.entries(have)) if (!expected[code]) removed.push(`${code} ${e.region}`);

const out = [
  `NANPA NPA database file date: ${fileDate}`,
  `in scope (NANPA): ${Object.keys(expected).length}   in data/area-codes.json: ${Object.keys(have).length}`,
  `added (${added.length}): ${added.join(', ') || 'none'}`,
  `removed (${removed.length}): ${removed.join(', ') || 'none'}`,
  `re-anchored (${reanchored.length}): ${reanchored.join(', ') || 'none'}`,
  `assigned, not yet in service (not included): ${planned.join(', ') || 'none'}`,
  `unmapped US locations: ${unmapped.join(', ') || 'none'}`,
];
console.log(out.join('\n'));

if (write) {
  const sorted = Object.fromEntries(Object.keys(expected).sort().map((k) => [k, expected[k]]));
  const doc = {
    _source:
      'Generated from the NANPA NPA database CSV (https://reports.nanpa.com/public/npa_report.csv, linked from https://www.nanpa.com/reports/npa-reports) by scripts/verify-area-codes.mjs. Scope: in-service US geographic codes (states, DC, territories) and in-service toll-free codes. Area-code assignment is a numbering-plan fact, not a sender location. Corrections welcome (see CONTRIBUTING.md).',
    _version: `nanpa-${isoDate(fileDate)}`,
    codes: sorted,
  };
  writeFileSync(jsonPath, JSON.stringify(doc, null, 1) + '\n');
  console.log(`wrote ${jsonPath}`);
} else if (added.length || removed.length || reanchored.length) {
  process.exit(1);
}

function isoDate(d) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(d);
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : d;
}
