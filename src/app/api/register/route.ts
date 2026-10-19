import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { isEmailConfigured, sendRegistrationConfirmation } from "@/lib/email";
import { isCheckoutSessionUsed, saveRegistration, type CardPayment, type RegistrationInput } from "@/lib/registrations";
import { BANK_METHOD, CARD_METHOD } from "@/lib/payment-methods";
import { isFormLinkPayment, isStripeConfigured, stripe } from "@/lib/stripe";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown, max = 10) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max).map((x) => x.trim().slice(0, 300)) : [];
const yes = (v: unknown) => v === true || v === "Yes";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const isPhone = (v: string) => /^\+?\d{10,15}$/.test(v.replace(/[\s\-().]/g, ""));
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Whole years between a yyyy-mm-dd birth date and today. NaN if the date is not valid. */
function ageOn(dob: string, today: Date): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return NaN;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const birth = new Date(Date.UTC(y, mo - 1, d));
  if (birth.getUTCFullYear() !== y || birth.getUTCMonth() !== mo - 1 || birth.getUTCDate() !== d) return NaN;
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age--;
  return age;
}

/**
 * Receives registrations from the Home Bridge form on vekat.org and stores them in the database
 * shared with the HomeBridge site, so one person has one reference across both.
 *
 * Registrations carry an ID number: it is stored, never logged, and never returned to the browser.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const input: RegistrationInput = {
    email: str(body.email, 120),
    memberType: list(body.memberType, 4),
    cohort: list(body.cohort, 4),
    alsoInterested: list(body.alsoInterested),
    heardFrom: str(body.heardFrom, 80),
    title: str(body.title, 20),
    surname: str(body.surname, 80),
    firstName: str(body.firstName, 80),
    otherNames: str(body.otherNames, 80),
    dateOfBirth: str(body.dateOfBirth, 10),
    sex: str(body.sex, 10),
    nationality: str(body.nationality, 60),
    stateOfOrigin: str(body.stateOfOrigin, 80),
    occupation: str(body.occupation, 100),
    phone: str(body.phone, 40),
    homeAddress: str(body.homeAddress, 300),
    countryOfResidence: str(body.countryOfResidence, 80),
    nigeriaAddress: str(body.nigeriaAddress, 300),
    idType: str(body.idType, 80),
    idNumber: str(body.idNumber, 40),
    idDocsConfirmed: yes(body.idDocsConfirmed),
    nomineeName: str(body.nomineeName, 120),
    nomineeRelationship: str(body.nomineeRelationship, 60),
    nomineePhone: str(body.nomineePhone, 40),
    paymentMethod: "",
    datePaid: str(body.datePaid, 10),
    paymentReference: str(body.paymentReference, 80),
    receiptConfirmed: yes(body.receiptConfirmed),
    sharePlan: str(body.sharePlan, 120),
    declarations: list(body.declarations, 12),
    signature: str(body.signature, 120),
  };

  // The member chooses: bank transfer, or card through Stripe during the form.
  input.paymentMethod = str(body.paymentMethod, 120);
  const byCard = input.paymentMethod === CARD_METHOD;
  const stripeSessionId = str(body.stripeSessionId, 200);

  // The browser checks each step, but a request can arrive without going through the form at all.
  const fields: string[] = [];
  if (!isEmail(input.email)) fields.push("email");
  if (!input.memberType.length) fields.push("memberType");
  if (!input.cohort.length) fields.push("cohort");
  if (!input.title) fields.push("title");
  if (input.firstName.length < 2) fields.push("firstName");
  if (input.surname.length < 2) fields.push("surname");
  if (!isDate(input.dateOfBirth)) fields.push("dateOfBirth");
  if (!input.sex) fields.push("sex");
  if (input.nationality.length < 2) fields.push("nationality");
  if (input.occupation.length < 2) fields.push("occupation");
  if (!isPhone(input.phone)) fields.push("phone");
  if (input.homeAddress.length < 6) fields.push("homeAddress");
  if (input.countryOfResidence.length < 2) fields.push("countryOfResidence");
  if (!input.idType) fields.push("idType");
  if (input.idNumber.length < 6) fields.push("idNumber");
  if (!input.idDocsConfirmed) fields.push("idDocsConfirmed");
  if (input.nomineeName.length < 3) fields.push("nomineeName");
  if (input.nomineeRelationship.length < 2) fields.push("nomineeRelationship");
  if (!isPhone(input.nomineePhone)) fields.push("nomineePhone");
  if (input.paymentMethod !== BANK_METHOD && !byCard) fields.push("paymentMethod");
  if (byCard) {
    if (!stripeSessionId.startsWith("cs_")) fields.push("stripeSessionId");
  } else {
    if (!isDate(input.datePaid)) fields.push("datePaid");
    if (input.paymentReference.length < 3) fields.push("paymentReference");
  }
  if (input.declarations.length < 7) fields.push("declarations");
  if (input.signature.length < 3) fields.push("signature");

  if (fields.length) {
    return NextResponse.json({ ok: false, error: "Some answers need checking", fields }, { status: 422 });
  }

  // Members must be 18 or older: computed here, not trusted from the browser.
  if (!(ageOn(input.dateOfBirth, new Date()) >= 18)) {
    return NextResponse.json({ ok: false, error: "Applicants must be 18 or older", fields: ["dateOfBirth"] }, { status: 422 });
  }

  if (!isDbConfigured()) {
    console.error("[register] MONGODB_URI is not set — the registration was not stored.");
    return NextResponse.json({ ok: false, error: "Registration storage is not configured" }, { status: 503 });
  }

  // The session id from the browser proves nothing: Stripe's own record of it decides.
  let card: CardPayment | null = null;
  if (byCard) {
    if (!isStripeConfigured()) {
      return NextResponse.json({ ok: false, error: "Card payment is not set up yet" }, { status: 503 });
    }
    try {
      const session = await stripe().checkout.sessions.retrieve(stripeSessionId);
      // Paid on the client's Payment Link, opened from this form, and not used by another registration.
      if (!(await isFormLinkPayment(session)) || (await isCheckoutSessionUsed(session.id))) {
        return NextResponse.json(
          { ok: false, error: "We could not confirm your card payment", fields: ["stripeSessionId"] },
          { status: 422 },
        );
      }
      card = {
        amount: session.amount_total,
        currency: session.currency,
        provider: "stripe",
        providerRef: session.payment_intent ? String(session.payment_intent) : session.id,
        eventId: session.id,
      };
    } catch (err) {
      // An id Stripe does not know is the applicant's problem, not an outage.
      if ((err as { type?: string }).type === "StripeInvalidRequestError") {
        return NextResponse.json(
          { ok: false, error: "We could not confirm your card payment", fields: ["stripeSessionId"] },
          { status: 422 },
        );
      }
      console.error("[register] could not check the card payment:", err instanceof Error ? err.message : "unknown error");
      return NextResponse.json({ ok: false, error: "Could not check the card payment" }, { status: 502 });
    }
  }

  try {
    const { reference } = await saveRegistration(input, card);

    // Sent only after the record is safely stored, and a mail failure never fails the
    // registration: the member has their reference on screen either way, and the error is logged
    // so it can be chased. The address is never logged with the error.
    if (isEmailConfigured()) {
      const sent = await sendRegistrationConfirmation({
        to: input.email,
        firstName: input.firstName,
        reference,
        paidByCard: byCard,
      });
      if (!sent.ok) console.error("[register] confirmation email not sent:", sent.error);
    } else {
      console.warn("[register] RESEND_API_KEY is not set — no confirmation email was sent.");
    }

    return NextResponse.json({ ok: true, reference });
  } catch (err) {
    // Never return the error text: a Mongo error can carry the connection string.
    console.error("[register] could not store the registration:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not store registration" }, { status: 502 });
  }
}
