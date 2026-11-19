// Common words that may start a sentence or appear in an all-caps message
// without being a name. Used by the scrubber's name rules:
//   - a capitalized word at a sentence start is kept only if it is listed here
//     (or in the scrubber's ALLOWED_CAPS); otherwise it is masked as a name;
//   - in an all-caps word, the same check applies case-insensitively.
// Over-masking is the intended failure direction. Adding a word here makes
// the scrubber keep it, so never add anything that is commonly a first name
// or surname unless it is far more often an ordinary word (see
// docs/threat-model.md, "Names that are also common words").
//
// English plus a small Spanish set. Lowercase, space-separated.

const EN = `
a about above across act actually add added address after afternoon again against ago ahead air alert alerts all almost
alone along already also always am amazing an and annual another answer any anyone anything anytime anyway apply
appointment appointments approved are area areas around as ask asked asking at attention available avoid away
back bad bank based be because become been before being below best better between big bill billing bills both bring
brand budget business busy but buy buyer buyers by
call called calling calls can can't cancel cannot car card care cash cause certain chance change charge check checked
checking choose city claim clean cleaned cleaning clear close closed come comes coming company complete completed
confirm confirmed confirming congrats congratulations contact cost costs could couldn't count crew crews current
currently customer customers
damage damaged date day days deal deals dear deliver delivered delivery details did didn't discount do does doesn't
doing don't done door down due during
each early easy either else email end ends enjoy enough enter entire estimate estimates even evening ever every
everyone everything exclusive expire expired expires exterior extra
fair family fast few final finally find fine finish finished first fix fixed follow following for found free fresh
friday friend from full funds further
get gets getting gift give given glad go going gone good got great guaranteed
had happy has hasn't have haven't having he he's hello help helping her here hey hi high him his hold home homeowner
homes hope hoping hot hour hours house houses how however
i i'd i'll i'm i've if important in inc included info information inside inspection instant instead interest interested
into is isn't it it's its
job jobs just
keep kind know
last late later least leave left less let let's like limited line little live local look looking lot lots love low
made mail make making many market maybe me message might mind minute minutes miss missed money month monthly months
more morning most move much must my
name near nearby need needed needs neighbor neighborhood neighbors never new next nice no none not note nothing notice
now number
of off offer offered offering offers office oh ok okay old on once one only open opt or order other our out outside
over own
paid past pay payment people per perfect pending phone pick place plan please plus point possible pre price prices
pricing pro problem process project property
qualify qualified question questions quick quote quotes
rate rates ready real really reason receive received recent recently reminder remove repair repairs replace reply
request required reschedule respond response right roof roofs room rooms
safe said sale same save saw schedule scheduled season second secure see seen sell selling send sent service services
set several she should show sign since small so some someone something soon sorry special spot start started stay
still stop street sure
take taking team tell than thank thanks that that's the their them then there there's these they they're thing
things think thinking this those though through time times to today together tomorrow tonight too top total trying
two
under unless until up update upon urgent us use used
valid value verify very via visit
wait want wanted wanting was way we we'd we'll we're we've week weekend weeks welcome well went were what what's
when where whether which while who who's whole why will winter with within without won't work worked working
would wouldn't wrapped
year years yes yet you you'd you'll you're you've your yours
`;

// Spanish (common message words; accents included as typed).
const ES = `
a al algo alguien aquí ahora antes así atentamente aviso ayuda
bien buen buena buenas bueno buenos
cada casa casas cerca cita clientes como cómo con confirmar contacto cuando cuenta
de del desde después día días donde dónde
el él ella ellos en entonces es esta está estamos están este esto estos
favor feliz fin gracias gratis gratuita gratuito
hace hasta hay hoy hola
interesa interesado interesada
la las le les llame llamar lo los
mañana más me mensaje mi mis mucho muy
nada no nos nosotros nuestra nuestro nuestros número
o oferta ofertas otra otro
para pero por porque precio precios pregunta pronto puede puedo
que qué quiere quisiera
responda responder
saludos se semana ser servicio servicios si sí sin solo somos son su sus
también tenemos tiene todo todos trabajo trabajamos
un una uno usted ustedes
y ya yo
`;

export const COMMON_WORDS: ReadonlySet<string> = new Set(
  `${EN} ${ES}`
    .split(/\s+/)
    .filter(Boolean),
);

// Acronyms that may appear in capitals in an ordinary mixed-case message.
// Any other all-caps word that is not a common word is masked as a name.
export const ACRONYMS: ReadonlySet<string> = new Set(
  'US USA AC HVAC LLC INC FREE STOP YES NO OK USPS UPS DHL IRS HOA DMV FAQ PIN OTP ASAP TV AM PM PST EST CST MST ATT SMS MMS TXT MSG FYI LED EV'.split(
    ' ',
  ),
);
