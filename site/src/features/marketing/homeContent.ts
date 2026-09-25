import { BriefcaseBusiness, GraduationCap, PlaneTakeoff, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SiteCtaLink } from '@/features/marketing/siteLinks'

/**
 * The home page's view models, and the content shown when the admin has not
 * supplied any.
 *
 * **The hero, the About band and the team are now admin-managed** (Website
 * Configuration in the admin panel) and arrive from `GET public/site-content`.
 * What stays here for those three is the **fallback**, not a placeholder:
 * `useSiteContent` returns these designed defaults whenever the API sends an
 * empty list, so the company's front page is never blank — which is what lets
 * the site ship before the client has written the copy, and what stops a
 * mistaken "hide all" in the admin panel taking the hero down.
 *
 * **The course carousel is live too** — it comes from `GET public/courses` via
 * `usePublicCourses`, and has no fallback for the reason noted where the old
 * placeholder list used to be. What this file still keeps as the view model is
 * the `ProgrammeCard` interface the card renders.
 *
 * The remaining exports (`successStories`, `testimonials`) are still
 * placeholders and are replaced by a later CMS task.
 *
 * Two rules the content keeps, wherever it comes from:
 *  - **Headings use `**double asterisks**` to mark the gold word** — see
 *    `components/shared/Highlight.tsx` for why the emphasis travels inside the
 *    string rather than in a second column.
 *  - **`icon` is a key into a fixed registry, never a class or component name
 *    built from admin input** (`SEC-5`). For admin-supplied slides that registry
 *    is `heroIcons.ts`; the fallbacks below import their glyphs directly.
 */

export interface HeroSlide {
  id: string
  /** Small chip above the headline. */
  eyebrow: string
  /** `**word**` marks the gold segment. */
  heading: string
  body: string
  /**
   * Already resolved to a destination by `siteLinks.ts` — never a raw path from
   * the API. `isExternal` decides `<a>` versus a router `<Link>`, which matters:
   * handing an absolute URL to `<Link>` makes the router treat it as an in-app
   * path.
   */
  primaryCta: SiteCtaLink | null
  secondaryCta?: SiteCtaLink | null
  /** Admin-uploaded artwork. Null draws the designed fallback panel. */
  imageUrl: string | null
  /** Drawn in the fallback panel, and as the slide's dot label for screen readers. */
  icon: LucideIcon
  /** Two small figures that float over the artwork. Presentation only. */
  stats: { value: string; label: string }[]
}

/**
 * The designed fallback hero, shown when no admin slide is visible.
 *
 * These are not admin-editable and are not meant to be: they exist so the front
 * page always has something on it. The real slides come from Website
 * Configuration > Hero Slider.
 */
export const heroSlides: HeroSlide[] = [
  {
    id: 'study',
    eyebrow: 'Study in the UAE',
    heading: 'Your route to a **UAE degree**, mapped out',
    body: 'Courses, documents and timelines in one place — built for Sri Lankan students, in English and Sinhala.',
    primaryCta: { label: 'Browse courses', to: '/courses', isExternal: false },
    secondaryCta: { label: 'How it works', to: '/#about', isExternal: false },
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
    primaryCta: { label: 'Browse courses', to: '/courses', isExternal: false },
    // Not `/#success-stories` — that section is hidden for now (see HomePage).
    secondaryCta: { label: 'What students say', to: '/#testimonials', isExternal: false },
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
    primaryCta: { label: 'Start free', to: '/courses', isExternal: false },
    secondaryCta: { label: 'Talk to us', to: '/#contact', isExternal: false },
    imageUrl: null,
    icon: PlaneTakeoff,
    stats: [
      { value: '40+', label: 'Checklist steps' },
      { value: '2', label: 'Phases' },
    ],
  },
]

/**
 * A course tile, as `ProgrammeCard` renders it.
 *
 * The view model, not the API shape: `usePublicCourses` maps
 * `PublicCourseSummary` onto this, which is where the category icon key becomes
 * a component and the price flag becomes `null` for free. The card never sees
 * the raw payload, so `PUB-3`'s catalogue reuses it verbatim.
 */
export interface ProgrammeCard {
  id: number
  /** The course id today; a real slug once `API-4` is settled with the client. */
  slug: string
  name: string
  /**
   * Plain text, flattened from the admin's rich text server-side. Deliberately
   * not HTML — a public card that renders text needs no sanitiser.
   */
  excerpt: string
  categoryName: string
  icon: LucideIcon
  thumbnailUrl: string | null
  /*
   * No `highlights` field: the three ticked topic titles the card used to draw
   * were removed at the client's request (2026-09-25). The API still sends
   * `topic_names` — `PUB-4`'s course detail page needs them — but nothing maps
   * them onto the tile, so the tile does not carry them.
   */
  lessonsCount: number
  /** 0 when no lesson has a duration yet — the card hides the chip then. */
  durationSeconds: number
  /** Null means free. Integer minor units, per root CLAUDE.md §4.11. */
  priceCents: number | null
  currency: string
  /**
   * False when the course is sold only inside its category's bundle. The card
   * says so rather than printing a price nobody can pay on its own.
   */
  soldIndividually: boolean
}

