import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { isDbConfigured } from "@/lib/db";
import { findMemberByReference } from "@/lib/registrations";
import { JOINING_FEE, isStripeConfigured, stripe } from "@/lib/stripe";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/**
 * Starts a card payment for the registration fee.
 *
 * Members abroad pay during the form, before any registration exists: the session carries no
 * reference, opens in its own tab, and /api/register checks it with Stripe when the form is
 * submitted. A registration that was submitted without paying can still be paid by its reference,
 * which then travels as client_reference_id so the webhook can mark the right fee as verified.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured() || !isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "Card payment is not set up yet." }, { status: 503 });
  }

  let reference = "";
  let email = "";
  try {
    const body = (await req.json()) as { reference?: unknown; email?: unknown };
    reference = typeof body.reference === "string" ? body.reference.trim() : "";
    email = typeof body.email === "string" ? body.email.trim().slice(0, 120) : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const fee = JOINING_FEE.diaspora;
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: fee.currency,
        unit_amount: fee.amount,
        product_data: {
          name: fee.label,
          description: reference ? `One-off, non-refundable registration fee · ${reference}` : "One-off, non-refundable registration fee",
        },
      },
    },
  ];

  let params: Stripe.Checkout.SessionCreateParams;
  if (!reference) {
    if (!isEmail(email)) {
      return NextResponse.json({ ok: false, error: "Enter your email address on the first step." }, { status: 400 });
    }
    params = {
      mode: "payment",
      customer_email: email,
      line_items: lineItems,
      metadata: { purpose: "registration_fee" },
      success_url: `${origin}/payment-complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-cancelled`,
    };
  } else {
    // Only a reference that exists can be paid for, so the endpoint cannot be used to create
    // arbitrary checkout sessions against made-up references.
    const member = await findMemberByReference(reference);
    if (!member) {
      return NextResponse.json({ ok: false, error: "We could not find that registration" }, { status: 404 });
    }
    if (member.payment?.status === "Verified") {
      return NextResponse.json({ ok: false, error: "This fee has already been paid" }, { status: 409 });
    }
    params = {
      mode: "payment",
      client_reference_id: member.reference,
      customer_email: member.email || undefined,
      line_items: lineItems,
      metadata: { reference: member.reference, purpose: "registration_fee" },
      // The session id comes back so the return page can confirm the payment with Stripe directly,
      // which means a fee is recorded even before the webhook endpoint is set up.
      success_url: `${origin}/?paid=1&session_id={CHECKOUT_SESSION_ID}#register`,
      cancel_url: `${origin}/?paid=0#register`,
    };
  }

  try {
    const session = await stripe().checkout.sessions.create(params);
    if (!session.url) throw new Error("Stripe returned no checkout URL");
    return NextResponse.json({ ok: true, url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[checkout] could not start payment:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not start the payment" }, { status: 502 });
  }
}
