import {
  Award,
  BriefcaseBusiness,
  GraduationCap,
  Globe2,
  Languages,
  PlaneTakeoff,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Placeholder copy for the home page's designed sections.
 *
 * **This file is temporary and is deleted by `CMS-3`.** Every shape here is the
 * shape the API will return from `GET public/site-content`, so wiring the real
 * thing is a swap of the data source, not a rewrite of the components — which is
 * the whole reason the sections take their content as props rather than reaching
 * for it themselves.
 *
 * Two rules the real content must keep:
 *  - **Headings use `**double asterisks**` to mark the gold word** — see
 *    `components/shared/Highlight.tsx` for why the emphasis travels inside the
 *    string rather than in a second column.
 *  - **`icon` is a key into a fixed registry, never a class or component name
 *    built from admin input** (`SEC-5`). Here that registry is this module's own
 *    imports; after `CMS-2` it is the shared `courseCategoryIcons` map.
 */

export interface HeroSlide {
  id: string
  /** Small chip above the headline. */
  eyebrow: string
  /** `**word**` marks the gold segment. */
  heading: string
  body: string
  primaryCta: { label: string; to: string }
  secondaryCta?: { label: string; to: string }
  /** Admin-uploaded artwork. Null draws the designed fallback panel. */
  imageUrl: string | null
  /** Drawn in the fallback panel, and as the slide's dot label for screen readers. */
  icon: LucideIcon
  /** Two small figures that float over the artwork. Presentation only. */
  stats: { value: string; label: string }[]
}

export const heroSlides: HeroSlide[] = [
  {
    id: 'study',
    eyebrow: 'Study in the UAE',
    heading: 'Your route to a **UAE degree**, mapped out',
    body: 'Courses, documents and timelines in one place — built for Sri Lankan students, in English and Sinhala.',
    primaryCta: { label: 'Browse courses', to: '/courses' },
    secondaryCta: { label: 'How it works', to: '/#about' },
    imageUrl: null,
    icon: GraduationCap,
    stats: [
      { value: '500+', label: 'Students' },
      { value: '2', label: 'Languages' },
    ],
  },
  {
    id: 'work',
    eyebrow: 'Work in the UAE',
    heading: 'Get **job-ready** before you land',
    body: 'Interview preparation, CV writing and profession-specific guidance from people who have placed students in the Emirates.',
    // Not `/services` — services are a signed-in feature now and the public
    // site no longer promotes them (see siteNav.ts).
    primaryCta: { label: 'Browse courses', to: '/courses' },
    // Not `/#success-stories` — that section is hidden for now (see HomePage).
    secondaryCta: { label: 'What students say', to: '/#testimonials' },
    imageUrl: null,
    icon: BriefcaseBusiness,
    stats: [
      { value: '12+', label: 'Professions' },
      { value: '1:1', label: 'Guidance' },
    ],
  },
  {
    id: 'arrive',
    eyebrow: 'Arrive prepared',
    heading: 'Every step **before and after** you fly',
    body: 'A checklist that covers visas, medicals, housing and your Emirates ID — tick it off from your phone as you go.',
    primaryCta: { label: 'Start free', to: '/courses' },
    secondaryCta: { label: 'Talk to us', to: '/#contact' },
    imageUrl: null,
    icon: PlaneTakeoff,
    stats: [
      { value: '40+', label: 'Checklist steps' },
      { value: '2', label: 'Phases' },
    ],
  },
]

/** The reassurance strip directly under the hero. */
export interface HeroHighlight {
  icon: LucideIcon
  title: string
  body: string
}

export const heroHighlights: HeroHighlight[] = [
  {
    icon: Globe2,
    title: 'Built for the UAE',
    body: 'Every course, document and checklist is written for the Emirates, not adapted from somewhere else.',
  },
  {
    icon: Languages,
    title: 'English and Sinhala',
    body: 'Learn in the language you think in. Switch at any time, on any screen.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified guidance',
    body: 'Consultants who have taken Sri Lankan students through the process themselves.',
  },
  {
    icon: Award,
    title: 'Assessed, not just watched',
    body: 'Finish a course with an assessment that proves you covered it.',
  },
]

/**
 * A course tile. Mirrors what `GET public/courses` will return (`API-2`), so
 * `PUB-3` reuses this card rather than writing a second one.
 */
export interface ProgrammeCard {
  id: number
  slug: string
  title: string
  excerpt: string
  /** Rendered as-is; already in the visitor's language when it comes from the API. */
  durationLabel: string
  modeLabel: string
  categoryName: string
  icon: LucideIcon
  thumbnailUrl: string | null
  /** Three at most — the card's height is fixed by design. */
  highlights: string[]
  /** Null means free. Integer minor units, per root CLAUDE.md §4.11. */
  priceCents: number | null
  currency: 'LKR' | 'AED'
}

export const featuredProgrammes: ProgrammeCard[] = [
  {
    id: 1,
    slug: 'uae-migration-essentials',
    title: 'UAE Migration Essentials',
    excerpt:
      'The whole journey end to end — visas, documents, medicals and what happens on arrival.',
    durationLabel: '6 weeks',
    modeLabel: 'Online',
    categoryName: 'Migration',
    icon: PlaneTakeoff,
    thumbnailUrl: null,
    highlights: ['Visa categories', 'Document checklist', 'Arrival process'],
    priceCents: null,
    currency: 'LKR',
  },
  {
    id: 2,
    slug: 'workplace-english',
    title: 'Workplace English for the Gulf',
    excerpt:
      'The English an Emirates workplace actually uses — email, meetings, and talking to a manager.',
    durationLabel: '8 weeks',
    modeLabel: 'Online',
    categoryName: 'Language',
    icon: Languages,
    thumbnailUrl: null,
    highlights: ['Professional email', 'Meeting language', 'Phone confidence'],
    priceCents: 1_200_000,
    currency: 'LKR',
  },
  {
    id: 3,
    slug: 'interview-preparation',
    title: 'Interview Preparation',
    excerpt:
      'Practise the questions Emirates employers ask, and learn what they are listening for.',
    durationLabel: '4 weeks',
    modeLabel: 'Online',
    categoryName: 'Careers',
    icon: BriefcaseBusiness,
    thumbnailUrl: null,
    highlights: ['Common questions', 'Salary conversations', 'Mock interviews'],
    priceCents: 850_000,
    currency: 'LKR',
  },
  {
    id: 4,
    slug: 'higher-education-pathway',
    title: 'Higher Education Pathway',
    excerpt:
      'Choosing a university, meeting entry requirements, and getting your student visa right.',
    durationLabel: '5 weeks',
    modeLabel: 'Online',
    categoryName: 'Education',
    icon: GraduationCap,
    thumbnailUrl: null,
    highlights: ['University selection', 'Entry requirements', 'Student visa'],
    priceCents: 1_500_000,
    currency: 'LKR',
  },
]

/**
 * A success story. One is shown for now; the shape is an array-ready record so
 * `CMS-4` can add more without the section being rewritten.
 *
 * **`CMS-1`'s `success_stories` table needs three columns beyond what was
 * originally proposed** — `video_url`, `video_duration_label` and a poster via
 * Media Library — plus `*_si` siblings for `headline`, `quote` and `body`.
 * Update the proposed migration before it runs.
 */
export interface SuccessStory {
  id: number
  /** The student's own words. The emotional centre of the section. */
  quote: string
  studentName: string
  studentPhotoUrl: string | null
  /** What they do and where — "Registered Nurse · Dubai". */
  role: string
  year: string
  body: string
  /**
   * The YouTube link exactly as the admin pasted it. It is parsed and
   * **validated** by `lib/youtube.ts` before it reaches an iframe — never
   * interpolate this value into markup directly.
   */
  videoUrl: string | null
  /** Admin-uploaded poster. Null falls back to YouTube's own thumbnail. */
  videoPosterUrl: string | null
  videoDurationLabel: string | null
  /** Two or three concrete outcomes. A specific result persuades; praise does not. */
  results: string[]
}

export const successStories: SuccessStory[] = [
  {
    id: 1,
    quote:
      'I thought the paperwork alone would stop me. Plan B gave me a checklist, and I just worked down it one line at a time.',
    studentName: 'Nimali Perera',
    studentPhotoUrl: null,
    role: 'Registered Nurse · Dubai',
    year: '2026',
    body: 'Nimali finished the UAE Migration Essentials course in Sinhala while working night shifts in Kandy. Six weeks after submitting her documents she had her visa, and she started at a private hospital in Dubai the following month.',
    // Placeholder link — replaced by the client's real upload at CMS-4.
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    videoPosterUrl: null,
    videoDurationLabel: '2:41',
    results: [
      'Visa approved in 6 weeks',
      'Studied in Sinhala',
      'Hired before arrival',
    ],
  },
]

/**
 * One face on the testimonial wall.
 *
 * `x` and `y` place the card in the desktop canopy. They are **authored values,
 * transcribed from the client's reference image — not computed and not
 * random**: a formula gives a mechanical-looking curve, and `Math.random()`
 * would reshuffle the wall on every render and produce a different picture
 * during the prerender pass than in the browser (`FND-5`). Hand-placing them is
 * also what lets the arrangement be nudged to match a design without touching
 * any code.
 *
 * **Both `x` and `y` are percentages of the field's WIDTH**, not of its height.
 * That is what keeps the arrangement proportional: the field's height is fixed
 * at `TESTIMONIAL_FIELD_ASPECT` of its width, so a card 7.4% of the width from
 * the top stays 7.4% of the width from the top at every viewport size. The
 * component converts `y` into the height-relative percentage CSS `top` actually
 * wants. Measuring both against one axis is also the only way to transcribe a
 * reference image without the proportions drifting.
 *
 * **Every card is upright and the same size** (client instruction, 2026-09-25),
 * so there is no `rotate` or `scale` here. Position is the only thing that
 * varies. Do not reintroduce a tilt "for character" — the reference is a clean
 * wall of uniform cards and the rotation was explicitly rejected.
 */
export interface Testimonial {
  id: number
  name: string
  role: string
  quote: string
  photoUrl: string | null
  /** Left edge, % of field width. */
  x: number
  /** Top edge, % of field **width** — see above. */
  y: number
}

/** Field height as a fraction of its width. Sized to clear the lowest card. */
export const TESTIMONIAL_FIELD_ASPECT = 0.345

/**
 * Card width, % of field width. Cards are 4:5 portrait.
 *
 * Column centres sit ~10.85% apart, so this leaves a gap of under 1% — about
 * 12px at a 1280px window. The cards are meant to read as one dense wall, and
 * that tight packing is the difference between a crowd and a row of thumbnails.
 */
export const TESTIMONIAL_CARD_WIDTH = 9.9

/*
 * The canopy, transcribed from the client's reference image (2026-09-25).
 *
 * NINE COLUMNS, ~10.85% apart. The outer two columns on each side hold a
 * STACKED PAIR; the five middle columns hold one card each at ALTERNATING
 * heights — low, high, low, high, low — which is what gives the band its rhythm
 * rather than a smooth arc.
 *
 * Cards are uniform: same width, same 4:5 ratio, no rotation, no scaling. The
 * only thing that varies is position. The wall is packed tight on purpose — the
 * gap is under 1% of the field width — so it reads as a crowd.
 */
export const testimonials: Testimonial[] = [
  // col 1, upper
  {
    id: 1,
    name: 'Dinesh Fernando',
    role: 'Welder · Abu Dhabi',
    photoUrl: null,
    x: 1.0,
    y: 7.4,
    quote:
      'The Sinhala version made the difference. I could actually follow what each document was for instead of guessing.',
  },
  // col 1, lower
  {
    id: 2,
    name: 'Shalini Jayawardena',
    role: 'Accountant · Dubai',
    photoUrl: null,
    x: 1.2,
    y: 20.8,
    quote:
      'I had been quoted a huge fee by an agent. I did the whole thing myself with the checklist and paid a fraction of it.',
  },
  // col 2, upper
  {
    id: 3,
    name: 'Kasun Silva',
    role: 'IT Support · Sharjah',
    photoUrl: null,
    x: 11.85,
    y: 3.5,
    quote:
      'The interview course was the most useful part. I knew exactly what they were going to ask me.',
  },
  // col 2, lower
  {
    id: 4,
    name: 'Anushka Rajapaksa',
    role: 'Hotel Manager · Dubai',
    photoUrl: null,
    x: 12.25,
    y: 16.7,
    quote:
      'I finished the lessons on the bus to work. Two months later I had an offer.',
  },
  // col 3  — low
  {
    id: 5,
    name: 'Tharindu Bandara',
    role: 'Electrician · Al Ain',
    photoUrl: null,
    x: 22.7,
    y: 8.4,
    quote:
      'Everything is in one place. No more folders of photocopies and no more calling people to ask what is next.',
  },
  // col 4  — high
  {
    id: 6,
    name: 'Ishara Gunasekara',
    role: 'Pharmacist · Dubai',
    photoUrl: null,
    x: 33.55,
    y: 3.1,
    quote:
      'The after-arrival checklist got me through the Emirates ID and my first tenancy without any help.',
  },
  // col 5  — low
  {
    id: 7,
    name: 'Ruwan Perera',
    role: 'Logistics · Jebel Ali',
    photoUrl: null,
    x: 44.4,
    y: 6.8,
    quote:
      'I had failed one application before. The document list showed me exactly what I had been missing.',
  },
  // col 6  — high
  {
    id: 8,
    name: 'Malsha Wickramasinghe',
    role: 'Teacher · Sharjah',
    photoUrl: null,
    x: 55.25,
    y: 2.7,
    quote:
      'Being able to switch to Sinhala when I got tired made the long lessons possible.',
  },
  // col 7  — low
  {
    id: 9,
    name: 'Chamara Dissanayake',
    role: 'Driver · Dubai',
    photoUrl: null,
    x: 66.1,
    y: 7.7,
    quote:
      'I am not good with computers and I still managed it on my phone. That says everything.',
  },
  // col 8, upper
  {
    id: 10,
    name: 'Nadeesha Kumari',
    role: 'Beautician · Dubai',
    photoUrl: null,
    x: 76.95,
    y: 2.5,
    quote:
      'They answered every question I had, and none of them made me feel stupid for asking.',
  },
  // col 8, lower
  {
    id: 11,
    name: 'Sahan Weerasinghe',
    role: 'Chef · Ras Al Khaimah',
    photoUrl: null,
    x: 76.65,
    y: 16.3,
    quote:
      'The visa section alone saved me weeks. I would have applied under the wrong category.',
  },
  // col 9, upper
  {
    id: 12,
    name: 'Hiruni Abeysekara',
    role: 'Nurse · Abu Dhabi',
    photoUrl: null,
    x: 87.8,
    y: 7.2,
    quote:
      'I watched the lessons at night after shifts. Nothing was rushed and I could go back over anything.',
  },
  // col 9, lower
  {
    id: 13,
    name: 'Lakmal Ratnayake',
    role: 'Safety Officer · Dubai',
    photoUrl: null,
    x: 88.0,
    y: 20.4,
    quote:
      'Worth it just for knowing what the real costs are before you commit to anything.',
  },
]

/** The "Join 500+ students" band — the About Us section, redesigned. */
export const community = {
  eyebrow: 'Community & trust',
  heading: 'Join **500+ Sri Lankans** building a life in the UAE',
  body: 'Plan B International has guided students and professionals from Colombo to Dubai, Abu Dhabi and Sharjah since day one. We do not just sell a course — we stay with you until you have landed.',
  /**
   * A video, not a photograph (client instruction, 2026-09-25). Same
   * click-to-load treatment as everywhere else on the site — see
   * `components/shared/YouTubeFacade.tsx` for why an embed is never rendered
   * until someone asks for it. Placeholder link until the client supplies one.
   */
  videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  videoPosterUrl: null,
  videoDurationLabel: '1:58',
  /** Drawn in the fallback panel when no video link is set. */
  icon: Users,
  floatingLabel: 'Enrolment open now',
  // The four numbered proof points that used to live here were removed with
  // their cards at the client's request (2026-09-25).
}

/**
 * A person on the Our Team carousel.
 *
 * `CMS-4` gives this its own `team_members` table — `name`, `role`, `role_si`,
 * `sort_order`, `is_visible` and a photo via Media Library. Sinhala gets a
 * sibling column for `role` only: a person's name is not translated.
 */
export interface TeamMember {
  id: number;
  name: string;
  /** Job title. Set in the visitor's language by the server, like every other title. */
  role: string;
  photoUrl: string | null;
}

/*
 * Placeholder people until the client supplies the real team and their
 * photographs.
 *
 * Nine of them, because the carousel shows five and a half across on a laptop:
 * with only six there would be half a card of travel, the dots would collapse
 * to two, and the "there is more to the right" affordance the half card exists
 * to provide would be telling the truth about almost nothing. The real team is
 * whatever size it is — this number only makes the component demonstrable.
 */
export const teamMembers: TeamMember[] = [
  { id: 1, name: 'Anuradha Pathirana', role: 'Founder & Director', photoUrl: null },
  { id: 2, name: 'Sanduni Herath', role: 'Head of Student Services', photoUrl: null },
  { id: 3, name: 'Roshan Mendis', role: 'Migration Consultant', photoUrl: null },
  { id: 4, name: 'Dilini Fonseka', role: 'Course Coordinator', photoUrl: null },
  { id: 5, name: 'Chathura Ranaweera', role: 'Careers Adviser', photoUrl: null },
  { id: 6, name: 'Piumi Senanayake', role: 'Student Support Lead', photoUrl: null },
  { id: 7, name: 'Nuwan Jayasuriya', role: 'Visa Documentation', photoUrl: null },
  { id: 8, name: 'Thilini Rajapakse', role: 'Accounts & Payments', photoUrl: null },
  { id: 9, name: 'Kavinda Alwis', role: 'Partnerships Manager', photoUrl: null },
];
