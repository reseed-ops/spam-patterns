// Category enum. The reporter picks one; nothing in the message text can
// set it. Unknown is always allowed.

export const CATEGORIES = [
  ['unknown', 'Unknown'],
  ['roofing', 'Roofing'],
  ['lawn_landscaping', 'Lawn & landscaping'],
  ['tree_service', 'Tree service'],
  ['painting', 'Painting'],
  ['pressure_washing', 'Pressure washing'],
  ['gutters', 'Gutters'],
  ['windows_siding', 'Windows & siding'],
  ['hvac', 'Heating & cooling'],
  ['plumbing', 'Plumbing'],
  ['fencing', 'Fencing'],
  ['solar', 'Solar'],
  ['pest_control', 'Pest control'],
  ['cleaning', 'Cleaning'],
  ['other_home_service', 'Other home service'],
  ['home_buying_offer', 'Offer to buy your home'],
  ['package_delivery', 'Package or delivery notice'],
  ['account_alert', 'Bank or account alert'],
  ['prize_or_gift', 'Prize or gift'],
  ['political', 'Political'],
  ['other', 'Other'],
] as const;

export type Category = (typeof CATEGORIES)[number][0];
export const CATEGORY_VALUES: readonly Category[] = CATEGORIES.map((c) => c[0]);
export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES);

export function parseCategory(v: unknown): Category | null {
  if (v === undefined || v === null || v === '') return 'unknown';
  return typeof v === 'string' && (CATEGORY_VALUES as readonly string[]).includes(v) ? (v as Category) : null;
}
