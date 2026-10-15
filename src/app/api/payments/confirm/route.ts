import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { markPaymentVerified } from "@/lib/registrations";
import { isStripeConfigured, stripe } from "@/lib/stripe";

/**
 * Confirms a payment when the payer returns from Stripe.
 *
 * The session id in the URL proves nothing on its own, so the session is fetched from Stripe and
 * its own payment_status decides the outcome: someone typing this URL cannot mark a fee as paid.
 *
 * The webhook is still the reliable path, because it runs whether or not the payer comes back.
 * This only shortens the wait, and records the same payment under the same session id, so the two
 * cannot double-count.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured() || !isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "Payments are not set up" }, { status: 503 });
  }

  let sessionId = "";
  try {
    const body = (await req.json()) as { sessionId?: unknown };
    sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 400 });
  }

  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    const reference = session.client_reference_id || session.metadata?.reference || "";

    if (session.payment_status !== "paid") {
      return NextResponse.json({ ok: true, paid: false });
    }
    // Paid during the form, before a registration exists: it is recorded when the form is submitted.
    if (!reference) {
      const paymentRef = session.payment_intent ? String(session.payment_intent) : session.id;
      return NextResponse.json({ ok: true, paid: true, paymentRef });
    }

    await markPaymentVerified(reference, {
      amount: session.amount_total ?? null,
      currency: session.currency ?? null,
      provider: "stripe",
      providerRef: session.payment_intent ? String(session.payment_intent) : session.id,
      eventId: session.id,
    });

    return NextResponse.json({ ok: true, paid: true, reference });
  } catch (err) {
    console.error("[confirm] could not confirm the payment:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not confirm the payment" }, { status: 502 });
  }
}
