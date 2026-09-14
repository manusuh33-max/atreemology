// Etymon — the rest of the roadmap.
//
// These roots are not planted, and never contribute quiz or lesson content
// yet — they're the "coming soon" shelf of the Seed Library, showing the
// scope of a full Greco-Latin root curriculum without pretending any of it
// is authored and verified yet. Title and core meaning are standard,
// textbook etymology; origin language has been checked root-by-root rather
// than defaulted, and no per-word claims are made here at all — that's the
// bar a root has to clear before it moves into src/data/roots.js for real.
//
// tier mirrors the difficulty banding used for the live roots.

/**
 * @typedef {Object} ComingSoonRoot
 * @property {string} title
 * @property {string} meaning
 * @property {string} origin
 * @property {string} tier
 */

/** @type {ComingSoonRoot[]} */
export const COMING_SOON_ROOTS = [
  { title: 'a / an', meaning: 'not, without', origin: 'Greek', tier: 'Beginner' },
  { title: 'ab / abs', meaning: 'away, from', origin: 'Latin', tier: 'Beginner' },
  { title: 'ad / ac / af / ag / al / ap / as / at', meaning: 'to, toward', origin: 'Latin', tier: 'Beginner' },
  { title: 'ambi / amphi', meaning: 'both, around', origin: 'Latin & Greek', tier: 'Beginner' },
  { title: 'ante', meaning: 'before', origin: 'Latin', tier: 'Beginner' },
  { title: 'anti', meaning: 'against, opposite', origin: 'Greek', tier: 'Beginner' },
  { title: 'auto', meaning: 'self', origin: 'Greek', tier: 'Beginner' },
  { title: 'bi / duo', meaning: 'two', origin: 'Latin', tier: 'Beginner' },
  { title: 'brev', meaning: 'short', origin: 'Latin', tier: 'Beginner' },
  { title: 'cap / capt / cept / cip', meaning: 'take, seize, receive', origin: 'Latin', tier: 'Beginner' },
  { title: 'ced / ceed / cess', meaning: 'go, yield', origin: 'Latin', tier: 'Beginner' },
  { title: 'circum', meaning: 'around', origin: 'Latin', tier: 'Beginner' },
  { title: 'claim / clam', meaning: 'cry out, shout', origin: 'Latin', tier: 'Beginner' },
  { title: 'clud / clus / close', meaning: 'shut, close', origin: 'Latin', tier: 'Beginner' },
  { title: 'cogn / gnos / know', meaning: 'know', origin: 'Latin & Greek', tier: 'Beginner' },
  { title: 'con / com / co / col / cor', meaning: 'with, together', origin: 'Latin', tier: 'Beginner' },
  { title: 'contra / counter', meaning: 'against', origin: 'Latin', tier: 'Beginner' },
  { title: 'corp', meaning: 'body', origin: 'Latin', tier: 'Beginner' },
  { title: 'cur / curs', meaning: 'run', origin: 'Latin', tier: 'Beginner' },
  { title: 'de', meaning: 'down, away, reverse', origin: 'Latin', tier: 'Beginner' },
  { title: 'dyn / dynam', meaning: 'power', origin: 'Greek', tier: 'Intermediate' },
  { title: 'e / ex / ef', meaning: 'out, from', origin: 'Latin', tier: 'Intermediate' },
  { title: 'equ / equi', meaning: 'equal, even', origin: 'Latin', tier: 'Intermediate' },
  { title: 'fer', meaning: 'carry, bear', origin: 'Latin', tier: 'Intermediate' },
  { title: 'fid', meaning: 'faith, trust', origin: 'Latin', tier: 'Intermediate' },
  { title: 'fin', meaning: 'end, boundary', origin: 'Latin', tier: 'Intermediate' },
  { title: 'flex / flect', meaning: 'bend', origin: 'Latin', tier: 'Intermediate' },
  { title: 'form', meaning: 'shape', origin: 'Latin', tier: 'Intermediate' },
  { title: 'fract / frag', meaning: 'break', origin: 'Latin', tier: 'Intermediate' },
  { title: 'geo', meaning: 'earth', origin: 'Greek', tier: 'Intermediate' },
  { title: 'grad / gress', meaning: 'step, go', origin: 'Latin', tier: 'Intermediate' },
  { title: 'hydr', meaning: 'water', origin: 'Greek', tier: 'Intermediate' },
  { title: 'hypo', meaning: 'under, below', origin: 'Greek', tier: 'Intermediate' },
  { title: 'hyper', meaning: 'over, beyond', origin: 'Greek', tier: 'Intermediate' },
  { title: 'in / im / il / ir', meaning: 'not, into', origin: 'Latin', tier: 'Intermediate' },
  { title: 'inter', meaning: 'between, among', origin: 'Latin', tier: 'Intermediate' },
  { title: 'intro', meaning: 'within, inward', origin: 'Latin', tier: 'Intermediate' },
  { title: 'jud / jur / just', meaning: 'law, right, judge', origin: 'Latin', tier: 'Intermediate' },
  { title: 'labor', meaning: 'work', origin: 'Latin', tier: 'Intermediate' },
  { title: 'lev', meaning: 'light, lift', origin: 'Latin', tier: 'Intermediate' },
  { title: 'liber', meaning: 'free', origin: 'Latin', tier: 'Intermediate' },
  { title: 'loc', meaning: 'place', origin: 'Latin', tier: 'Intermediate' },
  { title: 'log / logue', meaning: 'word, reason, study', origin: 'Greek', tier: 'Intermediate' },
  { title: 'luc / lum / lus', meaning: 'light', origin: 'Latin', tier: 'Intermediate' },
  { title: 'manu', meaning: 'hand', origin: 'Latin', tier: 'Intermediate' },
  { title: 'mar / mer', meaning: 'sea', origin: 'Latin', tier: 'Intermediate' },
  { title: 'mater / matr', meaning: 'mother', origin: 'Latin', tier: 'Intermediate' },
  { title: 'micro', meaning: 'small', origin: 'Greek', tier: 'Intermediate' },
  { title: 'macro', meaning: 'large, long', origin: 'Greek', tier: 'Intermediate' },
  { title: 'meter / metr', meaning: 'measure', origin: 'Greek', tier: 'Intermediate' },
  { title: 'min', meaning: 'small, lessen', origin: 'Latin', tier: 'Intermediate' },
  { title: 'mis / mit', meaning: 'send', origin: 'Latin', tier: 'Intermediate' },
  { title: 'mob / mot / mov', meaning: 'move', origin: 'Latin', tier: 'Intermediate' },
  { title: 'multi', meaning: 'many', origin: 'Latin', tier: 'Intermediate' },
  { title: 'nat / nasc', meaning: 'be born', origin: 'Latin', tier: 'Intermediate' },
  { title: 'neo', meaning: 'new', origin: 'Greek', tier: 'Intermediate' },
  { title: 'nom / nym', meaning: 'name', origin: 'Latin & Greek', tier: 'Intermediate' },
  { title: 'nov', meaning: 'new', origin: 'Latin', tier: 'Intermediate' },
  { title: 'omni', meaning: 'all', origin: 'Latin', tier: 'Intermediate' },
  { title: 'pac / peace', meaning: 'peace', origin: 'Latin', tier: 'Intermediate' },
  { title: 'path / pass', meaning: 'feeling, suffering', origin: 'Greek', tier: 'Intermediate' },
  { title: 'ped / pod', meaning: 'foot', origin: 'Latin & Greek', tier: 'Intermediate' },
  { title: 'photo', meaning: 'light', origin: 'Greek', tier: 'Advanced' },
  { title: 'pos / pon', meaning: 'put, place', origin: 'Latin', tier: 'Advanced' },
  { title: 'pre', meaning: 'before', origin: 'Latin', tier: 'Advanced' },
  { title: 'pro', meaning: 'forward, for', origin: 'Latin & Greek', tier: 'Advanced' },
  { title: 'psych', meaning: 'mind, soul', origin: 'Greek', tier: 'Advanced' },
  { title: 'rupt', meaning: 'break', origin: 'Latin', tier: 'Advanced' },
  { title: 'sect / sec', meaning: 'cut', origin: 'Latin', tier: 'Advanced' },
  { title: 'sens / sent', meaning: 'feel, perceive', origin: 'Latin', tier: 'Advanced' },
  { title: 'sequ / secute', meaning: 'follow', origin: 'Latin', tier: 'Advanced' },
  { title: 'spir', meaning: 'breathe', origin: 'Latin', tier: 'Advanced' },
  { title: 'sub / suc / suf / sug / sup / sus', meaning: 'under, below', origin: 'Latin', tier: 'Advanced' },
  { title: 'super / supra', meaning: 'above, over', origin: 'Latin', tier: 'Advanced' },
  { title: 'syn / sym', meaning: 'with, together', origin: 'Greek', tier: 'Advanced' },
  { title: 'temp / tempor', meaning: 'time', origin: 'Latin', tier: 'Advanced' },
  { title: 'ten / tain / tin', meaning: 'hold', origin: 'Latin', tier: 'Advanced' },
  { title: 'terr', meaning: 'earth, land', origin: 'Latin', tier: 'Advanced' },
  { title: 'therm', meaning: 'heat', origin: 'Greek', tier: 'Advanced' },
  { title: 'trans', meaning: 'across, beyond', origin: 'Latin', tier: 'Advanced' },
  { title: 'vac / vacu', meaning: 'empty', origin: 'Latin', tier: 'Advanced' },
  { title: 'ven / vent', meaning: 'come', origin: 'Latin', tier: 'Advanced' },
];
