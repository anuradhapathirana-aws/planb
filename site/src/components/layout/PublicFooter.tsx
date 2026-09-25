import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Container } from '@/components/shared/Container';
import { Logo } from '@/components/layout/Logo';
import { publicNav, sectionIds } from '@/components/layout/siteNav';
import { siteContact, telHref } from '@/lib/siteContact';
import { paths } from '@/routes/paths';

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
    <footer id={sectionIds.contact} className="mt-auto bg-surface text-surface-foreground">
      <Container className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          {/* The white plate this used to sit on is gone: the mark is a circular
              badge with its own cream field, so the plate only drew a rectangle
              around a round logo. Shared with the header, which had the same
              problem. */}
          <Logo />

          <p className="mt-3 max-w-xs text-sm leading-relaxed text-surface-muted">{t('site.footer.tagline')}</p>

          <div className="mt-4 flex gap-2">
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

        <FooterColumn title={t('site.footer.quickLinks')}>
          {publicNav.map((item) => (
            <FooterLink key={item.key} to={item.to}>
              {t(`site.nav.${item.key}`)}
            </FooterLink>
          ))}
          {/*
            Contact, which left the header nav (2026-09-25) — the footer is the
            contact section, so this scrolls to the footer's own anchor. Meet
            the Team took its place up top and so arrives here through
            `publicNav` above.
          */}
          <FooterLink to={`/#${sectionIds.contact}`}>{t('site.footer.contact')}</FooterLink>
        </FooterColumn>

        <FooterColumn title={t('site.footer.forStudents')}>
          <FooterLink to={paths.app.home}>{t('site.nav.myLearning')}</FooterLink>
          <FooterLink to={paths.courses}>{t('site.nav.courses')}</FooterLink>
          <FooterLink to={paths.privacy}>{t('site.footer.privacy')}</FooterLink>
          <FooterLink to={paths.terms}>{t('site.footer.terms')}</FooterLink>
        </FooterColumn>

        <FooterColumn title={t('site.footer.contact')}>
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
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-foreground">{title}</h2>
      <ul className="mt-3 space-y-0 sm:space-y-0.5">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      {/*
        `min-h-11` keeps every footer link a 44px tap target on a phone and is
        NOT negotiable when tightening this footer — it is the one piece of
        spacing here that is a requirement rather than taste (root CLAUDE.md
        §8). The `sm:` overrides drop it back to a compact row from tablet up,
        where a pointer does not need the margin for error.
      */}
      <Link
        to={to}
        className="flex min-h-11 items-center text-sm text-surface-muted transition-colors hover:text-surface-foreground sm:min-h-0 sm:py-0.5"
      >
        {children}
      </Link>
    </li>
  );
}

function ContactRow({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <li className="flex min-h-11 items-start gap-2.5 text-sm text-surface-muted sm:min-h-0 sm:py-0.5">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
