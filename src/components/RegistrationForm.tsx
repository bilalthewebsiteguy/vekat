"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PAYMENT_CHANNEL } from "./PaymentTab";
import { BANK_METHOD, CARD_METHOD, PAY_TOKEN_PREFIX, STRIPE_PAYMENT_LINK } from "@/lib/payment-methods";
import { livesInNigeria } from "@/lib/residence";
import { ReceiptUpload } from "./ReceiptUpload";
import type { ReceiptUpload as Receipt } from "@/lib/receipt";

/** Field ids, in the order they appear, so a server rejection can name the step to go back to. */
const FIELD_STEP: Record<string, number> = {
  email: 0, memberType: 0, cohort: 0,
  title: 1, firstName: 1, surname: 1, dateOfBirth: 1, sex: 1, nationality: 1, occupation: 1,
  phone: 2, homeAddress: 2, countryOfResidence: 2,
  idType: 3, idNumber: 3, idDocsConfirmed: 3,
  nomineeName: 4, nomineeRelationship: 4, nomineePhone: 4,
  paymentMethod: 5, stripeSessionId: 5, datePaid: 5, paymentReference: 5, payerName: 5,
  sharePlan: 6,
  declarations: 7, signature: 7,
};
type Values = Record<string, string | string[]>;

/**
 * Where an unfinished form is kept, so an accidental refresh does not lose it. sessionStorage, not
 * localStorage: the answers include an ID number, and this copy goes when the tab is closed, so the
 * next person on a shared computer never sees it.
 */
const DRAFT_KEY = "vekat-registration-draft";

type Draft = { values?: Values; step?: number; pending?: string; payUrl?: string };

/** Storage has no change events for its own tab, so there is nothing to subscribe to. */
const noSubscribe = () => () => {};

function readDraft() {
  try {
    return sessionStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}

// token: the code sent to Stripe with the payment, which finds that payment again.
type CardState = { state: "idle" | "waiting"; url?: string; token?: string; error?: string };

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const isPhone = (v: string) => /^\+?\d{10,15}$/.test(v.replace(/[\s\-().]/g, ""));

/** Whole years between a yyyy-mm-dd birth date and today. NaN if the date is not valid. */
function age(dob: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return NaN;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const today = new Date();
  let years = today.getFullYear() - y;
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) years--;
  return years;
}

const minLength = (n: number) => (v: string) => v.length >= n;

/**
 * The same checks /api/register makes, so a bad answer is caught on its own step with a reason,
 * rather than bouncing back from the server after the last step.
 */
const RULES: Record<string, [check: (v: string) => boolean, hint: string]> = {
  email: [isEmail, "Enter a valid email address."],
  firstName: [minLength(2), "Enter at least 2 characters."],
  surname: [minLength(2), "Enter at least 2 characters."],
  dateOfBirth: [(v) => age(v) >= 18, "You must be 18 or older to register."],
  nationality: [minLength(2), "Enter at least 2 characters."],
  occupation: [minLength(2), "Enter at least 2 characters."],
  phone: [isPhone, "Enter the full number with 10–15 digits, including the country code (e.g. +2348012345678)."],
  homeAddress: [minLength(6), "Enter your full address."],
  countryOfResidence: [minLength(2), "Enter at least 2 characters."],
  idNumber: [minLength(6), "ID numbers are at least 6 characters."],
  nomineeName: [minLength(3), "Enter your nominee's full name."],
  nomineeRelationship: [minLength(2), "Enter at least 2 characters."],
  nomineePhone: [isPhone, "Enter the full number with 10–15 digits, including the country code (e.g. +2348012345678)."],
  paymentReference: [minLength(3), "Enter at least 3 characters."],
  signature: [minLength(3), "Type your full name."],
};

// No border colour here: each field adds border-line or the error colour, so the two never clash.
const inputClass =
  "w-full rounded-[9px] border-[1.5px] bg-cream px-[13px] py-2 font-sans leading-[normal] text-[14.5px] text-ink outline-none transition-colors duration-150 focus:border-gold-500";
const labelClass = "text-[13px] font-semibold text-green-700";

const TITLES = ["Mr", "Mrs", "Miss", "Ms", "Dr", "Prof", "Chief", "Engr", "Pastor", "Rev", "Other"];

const DECLARATIONS = [
  "I am applying as an individual, in my own name, and I am 18 or older.",
  "I have read and accept the HomeBridge Cooperative bye-laws, including one member, one vote.",
  "I understand the registration fee is non-refundable, is paid to VEKAT Nigeria Limited for processing and vetting, and is not share capital.",
  "I will pay for shares only into the cooperative's own bank account, never in cash or to any private account.",
  "I understand shares are not deposits, can go down as well as up, and carry no guaranteed return.",
  "I agree to VEKAT and the cooperative using my data to process my membership and run the cooperative.",
  "The information I have given is true and complete.",
];

