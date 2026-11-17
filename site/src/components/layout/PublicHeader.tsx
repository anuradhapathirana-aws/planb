import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Container } from '@/components/shared/Container';
import { Logo } from '@/components/layout/Logo';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { publicNav } from '@/components/layout/siteNav';
import { useHeroOverlayStore } from '@/stores/heroOverlayStore';
import { useSessionStore } from '@/stores/sessionStore';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';

/**
 * Sticky, **navy**, and the same height at every width.
 *
 * **Two looks, one height.** Over a full-bleed hero (the home page) it is a
 * floating rounded bar sitting on the photo — on a phone, a full-width bar on a
 * navy fade, with no rounded plate; everywhere else, and once the hero has
 * scrolled away, it is the solid full-width bar. `HeroSlider` says which
 * through `useHeroOverlayStore`.
 *
 * The floating bar is still a **navy plate** (75% plus a blur), never bare
 * links on the photo: the hero image will be admin-uploaded, so there is no
 * guarantee the logo and links would have anything to contrast against. The
 * switch moves the bar with `transform` and never changes its height, because
 * the hero is pulled up underneath it by exactly `h-20` — a header that changed
 * height would shift the whole page.
 *
 * In the solid look a border fades in on scroll so the bar separates from the
 * page without a shadow sitting there from the first pixel.
 *
 * **Navy bar, white links** (client instruction, 2026-09-25) — the same
 * `--surface` the footer and the hero use, so the page opens and closes on the
 * brand colour. Two consequences that are not optional:
 *
 *  - **The current page is marked in gold, not `--primary`.** `--primary` *is*
 *    this navy; `aria-[current=page]:text-primary` on a navy bar marks the
 *    current link by making it invisible. Gold on this surface is 6.3:1, the
 *    same pairing the hero headline uses.
 *  - **The logo gets no plate or backing.** It is a circular badge with its own
 *    cream field, so it reads on navy unaided — see `Logo`.
 */
