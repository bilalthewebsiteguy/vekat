"use client";

import { useEffect, useRef, useState } from "react";

type Status = { kind: "ok" | "err"; message: string } | null;

/** Field ids, in the order they appear, so a server rejection can name the step to go back to. */
const FIELD_STEP: Record<string, number> = {
  email: 0, memberType: 0, cohort: 0,
  title: 1, firstName: 1, surname: 1, dateOfBirth: 1, sex: 1, nationality: 1, occupation: 1,
  phone: 2, homeAddress: 2, countryOfResidence: 2,
  idType: 3, idNumber: 3, idDocsConfirmed: 3,
  nomineeName: 4, nomineeRelationship: 4, nomineePhone: 4,
  paymentMethod: 5, datePaid: 5, paymentReference: 5,
  sharePlan: 6,
  declarations: 7, signature: 7,
};
type Values = Record<string, string | string[]>;

const inputClass =
  "w-full rounded-[9px] border-[1.5px] border-line bg-cream px-[13px] py-2 font-sans leading-[normal] text-[14.5px] text-ink outline-none transition-colors duration-150 focus:border-gold-500";
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
  { id: "payment", title: "Registration fee", required: ["paymentMethod", "datePaid", "paymentReference"] },
  { id: "shares", title: "Share plan", required: ["sharePlan"] },
  { id: "declarations", title: "Declarations", required: ["signature"] },
];

const INITIAL: Values = {
  email: "",
  memberType: "",
  cohort: "",
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
  datePaid: "",
  paymentReference: "",
  receiptConfirmed: "",
  sharePlan: "",
  declarations: [],
  signature: "",
};

