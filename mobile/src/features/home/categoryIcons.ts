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
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stamp,
  Stethoscope,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from '@/components/icons';

/**
 * A glyph for a course category, matched on its NAME.
 *
 * **This is deliberately a stand-in, and it is worth knowing why rather than
 * copying the approach.** `services` solves the same problem properly: the
 * server stores a MEANING (`backend/app/Enums/ServiceIcon.php`), the admin
 * picks it, and `features/services/serviceIcons.ts` maps that meaning to a
 * glyph — so a renamed service keeps its icon and a new one is never iconless.
 * `course_categories` has no such column, so there is nothing to read: the app
 * has only the free-text `category_name` off each course summary, and it has to
 * guess from that.
 *
 * The consequence to expect: an admin renaming "Visa & Immigration" to
 * "Immigration Support" keeps its icon (both match `/immigration/`), but
 * renaming it to something with no keyword in it silently falls back to the
 * pool below. That is a cosmetic downgrade rather than a broken tile, which is
 * why it is an acceptable stand-in — but it is NOT a pattern to reach for
 * again. The fix is an `icon` enum column on `course_categories` mirroring
 * `ServiceIcon`, plus a student-facing endpoint; see `docs/CHANGELOG.md`.
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
export function categoryIcon(name: string): LucideIcon {
  const key = name.toLowerCase();

  for (const [pattern, icon] of BY_KEYWORD) {
    if (pattern.test(key)) return icon;
  }

  // Non-null: the modulo of a non-empty tuple is always in range, which the
  // index signature cannot know under `noUncheckedIndexedAccess`.
  return FALLBACK[hash(key) % FALLBACK.length]!;
}