const STEPS = [
  { id: "membership", title: "Membership type", required: ["email", "memberType", "cohort"] },
  {
    id: "personal",
    title: "Personal details",
    required: ["title", "surname", "firstName", "dateOfBirth", "sex", "nationality", "occupation"],
  },
  { id: "contact", title: "Contact details", required: ["phone", "homeAddress", "countryOfResidence"] },
  { id: "identity", title: "Identity", required: ["idType", "idNumber", "idDocsConfirmed"] },
  { id: "nominee", title: "Next of kin", required: ["nomineeName", "nomineeRelationship", "nomineePhone"] },
  // Which fields depends on how the member chooses to pay: see requiredFor().
  { id: "payment", title: "Registration fee", required: [] as string[] },
  { id: "shares", title: "Share plan", required: ["sharePlan"] },
  { id: "declarations", title: "Declarations", required: ["signature"] },
];

const INITIAL: Values = {
  email: "",
  memberType: [],
  cohort: [],
  alsoInterested: [],
  heardFrom: "",
  title: "",
  surname: "",
  firstName: "",
  otherNames: "",
  dateOfBirth: "",
  sex: "",
  nationality: "",
  stateOfOrigin: "",
  occupation: "",
  phone: "",
  homeAddress: "",
  countryOfResidence: "",
  nigeriaAddress: "",
  idType: "",
  idNumber: "",
  idDocsConfirmed: "",
  nomineeName: "",
  nomineeRelationship: "",
  nomineePhone: "",
  paymentMethod: "",
  /** Set only once Stripe confirms the card payment; the server checks it again on submit. */
  stripeSessionId: "",
  datePaid: "",
  paymentReference: "",
  payerName: "",
  receiptConfirmed: "",
  sharePlan: "",
  declarations: [],
  signature: "",
};