export default function RegistrationForm({ sessionId = "" }: { sessionId?: string }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(INITIAL);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [reference, setReference] = useState("");
  const [payError, setPayError] = useState("");
  // Passed down from the server, so the first render matches on both sides.
  const [paidResult, setPaidResult] = useState<"checking" | "paid" | "unpaid" | null>(sessionId ? "checking" : null);
  const [paying, setPaying] = useState(false);

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

  async function startCardPayment() {
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
      if (res.ok && data.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setPayError(data.error || "Could not start the payment. Please try again.");
    } catch {
      setPayError("Could not reach the payment page. Please try again.");
    } finally {
      setPaying(false);
    }
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

  const isDiaspora = values.memberType === "Diaspora member";

  function validate(index: number) {
    const missing = STEPS[index].required.filter((name) => {
      const v = values[name];
      return Array.isArray(v) ? v.length === 0 : !String(v ?? "").trim();
    });
    if (STEPS[index].id === "declarations" && (values.declarations as string[]).length < DECLARATIONS.length) {
      missing.push("declarations");
    }
    setErrors(missing);
    return missing.length === 0;
  }

  function goTo(index: number) {
    setStep(index);
    setStatus(null);
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
    setStatus(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reference?: string; fields?: string[] };

      if (res.ok && data.ok && data.reference) {
        setReference(data.reference);
        setDone(true);
        requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
        return;
      }

      // The server checks the same answers again. If it rejects one, go back to its step.
      if (res.status === 422 && data.fields?.length) {
        const first = data.fields[0];
        const target = FIELD_STEP[first] ?? 0;
        setErrors(data.fields);
        setStep(target);
        setStatus({ kind: "err", message: "Some answers need checking — we've marked them below." });
        requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
        return;
      }

      setStatus({
        kind: "err",
        message:
          res.status === 503
            ? "Registrations aren't being accepted just now. Please try again later, or email admin@vekat.org."
            : "Something went wrong sending your registration. Please try again, or email admin@vekat.org.",
      });
    } catch {
      setStatus({
        kind: "err",
        message: "We couldn't reach the server. Your answers are still here — please try again in a moment.",
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
              charged and nothing changes, email admin@vekat.org with your reference.
            </p>
          </>
        )}
      </div>
    );
  }

  if (done) {
    return (
      <div
        ref={topRef}
        className="rounded-[20px] border border-line bg-white p-6 shadow-[0_20px_50px_rgba(27,67,50,.08)] lg:p-7"
      >
        <h3 className="m-0 text-[21px]">Registration received</h3>
        {reference && (
          <p className="mt-3 mb-0 text-[14.5px] text-muted">
            Your reference is <strong className="font-mono text-green-700">{reference}</strong>. Keep it — quote it in any email about your
            membership.
          </p>
        )}
        <p className="mt-3 text-[14.5px] text-muted">
          Thank you. VEKAT Nigeria Limited will carry out identity checks and vetting, and the Membership Committee
          makes the final decision. You will hear from us by email.
        </p>
        <p className="m-0 text-[14.5px] text-muted">
          If you have not paid your registration fee yet, please complete it now.
        </p>
        <div className="mt-4">
          {isDiaspora ? (
            <>
              <button
                type="button"
                onClick={startCardPayment}
                disabled={paying || !reference}
                className="btn btn-primary w-full justify-center disabled:opacity-70"
              >
                {paying ? "Opening payment page…" : "Pay £10 Registration Fee →"}
              </button>
              {payError && (
                <p role="alert" className="mt-3 mb-0 text-[13.5px] font-medium text-[#8A3131]">
                  {payError}
                </p>
              )}
              <p className="mt-3 mb-0 text-[13px] text-muted">
                You pay by card on Stripe&apos;s secure page. Your payment is matched to reference{" "}
                <strong className="font-mono text-green-700">{reference}</strong> automatically.
              </p>
            </>
          ) : (
            <BankDetails />
          )}
        </div>
      </div>
    );
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div
      ref={topRef}
      className="rounded-[20px] border border-line bg-white p-6 shadow-[0_20px_50px_rgba(27,67,50,.08)] lg:p-7"
    >
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

      {status && (
        <div
          role="status"
          className={`mb-4 rounded-[10px] border px-4 py-[13px] text-[14px] ${
            status.kind === "ok"
              ? "border-[#BFDAC8] bg-[#EAF3EC] text-green-700"
              : "border-[#F0C4C4] bg-[#FBEAEA] text-[#8A3131]"
          }`}
        >
          {status.message}
        </div>
      )}

      {errors.length > 0 && (
        <div
          role="alert"
          className="mb-4 rounded-[10px] border border-[#F0C4C4] bg-[#FBEAEA] px-4 py-[13px] text-[14px] text-[#8A3131]"
        >
          Please complete the highlighted fields before continuing.
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
              name="memberType"
              label="I am joining as *"
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
              name="cohort"
              label="Which cooperative/cohort do you want to join? *"
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
            {isDiaspora && (
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
              label="I have emailed (or will email within 7 days) a copy of my ID and proof of address to admin@vekat.org"
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
            {isDiaspora ? (
              <div className="rounded-xl border border-dashed border-gold-500 bg-cream-dim p-[18px]">
                <p className="m-0 text-[13.5px] text-muted">
                  Diaspora members pay a one-off, non-refundable registration fee of <strong>£10</strong> by card. You can pay it on the next
                  screen, as soon as you have finished this form — paying there attaches the payment to your membership reference
                  automatically. If you have already paid another way, fill in the details below.
                </p>
              </div>
            ) : (
              <BankDetails />
            )}
            <Radios
              name="paymentMethod"
              label="How did you pay the registration fee? *"
              options={[
                "Bank transfer to VEKAT First Bank 2049483671 (₦10,000)",
                "Secure card payment link (£10)",
              ]}
              values={values}
              errors={errors}
              set={set}
            />
            <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
              <Text name="datePaid" label="Date paid *" type="date" values={values} errors={errors} set={set} />
              <Text
                name="paymentReference"
                label="Payment reference or transaction ID *"
                values={values}
                errors={errors}
                set={set}
              />
            </div>
            <Confirm
              name="receiptConfirmed"
              label="I have emailed my payment receipt to admin@vekat.org"
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

function BankDetails() {
  return (
    <div className="rounded-xl border border-dashed border-gold-500 bg-cream-dim p-[18px] text-[13.5px] text-muted">
      <p className="m-0 mb-2">
        Home members pay a one-off, non-refundable registration fee of <strong>₦10,000</strong> by bank transfer:
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
};

function Text({ name, label, values, errors, set, placeholder, type = "text", full }: FieldProps) {
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
        className={`${inputClass} ${bad ? "border-[#C06A6A]" : ""}`}
      />
    </div>
  );
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
        className={`${inputClass} resize-y ${bad ? "border-[#C06A6A]" : ""}`}
      />
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
        className={`${inputClass} ${bad ? "border-[#C06A6A]" : ""}`}
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
  values,
  errors,
  set,
}: FieldProps & { options: string[]; shortLabels?: string[] }) {
  const bad = errors.includes(name);
  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {options.map((o, i) => (
          <label
            key={o}
            className={`flex flex-1 cursor-pointer items-center gap-[7px] rounded-[9px] border-[1.5px] px-3 py-[9px] text-[14px] leading-snug sm:min-w-[180px] ${
              values[name] === o ? "border-gold-500 bg-cream" : bad ? "border-[#C06A6A]" : "border-line"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o}
              checked={values[name] === o}
              onChange={() => set(name, o)}
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
