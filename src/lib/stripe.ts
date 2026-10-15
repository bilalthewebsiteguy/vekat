// Stripe, used for the registration fee.
//
// STRIPE_SECRET_KEY is a server secret: it must never be imported into a client component, and it
// is never sent to the browser. Use the test key (sk_test_…) until the client has signed off; with
// a test key no real money moves and Stripe's published test cards work.

import "server-only";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

export const isStripeConfigured = () => Boolean(key);

/** True while the configured key is a test key, so the UI can say so plainly. */
export const isStripeTestMode = () => Boolean(key?.startsWith("sk_test_"));

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key);
  return client;
}

/** The registration fee, by where the member lives. Amounts are in the currency's smallest unit. */
export const JOINING_FEE = {
  diaspora: { amount: 1000, currency: "gbp", label: "HomeBridge registration fee" },
} as const;
