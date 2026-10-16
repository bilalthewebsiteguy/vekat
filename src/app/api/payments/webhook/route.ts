import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { isDbConfigured } from "@/lib/db";
import { markPaymentVerified } from "@/lib/registrations";
import { isStripeConfigured, stripe } from "@/lib/stripe";

/**
 * Stripe calls this when a payment finishes. It is what makes a paid fee show as verified in the
 * admin dashboard without anyone checking Stripe by hand.
 *
 * Anyone can POST to this URL, so the signature is checked against STRIPE_WEBHOOK_SECRET before a
 * single field is trusted. Without that check, a forged request could mark any fee as paid.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!isStripeConfigured() || !secret || !isDbConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ ok: false }, { status: 400 });

  // The raw body, exactly as sent: parsing it first would break the signature.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(raw, signature, secret);
  } catch (err) {
    console.error("[stripe-webhook] signature check failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    // Acknowledged so Stripe stops retrying; only completed checkouts change a record.
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  const reference = session.client_reference_id || session.metadata?.reference || "";

  // A session can be "complete" while the payment is still processing, so check the payment itself.
  // Fees paid during the form carry a vekatpay_ token, not a reference: /api/register records those.
  if (session.payment_status !== "paid" || !reference || reference.startsWith("vekatpay_")) {
    return NextResponse.json({ received: true });
  }

  try {
    await markPaymentVerified(reference, {
      amount: session.amount_total ?? null,
      currency: session.currency ?? null,
      provider: "stripe",
      providerRef: session.payment_intent ? String(session.payment_intent) : session.id,
      // Stripe can send the same event more than once; the write is keyed on the event id so a
      // repeat cannot create a second payment record.
      eventId: event.id,
    });
  } catch (err) {
    // A 500 tells Stripe to retry, which is what we want if the database was briefly unreachable.
    console.error("[stripe-webhook] could not record the payment:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
