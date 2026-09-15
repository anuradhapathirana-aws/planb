import {
  Award,
  BedDouble,
  BookOpen,
  Briefcase,
  Building2,
  Car,
  Compass,
  FileText,
  GraduationCap,
  Handshake,
  HardHat,
  IdCard,
  Landmark,
  Languages,
  Layers,
  Luggage,
  Mic,
  Palette,
  Plane,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stamp,
  Stethoscope,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from '@/components/icons';
import type { CourseCategoryIconName } from '@shared/types/course';

/**
 * What each course category icon an admin picks *means* → the glyph that draws it.
 *
 * **Must stay identical to `web/src/features/admin/courseCategories/
 * courseCategoryIcons.ts`**, which draws the admin picker: the admin is choosing
 * what a student sees here, so the two maps showing different pictures would
 * make the field a guess. `Record<CourseCategoryIconName, …>` makes a missing
 * entry a compile error rather than a blank tile.
 */
const CHOSEN: Record<CourseCategoryIconName, LucideIcon> = {
  migration: Plane,
  language: Languages,
  career: Briefcase,
  interview: Mic,
  writing: FileText,
  legal: ShieldCheck,
  culture: Building2,
  finance: Landmark,
  healthcare: Stethoscope,
  hospitality: UtensilsCrossed,
  construction: HardHat,
  technical: Wrench,
  digital: Smartphone,
  social_media: Share2,
  design: Palette,
  sales: Handshake,
  skills: Sparkles,
  education: GraduationCap,
  certification: Award,
  getting_started: Compass,
  other: BookOpen,
};

/**
 * The name-based GUESS, used only for a category no admin has picked an icon for.
 *
 * Categories carry an admin-chosen icon now (`CHOSEN` above), and that always
 * wins. This stays as the fallback, at the client's request, so the categories
 * that existed before the field did kept their glyphs on day one instead of all
 * turning into the same neutral icon until someone edited each one.
 *
 * It is still a guess, with a guess's failure mode: a category named with no
 * keyword in it falls to the name-hashed pool below. That is a reason for an
 * admin to pick an icon, not for this list to grow — do not add rules here to
 * rescue a specific category; set its icon in the admin panel.
 *
 * Matching is on the category name lowercased, first rule wins, so ORDER IS
 * SIGNIFICANT — the specific rules come before the broad ones. "Interview
 * Skills" must hit `interview` before `skill`, and "IELTS English" must hit
 * `english` before the generic `training` rule at the bottom would claim it.
 */
const BY_KEYWORD: ReadonlyArray<readonly [RegExp, LucideIcon]> = [
  // Migration paperwork — the specific documents first, then the generic word.
  [/visa|immigration|permit|residen/, Stamp],
  [/passport|\bnic\b|document|attest/, IdCard],
  [/flight|travel|airport|abroad|migrat/, Plane],

  // Getting hired.
  [/interview|recruit|hiring/, Mic],
  [/\bcv\b|resume|cover letter/, FileText],
  [/job|employ|career|vacanc|work/, Briefcase],

  // Language, and the tests that gate it.
  [/english|arabic|language|ielts|oet|spoken/, Languages],

  // Living there.
  [/uae|dubai|abu dhabi|gulf|culture|awareness|reality|orientation/, Building2],
  [/bank|financ|money|salar|remit|budget/, Landmark],
  [/driv|licen[cs]e|\broad\b/, Car],
  [/law|right|safety|secur|protect/, ShieldCheck],
  [/accommodat|housing|hostel|\brent\b|rental/, BedDouble],

  // Trades and sectors Plan B places into.
  [/nurs|health|medical|care|clinic|pharma/, Stethoscope],
  [
    /hospitality|hotel|chef|cook|kitchen|food|barista|waiter|housekeep|cleaning|laundry/,
    UtensilsCrossed,
  ],
  [/construct|civil|mason|weld|scaffold/, HardHat],
  [/electric|plumb|mechanic|technic|maintenance|engineer/, Wrench],
  [/\bit\b|tech|comput|software|digital|data|cyber|office|excel|microsoft/, Smartphone],
  [/design|creative|\bart\b|artwork|media|photo/, Palette],
  [/logistic|warehouse|supply|storekeep|packing/, Luggage],
  [/sales|market|customer|retail|service/, Handshake],
  [/beauty|salon|\bspa\b|wellness|grooming|therap/, Sparkles],

  // Broad buckets, last on purpose — see the note above.
  [/exam|assess|test|certif|qualif/, Award],
  [/skill|training|develop|soft|personal/, Sparkles],
  [/school|college|univers|academ|educat|study|degree|diploma/, GraduationCap],
  [/guide|start|basic|intro|beginner|prepar/, Compass],
];

/*
 * Several patterns above are `\b`-anchored, and each anchor is there because an
 * unanchored version matched a real category name WRONGLY, not out of caution:
 *
 *   `art`  — "Getting St*art*ed" drew a paint palette.
 *   `nic`  — "Tech*nic*al Skills" drew an ID card.
 *   `rent` — "Cur*rent* Affairs" drew a bed.
 *   `road` — "B*road*casting" drew a car.
 *   `it`   — matches inside almost every English word.
 *   `spa`  — "*Spa*nish", "*spa*re parts".
 *
 * `site` was dropped from the construction rule entirely for the same reason
 * ("Web*site* Design" drew a hard hat) — `civil` covers the case it was for.
 * Add a short pattern only with an anchor, and check it against a word that
 * merely contains it before trusting it.
 */
/**
 * What an unmatched category gets. Subject-neutral on purpose — none of these
 * five claims a topic, so a wrong one reads as decoration rather than as a
 * mislabel. `Award` is not in here despite being neutral-ish: it is already
 * spoken for above, and repeating it would put two identical glyphs in one row.
 */
const FALLBACK: readonly LucideIcon[] = [BookOpen, Layers, Sparkles, Compass, Building2];

/**
 * Picks a fallback from the category's own name rather than from its position
 * in the row.
 *
 * Position would mean a category's glyph CHANGED whenever the admin published
 * into a different category and reordered the row — the same tile redrawing
 * with a different picture between two app opens, which reads as a bug. Hashing
 * the name pins it: one category, one glyph, for as long as it is called that.
 *
 * djb2, and any stable hash would do — this only has to spread five ways, not
 * resist anything. `>>> 0` keeps it unsigned so the modulo cannot go negative.
 */
function hash(value: string): number {
  let h = 5381;

  for (let i = 0; i < value.length; i += 1) {
    h = ((h << 5) + h + value.charCodeAt(i)) >>> 0;
  }

  return h;
}

/** The glyph for a category name. Never null — every tile gets a picture. */
/**
 * The glyph for a category tile: the admin's chosen icon when there is one,
 * otherwise a guess from the name. Never null — every tile gets a picture.
 *
 * An unrecognised icon name (a newer backend adding a case this build predates)
 * is treated as no choice and guessed, rather than crashing the row.
 */
export function categoryIcon(name: string, icon: CourseCategoryIconName | null): LucideIcon {
  if (icon !== null && icon in CHOSEN) return CHOSEN[icon];

  const key = name.toLowerCase();

  for (const [pattern, icon] of BY_KEYWORD) {
    if (pattern.test(key)) return icon;
  }

  // Non-null: the modulo of a non-empty tuple is always in range, which the
  // index signature cannot know under `noUncheckedIndexedAccess`.
  return FALLBACK[hash(key) % FALLBACK.length]!;
}
