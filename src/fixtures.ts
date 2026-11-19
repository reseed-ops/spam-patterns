// SYNTHETIC fixtures only. Every persona, business, town and message here
// is invented. Numbers use the 555-0100..0199 range reserved for fiction.
// Never add real reports, real names, or real numbers to this file.

export const SYNTHETIC_TOWN = 'Fairview';

export interface Fixture {
  number: string;
  message: string;
  category: string;
  city?: string;
  daysAgo: number;
}

/** Three identical messages from different numbers: tier "identical message". */
export const EXACT_SET: Fixture[] = [
  { number: '(214) 555-0101', message: 'USPS: Your package is on hold due to an incomplete address. Update it at usps-redelivery-help.com within 24 hours.', category: 'package_delivery', daysAgo: 12 },
  { number: '(305) 555-0102', message: 'USPS: Your package is on hold due to an incomplete address. Update it at usps-redelivery-help.com within 24 hours.', category: 'package_delivery', daysAgo: 11 },
  { number: '(602) 555-0103', message: 'USPS: Your package is on hold due to an incomplete address. Update it at usps-redelivery-help.com within 24 hours.', category: 'package_delivery', daysAgo: 9 },
];

/** Lightly edited versions of one message: tier "same message, lightly edited". */
export const NEAR_SET: Fixture[] = [
  { number: '(312) 555-0111', message: 'Alert: we noticed an unusual sign-in on your bank account today. If this was not you, verify your identity now at secure-verify-portal.net to avoid a hold.', category: 'account_alert', daysAgo: 8 },
  { number: '(404) 555-0112', message: 'Alert: we noticed an unusual sign-in on your bank account this morning. If this was not you, verify your identity now at secure-verify-portal.net to avoid a hold.', category: 'account_alert', daysAgo: 7 },
  { number: '(503) 555-0113', message: 'Alert: we noticed an unusual sign-in on your bank account today. If this was not you, please verify your identity now at secure-verify-portal.net to avoid a hold.', category: 'account_alert', daysAgo: 6 },
];

/**
 * The generic home-services script shape: greeting with the recipient's
 * name, a first-name persona, a local claim, a trade, an offer, a question.
 * Four different trades, personas and wordings, NO two templates identical
 * or near-identical: tier "shared script pattern" only.
 */
export const FORMULA_SET: Fixture[] = [
  { number: '(469) 555-0121', message: `Hi Jordan, Avery here. I've been helping a few neighbors over in ${SYNTHETIC_TOWN} lately. Is your roof due for a look? I can come by and give you a free estimate. Would that work for you?`, category: 'roofing', city: SYNTHETIC_TOWN, daysAgo: 5 },
  { number: '(817) 555-0122', message: `Hey Casey! This is Rowan. We are a small local crew working homes in ${SYNTHETIC_TOWN} this month. Thinking about getting the lawn and beds cleaned up before winter? Glad to send a no obligation quote. Want one?`, category: 'lawn_landscaping', city: SYNTHETIC_TOWN, daysAgo: 4 },
  { number: '(972) 555-0123', message: `Hello Morgan, it's Quinn. Our team just wrapped some jobs near you in ${SYNTHETIC_TOWN}. Any trees on your lot needing trimming? Happy to price it out for free, any interest?`, category: 'tree_service', city: SYNTHETIC_TOWN, daysAgo: 3 },
  { number: '(682) 555-0124', message: `Good morning Taylor, Emery here! Working on several houses in ${SYNTHETIC_TOWN} right now. If the trim or siding could use some exterior painting I would love to put together a free quote. Interested?`, category: 'painting', city: SYNTHETIC_TOWN, daysAgo: 2 },
];

/**
 * Appointment-reminder style texts: they share a generic skeleton that
 * ordinary, legitimate messages produce. Stop-skeleton: must NOT surface.
 */
export const STOP_SET: Fixture[] = [
  { number: '(615) 555-0131', message: 'Hi Riley, this is Dana confirming your carpet cleaning appointment for tomorrow morning. Reply C to confirm.', category: 'cleaning', daysAgo: 6 },
  { number: '(704) 555-0132', message: 'Hello Sam, it is Jesse from the office. Your furnace tune-up is scheduled for Friday. Can you still make it?', category: 'hvac', daysAgo: 5 },
  { number: '(919) 555-0133', message: 'Hey Alex, Parker here, just checking that the window washing visit on Monday still works. Text back yes or no.', category: 'windows_siding', daysAgo: 4 },
];

export const SINGLES: Fixture[] = [
  { number: '(713) 555-0141', message: 'Congratulations! You have been selected for a $500 gift card. Claim at prize-claim-now.top before it expires.', category: 'prize_or_gift', daysAgo: 10 },
  { number: '(206) 555-0142', message: 'We buy houses in any condition for cash. Close in 7 days. Reply YES for a fair offer.', category: 'home_buying_offer', daysAgo: 1 },
  { number: '(800) 555-0143', message: 'Your auto warranty is about to expire. Call us today to keep your coverage.', category: 'other', daysAgo: 1 },
];

export const ALL_FIXTURES: Fixture[] = [...EXACT_SET, ...NEAR_SET, ...FORMULA_SET, ...STOP_SET, ...SINGLES];
