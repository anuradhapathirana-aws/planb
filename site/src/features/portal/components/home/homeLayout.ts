/**
 * Layout pieces shared by the phone Home's sections — the web twin of the
 * constants at the top of `mobile/app/(tabs)/index.tsx`. Kept in one file so the
 * rows that break out to the screen edge all break out by the same amount.
 */

/**
 * A row that scrolls sideways and runs to the screen edge, with its first item
 * still on the page gutter. The negative margin undoes `Container`'s gutter
 * (16px on a phone, 24px from `sm`) and the padding + `scroll-padding` put it
 * back inside the scroller, so snapping lands items on the gutter, not the edge.
 */
export const EDGE_STRIP =
  '-mx-4 flex snap-x snap-mandatory overflow-x-auto scroll-px-4 px-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 ' +
  '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/** Section headings: 16px / 500, the size the client chose for the app. */
export const SECTION_TITLE = 'text-[16px] font-medium leading-[26px] text-primary';

/** The navy gradient the rate card uses, between two brand tokens. */
export const NAVY_GRADIENT = 'bg-linear-to-br from-surface to-primary-tint';