export function PublicHeader({ onSignIn }: { onSignIn: () => void }) {
  const { t } = useTranslation();
  const { pathname, hash } = useLocation();
  const student = useSessionStore((s) => s.student);
  const floating = useHeroOverlayStore((s) => s.isUnderHeader);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /*
   * A section link is current only while that section is the active anchor.
   * Home is an exact match — `pathname.startsWith('/')` is true on every page,
   * so a prefix test would light Home up everywhere — and it stops being
   * current once a section anchor takes over.
   */
  const isCurrent = (to: string, isSection?: boolean) => {
    if (isSection) return pathname === paths.home && hash === to.slice(1);
    if (to === paths.home) return pathname === paths.home && hash === '';

    return pathname.startsWith(to);
  };

  return (
    <header
      className={cn(
        // No bottom border on phones (client instruction, 2026-11-17); the
        // shadow on scroll separates the bar from the page on its own there.
        'sticky top-0 z-40 border-b-0 text-surface-foreground md:border-b',
        'transition-[background-color,border-color,box-shadow,transform] duration-300',
        floating
          ? cn(
              'border-transparent',
              /*
               * Phones: no rounded plate (client instruction, 2026-11-17) — the
               * bar runs full width straight on the photo. A navy fade from the
               * top of the screen stands in for the plate, so the logo and
               * buttons stay readable over any picture an admin uploads.
               */
              'bg-gradient-to-b from-surface/85 via-surface/50 to-transparent',
              // From `md`: the floating rounded plate, inset from the edges.
              'md:translate-y-3 md:bg-none md:px-4',
            )
          : cn('bg-surface', scrolled ? 'border-surface-border shadow-lg' : 'border-transparent'),
      )}
    >
      {/* `h-20`, up from `h-16`: the taller logo needs the room (client
          instruction, 2026-09-25). It stays one height at every width — a bar
          that changes height between breakpoints moves the whole page with it.
          The floating plate's border is inside that height (`border-box`). */}
      <Container
        className={cn(
          'flex h-20 items-center gap-3 border border-transparent md:rounded-2xl',
          'transition-[background-color,border-color,box-shadow] duration-300',
          floating && 'md:border-white/10 md:bg-surface/75 md:shadow-lg md:backdrop-blur-md',
        )}
      >
        {/*
          The logo is TALLER THAN THE BAR and hangs below it (client
          instruction, 2026-09-26). Three things hold that up:

           - the bar's `h-20` is fixed, so an oversized child overflows rather
             than stretching it — the menu row's height never changes;
           - `self-start` from `sm` up sends the whole overhang downwards. With
             the row's own `items-center` the mark would be centred instead and
             half of it would vanish off the top of the window, since the header
             is stuck to `top-0`;
           - nothing in the header or `Container` sets `overflow-hidden`, which
             would clip the overhang back to the bar. Don't add one.

          The part that hangs over the hero is a transparent PNG and only its
          own box takes clicks, so it covers nothing interactive.

          **The lift is `drop-shadow`, not `box-shadow`** (client instruction,
          2026-09-26). The mark is a shield with a transparent background, and
          `box-shadow` would trace the image's rectangle — drawing exactly the
          plate around the badge that was removed a day earlier. `drop-shadow`
          follows the artwork's own alpha, so the shadow has the shield's shape.
          Two stacked layers, because one cannot do both jobs: a tight dark one
          reads as contact with the bar, a wide soft one as height above it.
          Both are pure black at low opacity so they stay honest on the navy.
        */}
        <Logo
          size="overhang"
          className={cn(
            'self-center transition-transform duration-300 sm:self-start',
            '[filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.55))_drop-shadow(0_8px_12px_rgba(0,0,0,0.45))]',
            // Only the hover lift is motion; the shadow is always there.
            'motion-safe:hover:-translate-y-0.5',
          )}
        />

        <nav className="ml-6 hidden flex-1 items-center gap-1 lg:flex" aria-label={t('site.nav.home')}>
          {publicNav.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              aria-current={isCurrent(item.to, item.isSection) ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium text-white transition-colors',
                'hover:bg-white/10',
                // Gold, not `--primary` — see the component docblock.
                'aria-[current=page]:text-accent',
              )}
            >
              {t(`site.nav.${item.key}`)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <LanguageSwitcher onDark className="hidden sm:inline-flex" />

          {/* `accent` rather than the default navy button: the default is
              `--primary`, which is the colour of the bar it now sits on. Gold is
              also the right weight for the one action in the header. */}
          {student ? (
            <Button asChild variant="accent" size="sm" className="gap-1.5">
              <Link to={paths.app.home}>
                <GraduationCap className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t('site.nav.myLearning')}</span>
              </Link>
            </Button>
          ) : (
            <>
              {/* Sign up is the gold action for a newcomer; Sign in steps back to
                  the outlined style so the bar still has one loudest button. Under
                  `sm` there is room for one, so Sign up moves into the menu. */}
              <Button variant="onSurface" size="sm" onClick={onSignIn}>
                {t('site.nav.signIn')}
              </Button>
              <Button asChild variant="accent" size="sm" className="hidden sm:inline-flex">
                <Link to={paths.register}>{t('site.nav.signUp')}</Link>
              </Button>
            </>
          )}

          {/* Mobile nav. `lg` rather than `md`: five links plus the language
              switcher and a button need more room than a tablet has. */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              {/* `ghost` would render dark-on-navy. The sheet's own contents stay
                  on a light surface, so only this trigger needs inverting. */}
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/10 hover:text-white lg:hidden"
                aria-label={t('site.nav.openMenu')}
              >
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="flex w-72 flex-col gap-1 p-4 pt-14">
              {/* Radix requires a title for the dialog's accessible name. */}
              <SheetTitle className="sr-only">{t('site.nav.openMenu')}</SheetTitle>

              {publicNav.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center rounded-md px-3 text-base font-medium hover:bg-secondary"
                >
                  {t(`site.nav.${item.key}`)}
                </NavLink>
              ))}

              <div className="mt-auto space-y-3 border-t pt-3">
                {student ? null : (
                  <Button asChild variant="accent" className="h-11 w-full">
                    <Link to={paths.register} onClick={() => setMenuOpen(false)}>
                      {t('site.nav.signUp')}
                    </Link>
                  </Button>
                )}
                <LanguageSwitcher className="w-full justify-start" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}
