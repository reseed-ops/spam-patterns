// Sender number handling. The full number exists only inside this call
// chain: it is normalized, used to derive the area code, the prefix (NXX)
// and the internal HMAC token, then dropped. It is never returned, logged,
// or persisted.

import { lookupAreaCode, type AreaCodeInfo } from './areacodes.ts';

export interface ParsedNumber {
  /** 10 NANP digits. Transient: callers must not persist or return it. */
  digits: string;
  areaCode: string;
  prefix: string;
  areaInfo: AreaCodeInfo;
}

export type PhoneError =
  | 'missing'
  | 'bad_characters'
  | 'wrong_length'
  | 'not_nanp'
  | 'unsupported_area_code';

export const PHONE_ERROR_TEXT: Record<PhoneError, string> = {
  missing: 'Enter the sender number shown in the text.',
  bad_characters: 'Use only digits, spaces, dashes, dots, parentheses, and an optional +1.',
  wrong_length: 'Enter a 10-digit US number, with or without +1.',
  not_nanp: 'This does not look like a valid US number. Check the area code and the next three digits.',
  unsupported_area_code:
    'This area code is not a supported US area code. Only US numbers are supported in this version.',
};

export function parseSenderNumber(input: unknown): ParsedNumber | { error: PhoneError } {
  if (typeof input !== 'string' || input.trim() === '') return { error: 'missing' };
  if (input.length > 40) return { error: 'wrong_length' };
  const s = input.trim();
  if (!/^\+?[\d\s().\-]+$/.test(s)) return { error: 'bad_characters' };
  let digits = s.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  else if (s.startsWith('+') && !s.startsWith('+1')) return { error: 'not_nanp' };
  if (digits.length !== 10) return { error: 'wrong_length' };
  const areaCode = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  // NANP: NPA and NXX both start with 2-9; N11 codes are service codes.
  if (!/^[2-9]\d\d$/.test(areaCode) || !/^[2-9]\d\d$/.test(prefix)) return { error: 'not_nanp' };
  if (/^\d11$/.test(areaCode) || /^\d11$/.test(prefix)) return { error: 'not_nanp' };
  const areaInfo = lookupAreaCode(areaCode);
  if (!areaInfo) return { error: 'unsupported_area_code' };
  return { digits, areaCode, prefix, areaInfo };
}
