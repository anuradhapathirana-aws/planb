import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Container } from '@/components/shared/Container';
import { Logo } from '@/components/layout/Logo';
import { publicNav, sectionIds } from '@/components/layout/siteNav';
import { siteContact, telHref } from '@/lib/siteContact';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';

/*
 * Address, phone and email come from `lib/siteContact.ts` — the same module the
 * floating WhatsApp button reads, so a changed number cannot update in one
 * place and not the other. Social links stay here because they carry icon
 * components, which do not belong in a plain data module.
 */
const SOCIAL = [
  { label: 'Facebook', href: '#', icon: Facebook },
  { label: 'Instagram', href: '#', icon: Instagram },
  { label: 'LinkedIn', href: '#', icon: Linkedin },
];

export function PublicFooter() {
  const { t } = useTranslation();

  return (
    /*
      **On a phone the footer is centred and compact** (client instruction,
      2026-11-17) — it had become a long scroll of left-aligned lists. The logo
      is larger and centred with the tagline and icons under it, the quick links
      wrap as pill-shaped tags, the contact rows sit close together, and the
      "For students" column is dropped. Privacy and Terms must stay reachable
      (the Play listing's reviewers follow them), so on a phone they move into
      the bottom bar beside the copyright. From `sm` up nothing changes.
    */
    <footer id={sectionIds.contact} className="mt-auto bg-surface text-surface-foreground">
      <Container className="grid gap-7 py-8 max-sm:text-center sm:grid-cols-2 sm:gap-8 sm:py-10 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          {/* The white plate this used to sit on is gone: the mark is a circular
              badge with its own cream field, so the plate only drew a rectangle
              around a round logo. Shared with the header, which had the same
              problem. */}
          <div className="flex max-sm:justify-center">
            <Logo size="xl" />
          </div>

          <p className="mt-3 max-w-xs text-sm leading-relaxed text-surface-muted max-sm:mx-auto">
            {t('site.footer.tagline')}
          </p>

          <div className="mt-4 flex gap-2 max-sm:justify-center">
            {SOCIAL.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noreferrer noopener"
                className="flex size-9 items-center justify-center rounded-full border border-surface-border text-surface-muted transition-colors hover:bg-white/10 hover:text-surface-foreground"
              >
                <Icon className="size-4" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        {/* On a phone the list wraps as pill-shaped tags — see `FooterColumn`'s `tags`. */}
        <FooterColumn title={t('site.footer.quickLinks')} tags>
          {publicNav.map((item) => (
            <FooterLink key={item.key} to={item.to} tag>
              {t(`site.nav.${item.key}`)}
            </FooterLink>
          ))}
          {/*
            Contact, which left the header nav (2026-09-25) — the footer is the
            contact section, so this scrolls to the footer's own anchor. Meet
            the Team took its place up top and so arrives here through
            `publicNav` above.
          */}
          <FooterLink to={`/#${sectionIds.contact}`} tag>
            {t('site.footer.contact')}
          </FooterLink>
        </FooterColumn>

        {/* Not on a phone: Courses is already a quick link, My learning is in
            the header, and Privacy / Terms move to the bottom bar there. */}
        <FooterColumn title={t('site.footer.forStudents')} className="max-sm:hidden">
          <FooterLink to={paths.app.home}>{t('site.nav.myLearning')}</FooterLink>
          <FooterLink to={paths.courses}>{t('site.nav.courses')}</FooterLink>
          <FooterLink to={paths.privacy}>{t('site.footer.privacy')}</FooterLink>
          <FooterLink to={paths.terms}>{t('site.footer.terms')}</FooterLink>
        </FooterColumn>

        <FooterColumn title={t('site.footer.contact')} compact>
          <ContactRow icon={Mail}>
            <a className="hover:text-surface-foreground" href={`mailto:${siteContact.email}`}>
              {siteContact.email}
            </a>
          </ContactRow>
          <ContactRow icon={Phone}>
            <a className="hover:text-surface-foreground" href={telHref()}>
              {siteContact.phone}
            </a>
          </ContactRow>
          <ContactRow icon={MapPin}>{siteContact.address}</ContactRow>
        </FooterColumn>
      </Container>

      <div className="border-t border-surface-border">
        <Container className="py-4">
          <p className="text-center text-xs text-surface-muted">
            {t('site.footer.rights', { year: new Date().getFullYear() })}
          </p>

          {/* Phones only: Privacy and Terms, which lost their column there. */}
          <p className="mt-1 flex justify-center gap-1 text-xs sm:hidden">
            <Link to={paths.privacy} className="px-2 py-1.5 text-surface-muted underline-offset-2 hover:underline">
              {t('site.footer.privacy')}
            </Link>
            <span className="py-1.5 text-surface-border" aria-hidden="true">
              ·
            </span>
            <Link to={paths.terms} className="px-2 py-1.5 text-surface-muted underline-offset-2 hover:underline">
              {t('site.footer.terms')}
            </Link>
          </p>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
  tags = false,
  compact = false,
  className,
}: {
  title: string;
  children: React.ReactNode;
  /** On a phone, lay the links out as wrapping pill-shaped tags. */
  tags?: boolean;
  /** On a phone, close the rows up (contact details). */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-foreground">{title}</h2>
      <ul
        className={cn(
          'mt-3 space-y-0 sm:space-y-0.5',
          tags && 'max-sm:flex max-sm:flex-wrap max-sm:justify-center max-sm:gap-1.5',
          compact && 'max-sm:space-y-1',
        )}
      >
        {children}
      </ul>
    </div>
  );
}

function FooterLink({ to, tag = false, children }: { to: string; tag?: boolean; children: React.ReactNode }) {
  return (
    <li>
      {/*
        `min-h-11` keeps every footer link a 44px tap target on a phone and is
        NOT negotiable when tightening this footer — it is the one piece of
        spacing here that is a requirement rather than taste (root CLAUDE.md
        §8). The `sm:` overrides drop it back to a compact row from tablet up,
        where a pointer does not need the margin for error.

        With `tag` the same link becomes a bordered pill on a phone, the one
        place this footer goes under 44px — see the note below. Plain text
        again from `sm`.
      */}
      <Link
        to={to}
        className={cn(
          'flex min-h-11 items-center text-sm text-surface-muted transition-colors hover:text-surface-foreground sm:min-h-0 sm:py-0.5',
          tag &&
            'max-sm:rounded-full max-sm:border max-sm:border-surface-border max-sm:bg-white/5 max-sm:text-surface-foreground max-sm:hover:bg-white/10',
          // Smaller pills (client instruction, 2026-11-17): 36px, under the
          // usual 44px. Acceptable for this row only because each tag is a
          // distinct, well-separated target with a gap around it.
          tag && 'max-sm:min-h-9 max-sm:px-3.5 max-sm:text-[13px]',
        )}
      >
        {children}
      </Link>
    </li>
  );
}

function ContactRow({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    /*
      On a phone the rows are centred and only as tall as their text (client
      instruction, 2026-11-17) — the 44px minimum height made three short lines
      take up most of a screen. The email and phone links are each a full line
      wide there, so they remain easy to tap.
    */
    <li className="flex items-start gap-2.5 text-sm text-surface-muted max-sm:justify-center max-sm:py-1 sm:min-h-0 sm:py-0.5">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
