import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { findMemberByReference } from "@/lib/registrations";
import { JOINING_FEE, isStripeConfigured, stripe } from "@/lib/stripe";

/**
 * Starts a card payment for a registration that has already been submitted.
 *
 * The member's reference travels with the payment as client_reference_id, so the webhook that
 * follows can mark the right person's fee as verified without anyone matching it by hand.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured() || !isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "Card payment is not set up yet" }, { status: 503 });
  }

  let reference = "";
  try {
    const body = (await req.json()) as { reference?: unknown };
    reference = typeof body.reference === "string" ? body.reference.trim() : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  // Only a reference that exists can be paid for, so the endpoint cannot be used to create
  // arbitrary checkout sessions.
  const member = reference ? await findMemberByReference(reference) : null;
  if (!member) {
    return NextResponse.json({ ok: false, error: "We could not find that registration" }, { status: 404 });
  }
  if (member.payment?.status === "Verified") {
    return NextResponse.json({ ok: false, error: "This fee has already been paid" }, { status: 409 });
  }

  const origin = new URL(req.url).origin;
  const fee = JOINING_FEE.diaspora;

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: member.reference,
      customer_email: member.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: fee.currency,
            unit_amount: fee.amount,
            product_data: {
              name: fee.label,
              description: `One-off, non-refundable registration fee · ${member.reference}`,
            },
          },
        },
      ],
      metadata: { reference: member.reference, purpose: "registration_fee" },
      success_url: `${origin}/?paid=1&ref=${encodeURIComponent(member.reference)}#register`,
      cancel_url: `${origin}/?paid=0#register`,
    });

    if (!session.url) throw new Error("Stripe returned no checkout URL");
    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[checkout] could not start payment:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not start the payment" }, { status: 502 });
  }
}
