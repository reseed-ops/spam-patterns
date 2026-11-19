import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type AreaKind = 'geographic' | 'territory' | 'toll_free';

export interface AreaCodeInfo {
  code: string;
  /** Numbering-plan reference region (state or territory), never a location claim. */
  region: string;
  state: string | null;
  kind: AreaKind;
}

interface AreaFile {
  _source: string;
  _version: string;
  codes: Record<string, { region: string; state: string | null; kind: AreaKind }>;
}

const file = JSON.parse(
  readFileSync(fileURLToPath(new URL('../data/area-codes.json', import.meta.url)), 'utf8'),
) as AreaFile;

export const AREA_CODE_SOURCE = file._source;
export const AREA_CODE_VERSION = file._version;

export function lookupAreaCode(code: string): AreaCodeInfo | null {
  const e = file.codes[code];
  return e ? { code, ...e } : null;
}

export function allAreaCodes(): AreaCodeInfo[] {
  return Object.entries(file.codes).map(([code, e]) => ({ code, ...e }));
}
