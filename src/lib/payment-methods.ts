/** The two ways to pay the registration fee. The form shows these and the server checks them. */
export const BANK_METHOD = "Bank transfer to VEKAT First Bank 2049483671 (₦10,000)";
export const CARD_METHOD = "Secure card payment link (£10)";

/**
 * The client's Stripe Payment Link for the registration fee. Pay now opens it in a new tab.
 *
 * Set NEXT_PUBLIC_STRIPE_PAYMENT_LINK to override it. The link and STRIPE_SECRET_KEY must belong
 * to the same Stripe account AND the same mode: a test key cannot see a live link, which makes
 * every payment check fail with "payment link was not found in this Stripe account". A test link
 * has test_ in its URL; the live one below does not.
 */
export const STRIPE_PAYMENT_LINK =
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/8x214nbjMdZg2gddNI8IU00";

/**
 * Starts the random code the form sends to Stripe as client_reference_id, so a payment made on the
 * link can be matched back to this form. Registrations paid later use their APP- reference instead.
 */
export const PAY_TOKEN_PREFIX = "vekatpay_";
export const isPayToken = (v: string) => new RegExp(`^${PAY_TOKEN_PREFIX}[A-Za-z0-9-]{20,60}$`).test(v);
