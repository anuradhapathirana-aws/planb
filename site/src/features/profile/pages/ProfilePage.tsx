import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { AccountSettingsCard } from '@/features/profile/components/AccountSettingsCard';
import { DeleteAccountDialog } from '@/features/profile/components/DeleteAccountDialog';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { ProfileIdentityCard } from '@/features/profile/components/ProfileIdentityCard';
import { useProfile } from '@/features/profile/queries';
import { useSessionStore } from '@/stores/sessionStore';

/**
 * Profile (`POR-9`) — `/app/profile`. The web counterpart of the app's Profile
 * tab and its Edit Profile and Delete Account screens, on one page.
 *
 * Laptop: who you are and the settings in a narrow column, the details form
 * beside it. Phone: who you are, then the form, then the settings — the grid
 * places them, so the source order is the phone's order.
 *
 * Shows the session's cached student at once, then the fresh copy this page
 * fetches on every visit.
 */
export function ProfilePage() {
  const { t } = useTranslation();
  const profile = useProfile();
  const cached = useSessionStore((s) => s.student);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const student = profile.data ?? cached;

  if (!student) {
    return profile.isError ? (
      <EmptyState
        icon={WifiOff}
        title={t('site.portal.profile.loadFailedTitle')}
        body={t('checklist.loadFailedBody')}
        className="bg-card"
        action={
          <Button variant="outline" size="sm" onClick={() => void profile.refetch()}>
            {t('common.retry')}
          </Button>
        }
      />
    ) : (
      <ProfileSkeleton />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:items-start lg:gap-5">
      <Helmet>
        <title>{t('site.course.metaTitle', { name: t('profile.title') })}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="lg:col-start-1 lg:row-start-1">
        <ProfileIdentityCard student={student} />
      </div>

      <div className="min-w-0 lg:col-span-2 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <ProfileForm student={student} />
      </div>

      <div className="lg:col-start-1 lg:row-start-2">
        <AccountSettingsCard onDeleteAccount={() => setDeleteOpen(true)} />
      </div>

      <DeleteAccountDialog open={deleteOpen} email={student.email} onOpenChange={setDeleteOpen} />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:gap-5" aria-busy="true">
      <Skeleton className="h-72 w-full rounded-xl" />
      <div className="space-y-4 lg:col-span-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}
