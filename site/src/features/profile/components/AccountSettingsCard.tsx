import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, FileText, Heart, Languages, Loader2, LogOut, Mail, Receipt, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SegmentedToggle } from '@/components/shared/SegmentedToggle';
import { useSignOut } from '@/features/auth/hooks/useSignOut';
import { changeLanguage, currentLanguage, SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { siteContact } from '@/lib/siteContact';
import { paths } from '@/routes/paths';

/**
 * Everything on the profile that is not the student's details: language,
 * the lists they open now and then, help and legal, sign out, and — quietly,
 * at the bottom — deleting the account.
 *
 * **Language refetches.** `changeLanguage` invalidates the whole query cache,
 * because course titles and the like were fetched under the old
 * `Accept-Language` and the SERVER picks the column (root CLAUDE.md §8).
 */
export function AccountSettingsCard({ onDeleteAccount }: { onDeleteAccount: () => void }) {
  const { t } = useTranslation();
  const signOut = useSignOut();
  // `useTranslation` re-renders on a language change, so this follows the header's switcher too.
  const language = currentLanguage();

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Languages className="size-4 text-muted-foreground" aria-hidden="true" />
          {t('site.lang.label')}
        </h2>
        <SegmentedToggle
          label={t('site.lang.label')}
          value={language}
          onChange={(next) => void changeLanguage(next)}
          options={SUPPORTED_LANGUAGES.map((code) => ({ value: code, label: t(`site.lang.${code}`) }))}
        />
      </section>

      <nav className="divide-y overflow-hidden rounded-xl border bg-card" aria-label={t('profile.title')}>
        <RowLink icon={Receipt} to={paths.app.orders}>
          {t('payment.historyLink')}
        </RowLink>
        <RowLink icon={Heart} to={paths.app.wishlist}>
          {t('wishlist.title')}
        </RowLink>
      </nav>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t('legal.sectionTitle')}
        </h2>
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          <RowLink icon={ShieldCheck} to={paths.privacy}>
            {t('legal.privacy')}
          </RowLink>
          <RowLink icon={FileText} to={paths.terms}>
            {t('legal.terms')}
          </RowLink>
          <RowLink
            icon={Mail}
            href={`mailto:${siteContact.email}?subject=${encodeURIComponent(t('site.portal.profile.supportSubject'))}`}
          >
            {t('legal.support')}
          </RowLink>
        </div>
      </section>

      <Button variant="outline" size="lg" className="w-full" disabled={signOut.isPending} onClick={() => signOut.mutate()}>
        {signOut.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LogOut aria-hidden="true" />}
        {t('auth.signOut')}
      </Button>

      {/* Easy to find, never mistaken for Sign out. */}
      <div className="text-center">
        <Button
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={signOut.isPending}
          onClick={onDeleteAccount}
        >
          {t('account.delete')}
        </Button>
      </div>
    </div>
  );
}

function RowLink({
  icon: Icon,
  to,
  href,
  children,
}: {
  icon: LucideIcon;
  to?: string;
  href?: string;
  children: ReactNode;
}) {
  const className =
    'flex min-h-12 items-center gap-3 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none';
  const body = (
    <>
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="flex-1">{children}</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </>
  );

  return href ? (
    <a href={href} className={className}>
      {body}
    </a>
  ) : (
    <Link to={to ?? paths.app.home} className={className}>
      {body}
    </Link>
  );
}
