// All interface dictionaries, merged. Keys are the English text (see src/i18n.ts).
// One file per area of the site:
//   core.ts     header, navigation, footer, switcher, error pages, dates
//   home.ts     overview (home), map, how it works, recurring scripts
//   report.ts   report flow, report complete, delete, API messages, categories
//   content.ts  patterns, pattern pages, data, methodology
//   privacy.ts  privacy, project, offline
//   guides.ts   junk mail, opt-out, scams
import { DICT_CORE } from './core.ts';
import { DICT_HOME, KEEP_HOME } from './home.ts';
import { DICT_REPORT, KEEP_REPORT } from './report.ts';
import { DICT_CONTENT, KEEP_CONTENT } from './content.ts';
import { DICT_PRIVACY, KEEP_PRIVACY } from './privacy.ts';
import { DICT_GUIDES, KEEP_GUIDES } from './guides.ts';
import type { Dict } from './types.ts';

export type { Dict, Entry } from './types.ts';

/** Each source dictionary by name (tests check every entry). */
export const DICTS: Record<string, Dict> = {
  core: DICT_CORE,
  home: DICT_HOME,
  report: DICT_REPORT,
  content: DICT_CONTENT,
  privacy: DICT_PRIVACY,
  guides: DICT_GUIDES,
};

export const DICT: Dict = Object.assign({}, ...Object.values(DICTS));

/** English kept on translated pages on purpose (proper names, samples); see each file. */
export const KEEP_ENGLISH: string[] = [...KEEP_HOME, ...KEEP_REPORT, ...KEEP_CONTENT, ...KEEP_PRIVACY, ...KEEP_GUIDES];
