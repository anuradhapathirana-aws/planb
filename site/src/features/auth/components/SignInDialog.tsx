import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Shell only — `PUB-7` fills this in with the email-OTP and Google flows once
 * `API-5` has added the student cookie-session endpoints.
 *
 * Two rules to keep when it is built:
 *  - **UI copy carries the explanation the API refuses to give.** `request-code`
 *    answers identically whether the email belongs to nobody, a blocked student
 *    or a deleted one, because a distinguishable response is an account
 *    enumeration oracle (`backend/CLAUDE.md` §4). Never "improve" the API's
 *    message — say it here instead.
 *  - **Validate the return path before navigating to it.** See `SEC-14` in
 *    docs/WEBSITE_AND_PORTAL_GUIDE.md.
 */
export function SignInDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('auth.signInTitle')}</DialogTitle>
          <DialogDescription>{t('auth.signInSubtitle')}</DialogDescription>
        </DialogHeader>

        <p className="rounded-md bg-secondary px-3 py-6 text-center text-sm text-muted-foreground">
          {t('common.comingSoon')}
        </p>
      </DialogContent>
    </Dialog>
  );
}
