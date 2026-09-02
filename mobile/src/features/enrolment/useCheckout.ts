import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { colors } from '@shared/theme/tokens';
import { errorMessage } from '@/api/client';
import { fetchOrder, startCardPayment } from '@/api/payments.api';
import { useToast } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';
import { getWebBrowser, isWebBrowserAvailable } from '@/lib/webBrowser';

/**
 * Where the gateway sends the student back to.
 *
 * Must stay in step with `payments.return_url` / `payments.cancel_url` in
 * `backend/config/payments.php`. The prefix (not the full path) is used so both
 * the success and the cancel link end the browser session — on iOS the OS
 * matches the scheme alone anyway.
 */
const RETURN_URL_PREFIX = 'planb://payment';

/** How long to wait for the webhook before telling the student we're not sure. */
const CONFIRM_TIMEOUT_MS = 45_000;
const POLL_INTERVAL_MS = 2_000;

export type CheckoutPhase =
  /** Nothing in flight. */
  | 'idle'
  /** The hosted checkout is open in front of the student. */
  | 'paying'
  /** They are back; we are waiting for the gateway's webhook to land. */
  | 'confirming'
  /** It never landed. Not a failure — we genuinely do not know yet. */
  | 'unconfirmed';

/**
 * Card checkout, from "pay" to "unlocked".
 *
 * The hard rule this encodes: **the app never decides an order is paid.** It
 * hands the student to the gateway's own page, and then does nothing but ask the
 * server what happened. Coming back from the browser proves nothing — the
 * student may have closed it after paying, or forged the redirect without
 * paying — so the only thing that flips this to paid is the order status the
 * server reports after its signed webhook settles.
 */
export function useCheckout(orderId: number) {
  const { t } = useTranslation();
  const toast = useToast();
  const [phase, setPhase] = useState<CheckoutPhase>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
   * A dev client built before `expo-web-browser` was added has no native module
   * for it (see src/lib/webBrowser.ts). Bank transfer still works, so the screen
   * disables the card button and explains rather than crashing on the tap.
   */
  const canPayByCard = isWebBrowserAvailable();

  const order = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: Number.isFinite(orderId),
    // Poll only while waiting on the webhook. A settled order is final, so
    // polling past that would just burn a student's data.
    refetchInterval: (query) =>
      phase === 'confirming' && query.state.data?.status !== 'paid' ? POLL_INTERVAL_MS : false,
  });

  const isPaid = order.data?.status === 'paid';

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  /*
   * The webhook landed. What that unlocked depends on what was bought — a
   * course opens, a service becomes a job Plan B has started — so every cached
   * view of either goes stale. Invalidating both regardless is cheaper than
   * branching on the product type: these are small, rarely-changing lists, and
   * an over-invalidation costs one refetch while a missed one leaves a student
   * looking at a screen that still says they have not paid.
   */
  useEffect(() => {
    if (!isPaid) return;

    clearTimer();
    setPhase('idle');
    void queryClient.invalidateQueries({ queryKey: ['courses'] });
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    void queryClient.invalidateQueries({ queryKey: ['services'] });
    void queryClient.invalidateQueries({ queryKey: ['service'] });
    void queryClient.invalidateQueries({ queryKey: ['service-purchases'] });
  }, [isPaid, clearTimer]);

  /* Stop waiting eventually, and say so honestly rather than spinning forever. */
  useEffect(() => {
    if (phase !== 'confirming') return;

    timer.current = setTimeout(() => setPhase('unconfirmed'), CONFIRM_TIMEOUT_MS);

    return clearTimer;
  }, [phase, clearTimer]);

  const payByCard = useMutation({
    mutationFn: () => startCardPayment(orderId),
    onMutate: () => setPhase('paying'),
    onSuccess: async (result) => {
      // Re-read rather than closing over it: `canPayByCard` was resolved on
      // first render, and this is the call that actually needs the module.
      const browser = getWebBrowser();

      if (!browser) {
        setPhase('idle');
        toast.error(t('payment.cardUnavailable'));

        return;
      }

      try {
        /*
         * A Custom Tab / SFSafariViewController, never a WebView inside the app.
         * The page collecting card details must be the gateway's own, on its own
         * origin, with the browser's address bar visible — that is what keeps
         * Plan B out of PCI scope and lets the student verify who they are
         * paying. `redirect_url` is always a plain URL, even for gateways whose
         * real checkout is a signed form POST.
         */
        await browser.openAuthSessionAsync(result.checkout.redirect_url, RETURN_URL_PREFIX, {
          toolbarColor: colors.primary,
          controlsColor: colors.primary,
        });
      } finally {
        /*
         * Every outcome lands here on purpose — success, cancel and dismiss
         * alike. A dismissed tab does not mean unpaid (the student may have paid
         * and swiped it away), and a success redirect does not mean paid. Only
         * the server knows, so in all cases: go and ask.
         */
        setPhase('confirming');
        void order.refetch();
      }
    },
    onError: (error) => {
      setPhase('idle');
      toast.error(errorMessage(error, t('payment.cardOpenFailed')));
    },
  });

  return {
    order: order.data,
    isLoading: order.isLoading,
    isError: order.isError,
    refetch: order.refetch,
    phase,
    isPaid,
    payByCard: () => {
      /*
       * Checked before the mutation, not inside it: starting a card payment
       * creates a Payment row and cancels any earlier card attempt, so doing
       * that on a client that cannot open a browser would leave the order
       * littered with attempts nobody could ever complete.
       */
      if (!canPayByCard) {
        toast.error(t('payment.cardUnavailable'));

        return;
      }

      payByCard.mutate();
    },
    canPayByCard,
    isStartingCard: payByCard.isPending,
    /** Lets the student ask again after we gave up waiting. */
    checkAgain: () => {
      setPhase('confirming');
      void order.refetch();
    },
  };
}
