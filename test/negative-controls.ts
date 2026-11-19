// Negative controls for skeleton grammar v1. SYNTHETIC: every person,
// business and number is invented; numbers use the 555-01xx fiction range.
// These are legitimate texts a household also receives. None of them may
// cluster with the spam formula, and no skeleton they share across classes
// may surface as a public pattern. See BUILD-STATUS.md (evening 2) for the
// measured false-positive rates before and after stop-list tuning.

export type NegativeClass = 'quote_followup' | 'appointment_reminder' | 'delivery_notice' | 'home_service_ad' | 'community';

export const NEGATIVE_CONTROLS: Record<NegativeClass, string[]> = {
quote_followup: [
"Hi Dana, this is Marcus with Ridgeline Roofing following up on the estimate we sent Tuesday for your roof repair. Let me know if you have any questions.",
"Hello Mr. Patel, Sofia from Clearview Windows here. Attached is the revised quote for the six windows we measured. Do you want to move forward?",
"Hey Jordan, it's Luis. Just checking in on the fence quote from last week. We can start on the 14th if that works for you?",
"Hi Karen, this is Tom from Evergreen Lawn. Your quote for weekly mowing is $45 per visit. Reply YES to get on the schedule.",
"Good afternoon Mrs. Lee, this is Andre with Summit Painting. Thanks for having us out yesterday. The estimate for the interior painting is in your email. Any questions?",
"Hi Beth, Carlos here from the plumbing company. Wanted to follow up on the water heater quote. Would you like to book the install?",
"Hi Sam, it's Nina at BrightSide Solar. Following up on the proposal for your home. Are you still interested in the 8 kW system?",
"Hello Greg, this is Pat from Oakwood Fencing. Your neighbor on Birch Lane referred you and we sent the quote this morning. Happy to answer questions, just reply here.",
"Hi Lena, it's Omar from the gutter crew. We finished the job next door and had a cancellation Friday, so we could do your gutter guards then at the price we quoted. Want the slot?",
"Hi Ruth, this is Kevin with Lakeside Concrete. Per our call, the driveway estimate is $3,200. Let me know if you want to proceed.",
],
appointment_reminder: [
"Reminder: your HVAC tune-up with Polar Air is scheduled for Thursday between 8 and 10 AM. Reply C to confirm or R to reschedule.",
"Hi Jamie, this is Coastal Pest Control confirming your quarterly treatment tomorrow at 9am. Reply YES to confirm.",
"Hello Chris, your carpet cleaning appointment is set for Saturday at 1 PM. Our technician Mike will call when on the way. Need to reschedule?",
"Hi Taylor, Dr. Owens' dental office reminding you of your cleaning on Mon 3/4 at 2:30. Reply C to confirm.",
"Hi Morgan, Greenway Landscaping will be at your property Friday for the spring cleanup. Please unlock the side gate. Questions? Call us.",
"Hey Riley, it's Dana from Sparkle Pools. Your pool opening is on the calendar for May 2. Does that still work?",
"Hi Pat, this is Jess with Northside Roofing. Our crew will be in your area Monday to finish the shingle repair we quoted. Will the driveway be clear?",
"Hello Avery, Brian from the window company here. Your free in-home measurement is tomorrow at 10. Reply 1 to confirm or 2 to reschedule.",
],
delivery_notice: [
"FedEx: Your package 7712 is scheduled for delivery today by 8pm. Track at fedex.com/track",
"Amazon: Your order of roofing shingles was delivered to your front porch.",
"Hi Alex, this is your Lowe's delivery driver. I'm about 20 minutes away with your new washer. Will someone be home?",
"UPS: Your delivery from Ace Hardware will arrive tomorrow between 10:00 AM and 2:00 PM. Reply STOP to opt out.",
"Your Wayfair order (patio set) is out for delivery. Our driver will text when nearby.",
"Hello! Your Sherwin-Williams paint order is ready for pickup at the store. Reply HELP for help.",
"Hi Sam, Mateo with Valley Lumber here. Your deck boards will be dropped off in your driveway this afternoon. Any gate code we need?",
"Hi Jordan, this is Tasha from Metro Appliance. Your new furnace filter shipment is out for delivery to your neighborhood today. Questions? Reply here.",
],
home_service_ad: [
"Evergreen Lawn: Spring special! 20% off aeration for returning customers through April 30. Book at evergreenlawn.com. Reply STOP to opt out.",
"Polar Air: Beat the heat. $79 AC tune-up special this month only. Call 555-0188 to schedule. Txt STOP to end.",
"Ridgeline Roofing: Storm season is here. Free roof inspections for all customers this week. Reply YES to book.",
"Sparkle Pools: Pool closing slots are filling up. Save 10% when you book online before Sept 15.",
"Home Depot: This weekend only, save on paint and stain. Shop in store or online.",
"Clearview Windows: Our fall sale is on. Get a free in-home estimate and 0% financing. Questions? Reply here.",
"Hi from Lakeside Concrete! We are now serving your neighborhood with driveway and patio work. Free estimates all month. Reply YES for a quote.",
"Hello neighbor! Local family-owned tree service here, offering free estimates on trimming and removal this fall. Interested?",
],
community: [
"Hi everyone, this is Jen from the neighborhood group. Does anyone have a good roofer to recommend? Need a quote for hail damage.",
"Hi neighbors! Our HOA landscaping committee is collecting quotes for the common area trees. Any recommendations?",
"Hey Mike, it's Carol next door. The painter who did our house gave us a great price. Want his number?",
],
};
