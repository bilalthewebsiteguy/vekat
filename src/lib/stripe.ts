// Stripe, used for the registration fee.
//
// STRIPE_SECRET_KEY is a server secret: it must never be imported into a client component, and it
// is never sent to the browser. Use the test key (sk_test_…) until the client has signed off; with
// a test key no real money moves and Stripe's published test cards work.

import "server-only";
import Stripe from "stripe";
import { STRIPE_PAYMENT_LINK, isPayToken } from "@/lib/payment-methods";

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

let linkId: string | null = null;

/** The id of the client's Payment Link, looked up once from its URL. */
async function paymentLinkId() {
  if (linkId) return linkId;
  for await (const link of stripe().paymentLinks.list({ limit: 100 })) {
    if (link.url === STRIPE_PAYMENT_LINK) {
      linkId = link.id;
      return linkId;
    }
  }
  throw new Error("The Stripe payment link was not found in this Stripe account");
}

/** True for a paid checkout on the client's Payment Link that was opened from the form. */
export async function isFormLinkPayment(session: Stripe.Checkout.Session) {
  const link = typeof session.payment_link === "string" ? session.payment_link : session.payment_link?.id;
  return (
    session.payment_status === "paid" &&
    isPayToken(session.client_reference_id ?? "") &&
    Boolean(link) &&
    link === (await paymentLinkId())
  );
}

/** Finds the paid checkout the form opened with this token, if it has been paid yet. */
export async function findLinkPayment(token: string) {
  const sessions = await stripe().checkout.sessions.list({
    payment_link: await paymentLinkId(),
    status: "complete",
    created: { gte: Math.floor(Date.now() / 1000) - 2 * 24 * 3600 },
    limit: 100,
  });
  for (const session of sessions.data) {
    if (session.client_reference_id === token && (await isFormLinkPayment(session))) return session;
  }
  return null;
}