export default function RegistrationForm({ sessionId = "", stripeReady = false }: { sessionId?: string; stripeReady?: boolean }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(INITIAL);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState("");
  const [toast, setToast] = useState<{ kind: "ok" | "err"; title: string; body?: string } | null>(null);
  // sessionId is passed down from the server, so the first render matches on both sides.
  const [paidResult, setPaidResult] = useState<"checking" | "paid" | "unpaid" | null>(sessionId ? "checking" : null);

  // Coming back from Stripe: confirm the payment with Stripe itself, so the fee is recorded even
  // before the webhook endpoint exists. The session id alone proves nothing — the server checks it.
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((d: { paid?: boolean; reference?: string }) => {
        if (cancelled) return;
        setPaidResult(d.paid ? "paid" : "unpaid");
        if (d.reference) setReference(d.reference);
      })
      .catch(() => !cancelled && setPaidResult("unpaid"));

    // Keep the reference but drop the query string, so a refresh doesn't re-run this.
    window.history.replaceState({}, "", `${window.location.pathname}#register`);
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Clears itself, so the page is not left with a stale message.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.kind === "ok" ? 12000 : 9000);
    return () => clearTimeout(id);
  }, [toast]);

  // Card payment, for members who choose Stripe. The checkout opens in its own tab so nothing typed here is
  // lost; this page then learns the outcome from that tab, or by asking the server every few seconds.
  const [card, setCard] = useState<CardState>({ state: "idle" });
  // Deliberately not part of `values`: the draft is written to sessionStorage on every keystroke,
  // and a base64 image there would blow the storage quota and lose the whole draft.
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  // Brings back an unfinished form after a refresh, including a card payment still in progress.
  // The server and the first browser render both show the empty form; the saved draft is applied
  // on the render after that, so the page hydrates without a mismatch.
  const savedDraft = useSyncExternalStore(noSubscribe, readDraft, () => null);
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [draftApplied, setDraftApplied] = useState(false);
  if (hydrated && !draftApplied) {
    setDraftApplied(true);
    let draft: Draft | null = null;
    try {
      draft = savedDraft ? (JSON.parse(savedDraft) as Draft) : null;
    } catch {
      // An unreadable draft: start with an empty form.
    }
    if (draft?.values) {
      setValues({ ...INITIAL, ...draft.values });
      setStep(Math.min(Math.max(Number(draft.step) || 0, 0), STEPS.length - 1));
      if (draft.pending && !draft.values.stripeSessionId) {
        setCard({ state: "waiting", url: draft.payUrl, token: draft.pending });
      }
    }
  }

  // Saved on every change, once the draft has been read back, so the empty first render never
  // overwrites it.
  useEffect(() => {
    if (!draftApplied) return;
    try {
      const pending = card.state === "waiting" ? card.token : undefined;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ values, step, pending, payUrl: pending ? card.url : undefined }));
    } catch {
      // Storage full or blocked: the form still works, it just will not survive a refresh.
    }
  }, [draftApplied, values, step, card]);

  useEffect(() => {
    const token = card.token ?? "";
    if (card.state !== "waiting" || !token) return;
    let stopped = false;

    async function check() {
      if (stopped) return;
      try {
        const res = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json().catch(() => ({}))) as { paid?: boolean; sessionId?: string; paymentRef?: string };
        if (stopped) return;

        // The server could not ask Stripe at all. Without this the form polls silently for ever
        // and the payer sees a dead button, which is exactly how this went wrong in testing.
        if (!res.ok) {
          setCard((c) =>
            c.state === "waiting"
              ? {
                  ...c,
                  error:
                    res.status === 503
                      ? "We can't confirm card payments automatically yet. If you have paid, enter the date and the transaction ID from your Stripe receipt below."
                      : "We could not check your payment just now. We will keep trying, or you can enter the date and transaction ID from your Stripe receipt below.",
                }
              : c,
          );
          return;
        }
        if (!data.paid || !data.sessionId) return;
        const sessionId = data.sessionId;
        // Fills in the same date and reference fields a bank payer types, so the step reads the same.
        setValues((v) => ({
          ...v,
          stripeSessionId: sessionId,
          datePaid: new Date().toISOString().slice(0, 10),
          paymentReference: data.paymentRef || sessionId,
        }));
        setErrors((e) => e.filter((x) => x !== "stripeSessionId"));
        setCard({ state: "idle" });
      } catch {
        if (stopped) return;
        setCard((c) =>
          c.state === "waiting"
            ? { ...c, error: "We could not reach the site to check your payment. We will keep trying, or you can enter the date and transaction ID from your Stripe receipt below." }
            : c,
        );
      }
    }

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(PAYMENT_CHANNEL);
      channel.onmessage = (e) => {
        if (e.data === "cancelled") setCard({ state: "idle" });
        else void check();
      };
    } catch {
      // No BroadcastChannel: the timer below still finds the payment.
    }
    const timer = setInterval(check, 4000);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      clearInterval(timer);
      channel?.close();
      window.removeEventListener("focus", check);
    };
  }, [card.state, card.token]);

  function payNow() {
    // The client's Stripe Payment Link, opened in its own tab. The token goes with it as
    // client_reference_id, so the server can find this payment and nobody else's.
    const token = PAY_TOKEN_PREFIX + crypto.randomUUID();
    const url = new URL(STRIPE_PAYMENT_LINK);
    url.searchParams.set("client_reference_id", token);
    if (isEmail(String(values.email ?? ""))) url.searchParams.set("prefilled_email", String(values.email));
    window.open(url.toString(), "_blank");
    setCard({ state: "waiting", url: url.toString(), token });
  }

  const topRef = useRef<HTMLDivElement>(null);

  const set = (name: string, value: string | string[]) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => e.filter((x) => x !== name));
  };

  const toggle = (name: string, option: string) => {
    const current = Array.isArray(values[name]) ? (values[name] as string[]) : [];
    set(name, current.includes(option) ? current.filter((o) => o !== option) : [...current, option]);
  };

  const country = String(values.countryOfResidence ?? "");
  const abroad = Boolean(country.trim()) && !livesInNigeria(country);
  // The member chooses how to pay the fee, wherever they live.
  const byCard = values.paymentMethod === CARD_METHOD;
  const cardPaid = Boolean(values.stripeSessionId);
  // The automatic check failed, so the payer types the date and transaction id from their Stripe
  // receipt instead of being stuck behind two fields they cannot edit.
  // Also true before anyone clicks Pay: with no Stripe key the site can never confirm a payment,
  // so holding the member behind a confirmation would be a dead end with no way out.
  const cardManual = (Boolean(card.error) || !stripeReady) && !cardPaid;

  function requiredFor(index: number) {
    if (STEPS[index].id !== "payment") return STEPS[index].required;
    // The date and transaction id are optional: a member may upload a receipt instead, or send one
    // within 7 days. A card payment the site can confirm still has to be there, because that proof
    // is free and already in hand.
    if (byCard && !cardManual) return ["paymentMethod", "stripeSessionId"];
    return ["paymentMethod"];
  }

  function choosePayment(method: string) {
    // A card payment already made stays chosen, so it cannot be lost by switching.
    if (cardPaid || method === values.paymentMethod) return;
    // The date and reference belong to the old choice: Stripe fills them in itself.
    setValues((v) => ({ ...v, paymentMethod: method, datePaid: "", paymentReference: "", payerName: "" }));
    setErrors((e) => e.filter((x) => !["paymentMethod", "stripeSessionId", "datePaid", "paymentReference"].includes(x)));
  }

  function validate(index: number) {
    const missing = requiredFor(index).filter((name) => {
      const v = values[name];
      if (Array.isArray(v)) return v.length === 0;
      const text = String(v ?? "").trim();
      return !text || (RULES[name] ? !RULES[name][0](text) : false);
    });
    if (STEPS[index].id === "declarations" && (values.declarations as string[]).length < DECLARATIONS.length) {
      missing.push("declarations");
    }
    setErrors(missing);
    return missing.length === 0;
  }

  function goTo(index: number) {
    setStep(index);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function next() {
    if (validate(step)) goTo(step + 1);
  }

  function back() {
    setErrors([]);
    goTo(step - 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate(step)) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, receipt }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reference?: string; fields?: string[] };

      if (res.ok && data.ok && data.reference) {
        setReference(data.reference);
        setValues(INITIAL);
        setErrors([]);
        setStep(0);
        setCard({ state: "idle" });
        setReceipt(null);
        try {
          sessionStorage.removeItem(DRAFT_KEY);
        } catch {
          // Nothing to clear.
        }
        setToast({
          kind: "ok",
          title: `Registration received — ${data.reference}`,
          body: cardPaid
            ? "Your £10 registration fee has been paid. Keep your reference; we will follow up by email."
            : "Keep your reference. We will confirm your ₦10,000 bank transfer and follow up by email.",
        });
        requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
        return;
      }

      // The server checks the same answers again. If it rejects one, go back to its step.
      if (res.status === 422 && data.fields?.length) {
        const first = data.fields[0];
        const target = FIELD_STEP[first] ?? 0;
        setErrors(data.fields);
        // A card payment the server could not confirm is not shown as paid any more.
        if (data.fields.includes("stripeSessionId")) setValues((v) => ({ ...v, stripeSessionId: "" }));
        setStep(target);
        setToast({ kind: "err", title: "Some answers need checking", body: "We've marked them below." });
        requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
        return;
      }

      setToast({
        kind: "err",
        title: "We could not send your registration",
        body:
          res.status === 503
            ? "Registrations aren't being accepted just now. Please try again later, or email info@homebridgecooperative.org."
            : "Please try again, or email info@homebridgecooperative.org.",
      });
    } catch {
      setToast({
        kind: "err",
        title: "We could not reach the server",
        body: "Your answers are still here — please try again in a moment.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (paidResult) {
    return (
      <div
        ref={topRef}
        className="rounded-[20px] border border-line bg-white p-6 shadow-[0_20px_50px_rgba(27,67,50,.08)] lg:p-7"
      >
        {paidResult === "checking" && <h3 className="m-0 text-[21px]">Checking your payment…</h3>}
        {paidResult === "paid" && (
          <>
            <h3 className="m-0 text-[21px]">Payment received</h3>
            <p className="mt-3 mb-0 text-[14.5px] text-muted">
              Thank you. Your £10 registration fee has been received and matched to your membership
              {reference ? (
                <>
                  {" "}
                  reference <strong className="font-mono text-green-700">{reference}</strong>
                </>
              ) : null}
              . It now shows as verified to the membership team — you do not need to email a receipt.
            </p>
          </>
        )}
        {paidResult === "unpaid" && (
          <>
            <h3 className="m-0 text-[21px]">We could not confirm that payment</h3>
            <p className="mt-3 mb-0 text-[14.5px] text-muted">
              If you completed the payment, it may still be processing — it will be matched to your registration shortly. If you were
              charged and nothing changes, email info@homebridgecooperative.org with your reference.
            </p>
          </>
        )}
      </div>
    );
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div
      ref={topRef}
      className="rounded-[20px] border border-line bg-white p-6 shadow-[0_20px_50px_rgba(27,67,50,.08)] lg:p-7"
    >
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="m-0 text-[21px]">Member Registration</h3>
        <p className="m-0 text-[13px] text-muted">
          Step {step + 1} of {STEPS.length} · {STEPS[step].title}
        </p>
      </div>

      <div className="mb-5 flex gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <span
            key={s.id}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-gold-500" : "bg-line"}`}
          />
        ))}
      </div>

      {errors.length > 0 && (
        <div
          role="alert"
          className="mb-4 rounded-[10px] border border-[#F0C4C4] bg-[#FBEAEA] px-4 py-[13px] text-[14px] text-[#8A3131]"
        >
          Please check the highlighted fields before continuing.
        </div>
      )}

      <form onSubmit={isLast ? handleSubmit : (e) => { e.preventDefault(); next(); }}>
        {step === 0 && (
          <Section>
            <Text
              name="email"
              label="Email address *"
              type="email"
              placeholder="you@example.com"
              values={values}
              errors={errors}
              set={set}
              full
            />
            <Radios
              multiple
              name="memberType"
              label="I am joining as (tick all that apply) *"
              options={[
                "Home member — I live in Nigeria (registration fee ₦10,000)",
                "Diaspora member — I live outside Nigeria (registration fee £10)",
              ]}
              shortLabels={["Home member", "Diaspora member"]}
              values={values}
              errors={errors}
              set={set}
            />
            <Radios
              multiple
              name="cohort"
              label="Which cooperative/cohort do you want to join? (tick all that apply) *"
              options={["Edo State (Benin City)", "Abuja FCT"]}
              values={values}
              errors={errors}
              set={set}
            />
            <Checks
              name="alsoInterested"
              label="I am also interested in (optional)"
              options={[
                "Founding member block (₦2,000,000 or £1,000 — first 12 months only)",
                "Professional member — I can offer skills (finance, law, health, engineering, IT, agriculture, etc.)",
                "Helping to run a chapter abroad",
              ]}
              values={values}
              toggle={toggle}
            />
            <Radios
              name="heardFrom"
              label="How did you hear about HomeBridge?"
              options={["WhatsApp group", "Zoom presentation", "Friend or family", "Social media", "Flyer", "Other"]}
              values={values}
              errors={errors}
              set={set}
            />
          </Section>
        )}

        {step === 1 && (
          <Section>
            <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
              <Select name="title" label="Title *" options={TITLES} values={values} errors={errors} set={set} />
              <Text name="surname" label="Surname *" values={values} errors={errors} set={set} />
              <Text name="firstName" label="First name *" values={values} errors={errors} set={set} />
              <Text name="otherNames" label="Other names" values={values} errors={errors} set={set} />
              <Text name="dateOfBirth" label="Date of birth *" type="date" values={values} errors={errors} set={set} />
              <Text
                name="nationality"
                label="Nationality *"
                placeholder="e.g. Nigerian"
                values={values}
                errors={errors}
                set={set}
              />
              <Text
                name="stateOfOrigin"
                label="State of origin (Nigeria) / LGA"
                values={values}
                errors={errors}
                set={set}
              />
              <Text
                name="occupation"
                label="Occupation / profession *"
                values={values}
                errors={errors}
                set={set}
              />
            </div>
            <Radios
              name="sex"
              label="Sex *"
              options={["Male", "Female"]}
              values={values}
              errors={errors}
              set={set}
            />
          </Section>
        )}

        {step === 2 && (
          <Section>
            <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
              <Text
                name="phone"
                label="Phone / WhatsApp number *"
                type="tel"
                placeholder="+234… or +44…"
                values={values}
                errors={errors}
                set={set}
              />
              <Text
                name="countryOfResidence"
                label="Country of residence *"
                placeholder="e.g. Nigeria, United Kingdom"
                values={values}
                errors={errors}
                set={set}
              />
            </div>
            <Area
              name="homeAddress"
              label="Home address (where you live now) *"
              values={values}
              errors={errors}
              set={set}
            />
            {abroad && (
              <Area
                name="nigeriaAddress"
                label="Address or family home/land in Edo State or Abuja FCT (if any)"
                values={values}
                errors={errors}
                set={set}
              />
            )}
          </Section>
        )}

        {step === 3 && (
          <Section>
            <Radios
              name="idType"
              label="ID type *"
              options={[
                "NIN (National Identification Number)",
                "BVN",
                "International passport",
                "Non-Resident BVN",
                "UK/EU/other national ID or driving licence",
              ]}
              values={values}
              errors={errors}
              set={set}
            />
            <Text name="idNumber" label="ID number *" values={values} errors={errors} set={set} full />
            <Confirm
              name="idDocsConfirmed"
              label="I have emailed (or will email within 7 days) a copy of my ID and proof of address to info@homebridgecooperative.org"
              values={values}
              errors={errors}
              set={set}
            />
          </Section>
        )}

        {step === 4 && (
          <Section>
            <p className="mt-0 mb-1 text-[13.5px] text-muted">
              The person you nominate to act on your membership if you are unable to.
            </p>
            <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
              <Text name="nomineeName" label="Nominee full name *" values={values} errors={errors} set={set} />
              <Text
                name="nomineeRelationship"
                label="Relationship to you *"
                placeholder="e.g. spouse, brother"
                values={values}
                errors={errors}
                set={set}
              />
              <Text
                name="nomineePhone"
                label="Nominee phone number *"
                type="tel"
                values={values}
                errors={errors}
                set={set}
              />
            </div>
          </Section>
        )}

        {step === 5 && (
          <Section>
            {byCard ? (
              <div className="rounded-xl border border-dashed border-gold-500 bg-cream-dim p-[18px]">
                <p className="m-0 text-[13.5px] text-muted">
                  Pay the one-off, non-refundable registration fee of <strong>£10</strong> by card. Click{" "}
                  <strong>Pay now by Stripe</strong> below: the secure Stripe payment page opens in a new tab and closes when
                  you have paid.
                </p>
              </div>
            ) : (
              <BankDetails />
            )}
            <PaymentMethod
              value={String(values.paymentMethod ?? "")}
              locked={cardPaid}
              bad={errors.includes("paymentMethod")}
              onChange={choosePayment}
            />
            {byCard && (
              <CardPay
                paid={cardPaid}
                manual={cardManual && !card.error}
                waiting={card.state === "waiting"}
                error={card.error}
                payUrl={card.url}
                bad={errors.includes("stripeSessionId")}
                onPay={payNow}
              />
            )}
            <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
              <Text
                name="datePaid"
                label="Date paid"
                type="date"
                values={values}
                errors={errors}
                set={set}
                readOnly={byCard && !cardManual}
              />
              <Text
                name="paymentReference"
                label="Payment reference or transaction ID"
                placeholder={byCard && !cardPaid && !cardManual ? "Filled in when you pay" : undefined}
                values={values}
                errors={errors}
                set={set}
                readOnly={byCard && !cardManual}
              />
            </div>
            <Text
              name="payerName"
              label="If someone else paid for you, what name is on their account?"
              placeholder="Leave blank if you paid yourself"
              values={values}
              errors={errors}
              set={set}
            />
            <ReceiptUpload value={receipt} onChange={setReceipt} />
            <Confirm
              name="receiptConfirmed"
              label="I have emailed my payment receipt to info@homebridgecooperative.org"
              values={values}
              errors={errors}
              set={set}
            />
          </Section>
        )}

        {step === 6 && (
          <Section>
            <Radios
              name="sharePlan"
              label="I plan to contribute *"
              options={[
                "Home minimum — ₦5,000 a month (5 shares)",
                "Diaspora minimum — £25 a month",
                "Founding block — ₦2,000,000 or £1,000",
                "Other",
              ]}
              values={values}
              errors={errors}
              set={set}
            />
            <p className="m-0 text-[13px] text-muted">
              Shares are ₦1,000 each and are paid only into the cooperative&apos;s own bank account, which you receive
              in your approval letter.
            </p>
          </Section>
        )}

        {step === 7 && (
          <Section>
            <div className="flex flex-col gap-2.5">
              <span className={labelClass}>Please tick every box to confirm *</span>
              {DECLARATIONS.map((d) => (
                <label key={d} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-muted">
                  <input
                    type="checkbox"
                    checked={(values.declarations as string[]).includes(d)}
                    onChange={() => toggle("declarations", d)}
                    className="mt-[3px] shrink-0 accent-green-700"
                  />
                  <span>{d}</span>
                </label>
              ))}
              {errors.includes("declarations") && (
                <span className="text-[12.5px] text-[#8A3131]">Please tick every box to continue.</span>
              )}
            </div>
            <Text
              name="signature"
              label="Type your full name as your signature *"
              values={values}
              errors={errors}
              set={set}
              full
            />
          </Section>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {step > 0 && (
            <button type="button" onClick={back} className="btn btn-outline flex-1 justify-center">
              ← Back
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary flex-[2] justify-center disabled:opacity-70"
          >
            {isLast ? (submitting ? "Submitting…" : "Submit Registration") : "Next →"}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Fixed to the corner so it is seen wherever the page is scrolled. role="status" announces it to a
 * screen reader without stealing focus, which matters when it appears after a submit.
 */
function Toast({ toast, onClose }: { toast: { kind: "ok" | "err"; title: string; body?: string } | null; onClose: () => void }) {
  if (!toast) return null;
  const ok = toast.kind === "ok";
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-4 z-50 w-[min(380px,calc(100vw-2rem))]"
    >
      <div
        className={`flex gap-3 rounded-[14px] border px-4 py-3.5 shadow-[0_12px_32px_rgba(27,67,50,.18)] ${
          ok ? "border-[#BFDAC8] bg-[#EAF3EC]" : "border-[#F0C4C4] bg-[#FBEAEA]"
        }`}
      >
        <span
          aria-hidden
          className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white ${
            ok ? "bg-green-700" : "bg-[#8A3131]"
          }`}
        >
          {ok ? "\u2713" : "!"}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`m-0 text-[14.5px] font-semibold ${ok ? "text-green-700" : "text-[#8A3131]"}`}>{toast.title}</p>
          {toast.body && <p className="mt-1 mb-0 text-[13.5px] leading-snug text-muted">{toast.body}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="-mt-1 -mr-1 size-8 shrink-0 cursor-pointer rounded-full text-[18px] leading-none text-muted hover:bg-black/5"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

/** Both ways to pay, open to every member: they choose. */
function PaymentMethod({
  value,
  locked,
  bad,
  onChange,
}: {
  value: string;
  locked: boolean;
  bad: boolean;
  onChange: (method: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelClass}>How did you pay the registration fee? *</span>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {[BANK_METHOD, CARD_METHOD].map((label) => {
          const on = value === label;
          const off = locked && !on;
          return (
            <label
              key={label}
              className={`flex flex-1 items-center gap-[7px] rounded-[9px] border-[1.5px] px-3 py-[9px] text-[14px] leading-snug sm:min-w-[180px] ${
                on ? "border-gold-500 bg-cream" : bad ? "border-[#C06A6A]" : "border-line"
              } ${off ? "opacity-55" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={label}
                checked={on}
                disabled={off}
                onChange={() => onChange(label)}
                className="shrink-0 accent-green-700"
              />
              <span>{label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function CardPay({
  paid,
  manual,
  waiting,
  error,
  payUrl,
  bad,
  onPay,
}: {
  paid: boolean;
  /** Card payments cannot be confirmed automatically, so the member enters the details. */
  manual: boolean;
  waiting: boolean;
  error?: string;
  payUrl?: string;
  bad: boolean;
  onPay: () => void;
}) {
  if (paid) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-xl border border-[#BFDAC8] bg-[#EAF3EC] p-[18px]">
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-green-700 text-[13px] font-bold text-white">
          {"\u2713"}
        </span>
        <div>
          <p className="m-0 text-[15px] font-semibold text-green-700">Payment completed</p>
          <p className="m-0 text-[13.5px] text-muted">Your £10 registration fee has been received. You can continue to the next step.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={onPay}
        className="btn btn-primary justify-center"
      >
        {waiting ? "Open the payment page again" : "Pay now by Stripe"}
      </button>

      {waiting && !error && (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-[#E0DCD2] bg-[#F6F5F2] p-[18px]">
          <span
            aria-hidden
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-[#C9C3B5] border-t-[#1c1b19]"
          />
          <div>
            <p className="m-0 text-[15px] font-semibold">Waiting for your payment</p>
            <p className="m-0 text-[13.5px] text-muted">
              Finish paying in the Stripe tab. This page updates by itself, so keep it open.
            </p>
          </div>
        </div>
      )}

      {/* A failed check used to be silent, so the payer saw nothing at all and could not continue. */}
      {error && (
        <div role="status" className="rounded-xl border border-[#E6C9A8] bg-[#FBF2E7] p-[18px]">
          <p className="m-0 text-[15px] font-semibold text-[#7A4F18]">We could not confirm your payment automatically</p>
          <p className="m-0 mt-1 text-[13.5px] text-[#7A4F18]">{error}</p>
          {payUrl && (
            <p className="m-0 mt-2 text-[13px]">
              <a href={payUrl} target="_blank" rel="noopener noreferrer" className="underline">
                Open the payment page again
              </a>
            </p>
          )}
        </div>
      )}

      {manual && !waiting && (
        <p className="m-0 text-[13px] text-muted">
          After paying, enter the date and the transaction ID from your Stripe receipt below, or upload the receipt.
        </p>
      )}

      {bad && (
        <p className="m-0 text-[13px] text-[#8A3131]">Please pay the registration fee before continuing.</p>
      )}
    </div>
  );
}

function BankDetails() {
  return (
    <div className="rounded-xl border border-dashed border-gold-500 bg-cream-dim p-[18px] text-[13.5px] text-muted">
      <p className="m-0 mb-2">
        Pay the one-off, non-refundable registration fee of <strong>₦10,000</strong> by bank transfer:
      </p>
      <p className="m-0">
        <strong className="text-green-700">VEKAT Nigeria Limited</strong>
        <br />
        First Bank · Account number 2049483671
        <br />
        Use your full name as the payment reference.
      </p>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

type FieldProps = {
  name: string;
  label: string;
  values: Values;
  errors: string[];
  set: (name: string, value: string | string[]) => void;
  placeholder?: string;
  type?: string;
  full?: boolean;
  readOnly?: boolean;
};

function Text({ name, label, values, errors, set, placeholder, type = "text", full, readOnly }: FieldProps) {
  const bad = errors.includes(name);
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "md:col-span-2" : ""}`}>
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <input
        id={name}
        type={type}
        value={String(values[name] ?? "")}
        placeholder={placeholder}
        onChange={(e) => set(name, e.target.value)}
        readOnly={readOnly}
        aria-invalid={bad}
        className={`${inputClass} ${bad ? "border-[#C06A6A]" : "border-line"} ${readOnly ? "cursor-default text-muted" : ""}`}
      />
      {bad && <Hint name={name} />}
    </div>
  );
}

function Hint({ name }: { name: string }) {
  const hint = RULES[name]?.[1];
  return hint ? <p className="m-0 text-[12.5px] text-[#8A3131]">{hint}</p> : null;
}

function Area({ name, label, values, errors, set, placeholder }: FieldProps) {
  const bad = errors.includes(name);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <textarea
        id={name}
        rows={3}
        value={String(values[name] ?? "")}
        placeholder={placeholder}
        onChange={(e) => set(name, e.target.value)}
        aria-invalid={bad}
        className={`${inputClass} resize-y ${bad ? "border-[#C06A6A]" : "border-line"}`}
      />
      {bad && <Hint name={name} />}
    </div>
  );
}

function Select({ name, label, options, values, errors, set }: FieldProps & { options: string[] }) {
  const bad = errors.includes(name);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <select
        id={name}
        value={String(values[name] ?? "")}
        onChange={(e) => set(name, e.target.value)}
        aria-invalid={bad}
        className={`${inputClass} ${bad ? "border-[#C06A6A]" : "border-line"}`}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Radios({
  name,
  label,
  options,
  shortLabels,
  multiple,
  values,
  errors,
  set,
}: FieldProps & { options: string[]; shortLabels?: string[]; multiple?: boolean }) {
  const bad = errors.includes(name);
  // With `multiple`, the same cards act as checkboxes and the value is the list of ticked options.
  const selected = multiple && Array.isArray(values[name]) ? (values[name] as string[]) : [];
  const isOn = (o: string) => (multiple ? selected.includes(o) : values[name] === o);
  const choose = (o: string) =>
    multiple ? set(name, isOn(o) ? selected.filter((x) => x !== o) : [...selected, o]) : set(name, o);
  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {options.map((o, i) => (
          <label
            key={o}
            className={`flex flex-1 cursor-pointer items-center gap-[7px] rounded-[9px] border-[1.5px] px-3 py-[9px] text-[14px] leading-snug sm:min-w-[180px] ${
              isOn(o) ? "border-gold-500 bg-cream" : bad ? "border-[#C06A6A]" : "border-line"
            }`}
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={o}
              checked={isOn(o)}
              onChange={() => choose(o)}
              className="shrink-0 accent-green-700"
            />
            <span>{shortLabels?.[i] ?? o}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Checks({
  name,
  label,
  options,
  values,
  toggle,
}: {
  name: string;
  label: string;
  options: string[];
  values: Values;
  toggle: (name: string, option: string) => void;
}) {
  const selected = (values[name] as string[]) ?? [];
  return (
    <div className="flex flex-col gap-2">
      <span className={labelClass}>{label}</span>
      {options.map((o) => (
        <label key={o} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-muted">
          <input
            type="checkbox"
            checked={selected.includes(o)}
            onChange={() => toggle(name, o)}
            className="mt-[3px] shrink-0 accent-green-700"
          />
          <span>{o}</span>
        </label>
      ))}
    </div>
  );
}

function Confirm({ name, label, values, errors, set }: FieldProps) {
  const bad = errors.includes(name);
  return (
    <label
      className={`flex items-start gap-2.5 text-[13.5px] leading-snug ${bad ? "text-[#8A3131]" : "text-muted"}`}
    >
      <input
        type="checkbox"
        checked={values[name] === "Yes"}
        onChange={(e) => set(name, e.target.checked ? "Yes" : "")}
        className="mt-[3px] shrink-0 accent-green-700"
      />
      <span>{label}</span>
    </label>
  );
}
