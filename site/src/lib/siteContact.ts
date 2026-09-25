/**
 * How to reach Plan B. One source, because the footer and the floating
 * WhatsApp button would otherwise drift apart the first time a number changes.
 *
 * Placeholder values until `CMS-5` puts these on the `company_settings` record,
 * at which point this module is replaced by whatever `GET public/site-content`
 * returns. Nothing here is secret — it is printed on the page.
 */
export const siteContact = {
  email: 'info@planbinternational.lk',
  /** Display form, with spaces. Never use this to build a link. */
  phone: '+94 11 000 0000',
  address: 'Colombo, Sri Lanka',

  /**
   * Country code plus number, **digits only** — no `+`, no spaces, no dashes.
   * `wa.me` silently fails on anything else, which looks like a broken button
   * rather than a malformed URL, so it is stored pre-normalised rather than
   * stripped at the call site.
   */
  whatsappNumber: '94110000000',
} as const;

/** `tel:` needs the digits and the `+`, but no spaces. */
export function telHref(): string {
  return `tel:${siteContact.phone.replace(/[^\d+]/g, '')}`;
}

/**
 * A `wa.me` deep link, optionally pre-filling the first message.
 *
 * `wa.me` opens the app on a phone and WhatsApp Web on a desktop, so one URL
 * covers both — which is why this is a plain link rather than anything that
 * needs to detect the platform.
 */
export function whatsAppHref(message?: string): string {
  const url = new URL(`https://wa.me/${siteContact.whatsappNumber}`);

  if (message) url.searchParams.set('text', message);

  return url.toString();
}