/*
 * There is deliberately NO fallback course list.
 *
 * The four placeholder programmes that used to live here were removed when the
 * carousel became live (2026-09-25). A hero headline is decoration and a generic
 * one is harmless; an invented course is a product Plan B does not sell, with a
 * price on it. `ProgrammesSection` has a designed "no courses published yet"
 * state, which is the honest answer when the catalogue is empty or unreachable.
 */

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
 *
 * **The faces are PLACEHOLDERS**, seven files in `site/public/images/
 * testimonials/` cycled across the thirteen cards (client instruction,
 * 2026-09-26: keep the sample photographs on the wall for now). They are static
 * assets on purpose — the wall briefly read its photographs out of the live team
 * data, and once the real staff portraits are uploaded that would have shown
 * Plan B's own employees as migrated students beside quotes they never gave.
 * Nothing here touches the team any more.
 *
 * Copies at 320×400, which is comfortably above the ~120px a card renders at, so
 * all seven together are 86KB. `CMS-4` replaces them with real photographs on a
 * testimonial record; the quotes and names are placeholder copy until then.
 */
export const testimonials: Testimonial[] = [
  // col 1, upper
  {
    id: 1,
    name: 'Dinesh Fernando',
    role: 'Welder · Abu Dhabi',
    photoUrl: '/images/testimonials/01.jpg',
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
    photoUrl: '/images/testimonials/02.jpg',
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
    photoUrl: '/images/testimonials/03.jpg',
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
    photoUrl: '/images/testimonials/04.jpg',
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
    photoUrl: '/images/testimonials/05.jpg',
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
    photoUrl: '/images/testimonials/06.jpg',
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
    photoUrl: '/images/testimonials/07.jpg',
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
    photoUrl: '/images/testimonials/01.jpg',
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
    photoUrl: '/images/testimonials/02.jpg',
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
    photoUrl: '/images/testimonials/03.jpg',
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
    photoUrl: '/images/testimonials/04.jpg',
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
    photoUrl: '/images/testimonials/05.jpg',
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
    photoUrl: '/images/testimonials/06.jpg',
    x: 88.0,
    y: 20.4,
    quote:
      'Worth it just for knowing what the real costs are before you commit to anything.',
  },
]

/** The "Join 500+ students" band — the About Us section, redesigned. */
export interface CommunityContent {
  eyebrow: string
  /** `**word**` marks the gold segment. */
  heading: string
  body: string
  /**
   * A video, not a photograph (client instruction, 2026-09-25). Same
   * click-to-load treatment as everywhere else on the site — see
   * `components/shared/YouTubeFacade.tsx` for why an embed is never rendered
   * until someone asks for it.
   *
   * **A raw admin value.** It is parsed by `youTubeVideoId()` before it reaches
   * an iframe and is never interpolated into markup directly.
   */
  videoUrl: string | null
  videoPosterUrl: string | null
  videoDurationLabel: string | null
  /** Drawn in the fallback panel when no video link is set. */
  icon: LucideIcon
  floatingLabel: string
}

/**
 * The designed fallback About band, shown until an admin fills this in under
 * Website Configuration > About Video. Not a placeholder — see this file's
 * header.
 */
export const community: CommunityContent = {
  eyebrow: 'Community & trust',
  heading: 'Join **500+ Sri Lankans** building a life in the UAE',
  body: 'Plan B International has guided students and professionals from Colombo to Dubai, Abu Dhabi and Sharjah since day one. We do not just sell a course — we stay with you until you have landed.',
  // No fallback video: a link here would put a stranger's video on Plan B's
  // front page whenever the admin field is empty. With none, the section draws
  // its designed panel instead, which is the correct empty state.
  videoUrl: null,
  videoPosterUrl: null,
  videoDurationLabel: null,
  icon: Users,
  floatingLabel: 'Enrolment open now',
  // The four numbered proof points that used to live here were removed with
  // their cards at the client's request (2026-09-25).
}

/**
 * A person on The Team carousel.
 *
 * Backed by the `team_members` table and managed under Website Configuration >
 * The Team. `role` arrives already in the visitor's language — the server picks
 * the column, this client never does. There is no `name_si` because a person's
 * name is not translated.
 */
export interface TeamMember {
  id: number;
  name: string;
  /** Job title. Set in the visitor's language by the server, like every other title. */
  role: string;
  photoUrl: string | null;
  /**
   * Profile links, each null when the admin has not given one. Already
   * restricted to http/https server-side, which is what makes them safe to put
   * in an `href` — never render one that has not been through that check.
   */
  facebookUrl: string | null;
  linkedinUrl: string | null;
}

/*
 * There are deliberately NO fallback team members.
 *
 * The nine stand-ins that used to live here were removed when the team became
 * admin-managed: a section headed "The Team" listing invented staff is a
 * different kind of placeholder from a generic hero headline — it is a claim
 * about real people. `TeamSection` already has a designed empty state
 * (`site.team.empty*`), so an empty table shows "coming soon" rather than a
 * fabricated roster or a hole in the page.
 *
 * For reference when the real team is added: the carousel shows five and a half
 * cards across on a laptop, so it looks best with six or more. The admin panel
 * says so too.
 */
