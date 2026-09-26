import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { KeyRound, Loader2, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteAccount, requestDeletionCode } from '@/api/profile.api';
import { useSessionStore } from '@/stores/sessionStore';
import { paths } from '@/routes/paths';
import { getValidationErrors } from '@shared/lib/serverErrors';
import { OTP_LENGTH } from '@shared/schemas/studentAuth';
import type { DeletionCodeResponse } from '@shared/types/studentAuth';

/** The first server message on a 422, if any. These are written for the account holder. */
function serverMessage(error: unknown): string | undefined {
  const errors = getValidationErrors(error);

  return errors ? Object.values(errors)[0]?.[0] : undefined;
}

function isHandledByClient(error: unknown): boolean {
  const status = axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0;

  // 419/429/5xx are toasted by the API client's interceptor.
  return status === 419 || status === 429 || status >= 500;
}

/**
 * Deleting the account, in two steps — the app's flow, as one dialog.
 *
 * 1. **What goes and what stays**, then "Email me a code". Being signed in on
 *    an open browser is not enough to erase an account: the server wants a
 *    code sent to the account's email.
 * 2. **The code.** One `one-time-code` input, like sign-in; submits on the last
 *    digit, guarded against sending the same code twice (each try counts).
 *
 * On success the server has already ended this session, so the page just
 * forgets everything — store and whole query cache, as on sign-out — and goes
 * home. Unlike sign-in, the server may explain its refusals here (the caller
 * is the account holder; there is nothing to enumerate), so its message is shown.
 */
export function DeleteAccountDialog({
  open,
  email,
  onOpenChange,
}: {
  open: boolean;
  email: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const endSession = useSessionStore((s) => s.signOut);

  const [sent, setSent] = useState<DeletionCodeResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [secondsLeft, setSecondsLeft] = useState(0);
  const submitted = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);

    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const requestCode = useMutation({
    mutationFn: requestDeletionCode,
    onSuccess: (response) => {
      setSent(response);
      setSecondsLeft(response.resend_after_seconds);
      setCode('');
      setError(undefined);
      submitted.current = false;
      toast.info(t('account.codeSent'));
    },
    onError: (err) => {
      if (!isHandledByClient(err)) toast.error(serverMessage(err) ?? t('common.genericError'));
    },
  });

  const remove = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      endSession();
      queryClient.clear();
      navigate(paths.home, { replace: true });
      toast.success(t('account.deleted'));
    },
    onError: (err) => {
      submitted.current = false;
      setCode('');
      if (!isHandledByClient(err)) setError(serverMessage(err) ?? t('auth.codeInvalid'));
    },
  });

  function submit(value: string) {
    if (submitted.current || value.length !== OTP_LENGTH) return;

    submitted.current = true;
    remove.mutate(value);
  }

  function close(next: boolean) {
    // Not while deleting: closing would not stop the request.
    if (remove.isPending) return;

    onOpenChange(next);

    if (!next) {
      setSent(null);
      setCode('');
      setError(undefined);
      submitted.current = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        {sent === null ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('account.deleteTitle')}</DialogTitle>
              <DialogDescription className="font-medium text-destructive">{t('account.deleteWarning')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <p className="font-semibold text-foreground">{t('account.deletedHeading')}</p>
                <p className="mt-1 text-muted-foreground">{t('account.deletedItems')}</p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="font-semibold text-foreground">{t('account.keptHeading')}</p>
                <p className="mt-1 text-muted-foreground">{t('account.keptItems')}</p>
              </div>
              {email ? (
                <p className="flex items-start gap-2 text-muted-foreground">
                  <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {t('account.sendCodeHint', { email })}
                </p>
              ) : null}
            </div>

            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => close(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" disabled={requestCode.isPending} onClick={() => requestCode.mutate()}>
                {requestCode.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                {t('account.sendCode')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              submit(code);
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('account.confirmTitle')}</DialogTitle>
              <DialogDescription>
                {t('account.confirmSubtitle', {
                  length: OTP_LENGTH,
                  email: email ?? '',
                  minutes: Math.round(sent.expires_in_seconds / 60),
                })}
              </DialogDescription>
            </DialogHeader>

            <p className="text-sm font-medium text-destructive">{t('account.deleteWarning')}</p>

            <div className="space-y-1.5">
              <Label htmlFor="deletion-code" className="flex items-center gap-1.5">
                <KeyRound className="size-3.5 text-muted-foreground" aria-hidden="true" />
                {t('site.portal.profile.codeLabel')}
              </Label>
              <Input
                id="deletion-code"
                value={code}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
                  setCode(digits);
                  if (error) setError(undefined);
                  if (digits.length === OTP_LENGTH) submit(digits);
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={OTP_LENGTH}
                autoFocus
                placeholder={t('auth.codePlaceholder')}
                className="h-14 text-center text-2xl font-semibold tracking-[0.5em] tabular-nums sm:text-2xl"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'deletion-code-error' : undefined}
                disabled={remove.isPending}
              />
              {error ? (
                <p id="deletion-code-error" className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              variant="destructive"
              size="lg"
              className="w-full"
              disabled={code.length !== OTP_LENGTH || remove.isPending}
            >
              {remove.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {t('account.confirmButton')}
            </Button>

            <div className="text-center text-sm">
              {secondsLeft > 0 ? (
                <p className="text-muted-foreground">{t('auth.resendIn', { seconds: secondsLeft })}</p>
              ) : (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  disabled={requestCode.isPending || remove.isPending}
                  onClick={() => requestCode.mutate()}
                >
                  {t('auth.resend')}
                </Button>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
