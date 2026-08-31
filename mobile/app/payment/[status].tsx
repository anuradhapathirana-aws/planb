import { Redirect } from 'expo-router';

/**
 * Where the gateway's redirect lands — `planb://payment/complete` and
 * `planb://payment/cancelled` (see `payments.return_url` in
 * `backend/config/payments.php`).
 *
 * Normally nothing reaches this screen: the in-app browser session intercepts
 * the redirect and closes itself, and the checkout screen takes over from there.
 * It exists for the case the browser hands the link to the OS instead — after
 * the app was killed mid-payment, say — which would otherwise be an unmatched
 * route.
 *
 * It deliberately reads nothing out of the URL. The gateway can put whatever it
 * likes in a redirect, including "paid", and none of it decides anything: the
 * payments list shows what the *server* says, which is the only answer that
 * counts.
 */
export default function PaymentReturnScreen() {
  return <Redirect href="/profile/payments" />;
}
