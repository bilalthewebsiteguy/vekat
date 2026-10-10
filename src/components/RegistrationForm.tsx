"use client";

import { useRef, useState } from "react";

// Google Apps Script Web App URL that appends each registration to a Google Sheet.
// See the developer brief (Section 3) for setup; set it in .env.local / your host's env vars.
// Looks like: https://script.google.com/macros/s/XXXXXXXX/exec
const REGISTRATION_ENDPOINT = process.env.NEXT_PUBLIC_REGISTRATION_ENDPOINT ?? "";

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/8x214nbjMdZg2gddNI8IU00";

type Status = { kind: "ok" | "err"; message: string } | null;

const inputClass =
  "rounded-[9px] border-[1.5px] border-line bg-cream px-[13px] py-[11px] font-sans leading-[normal] text-[14.5px] text-ink outline-none transition-colors duration-150 focus:border-gold-500";
const labelClass = "text-[13px] font-semibold text-green-700";

export default function RegistrationForm() {
  const [status, setStatus] = useState<Status>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const payRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    if (!REGISTRATION_ENDPOINT) {
      setStatus({
        kind: "err",
        message:
          "Registration storage isn't connected yet — see the developer brief to finish setup (NEXT_PUBLIC_REGISTRATION_ENDPOINT).",
      });
      return;
    }

    const fd = new FormData(form);
    const value = (name: string) => String(fd.get(name) ?? "").trim();
    const data = {
      fullName: value("fullName"),
      email: value("email"),
      phone: value("phone"),
      country: value("country"),
      memberType: value("memberType"),
      location: value("location"),
      occupation: value("occupation"),
      notes: value("notes"),
      submittedAt: new Date().toISOString(),
      source: "vekat.org website",
    };

    setSubmitting(true);
    try {
      await fetch(REGISTRATION_ENDPOINT, {
        method: "POST",
        mode: "no-cors", // Apps Script web apps don't return readable CORS headers
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data),
      });
      setStatus({
        kind: "ok",
        message: "Registration received — thank you! Please complete your payment below to finish joining.",
      });
      form.reset();
      setShowPay(true);
      requestAnimationFrame(() => payRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } catch {
      setStatus({
        kind: "err",
        message:
          "Something went wrong sending your registration. Please try again, or email info@homebridge.org directly.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[20px] border border-line bg-white p-[34px] shadow-[0_20px_50px_rgba(27,67,50,.08)]">
      <h3 className="mb-1 text-[21px]">Member Registration</h3>
      <p className="mb-[26px] text-[14px] text-muted">Fields marked * are required.</p>

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

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="fullName" label="Full name *">
            <input type="text" id="fullName" name="fullName" required placeholder="As on your ID" className={inputClass} />
          </Field>
          <Field id="email" label="Email address *">
            <input type="email" id="email" name="email" required placeholder="you@example.com" className={inputClass} />
          </Field>
          <Field id="phone" label="Phone number (with country code) *">
            <input type="tel" id="phone" name="phone" required placeholder="+234..." className={inputClass} />
          </Field>
          <Field id="country" label="Country of residence *">
            <input
              type="text"
              id="country"
              name="country"
              required
              placeholder="e.g. United Kingdom, Nigeria"
              className={inputClass}
            />
          </Field>
          <div className="mb-4 flex flex-col gap-1.5 md:col-span-2">
            <span className={labelClass}>Membership type *</span>
            <div className="flex flex-wrap gap-[18px]">
              {[
                { value: "Diaspora", label: "Diaspora member" },
                { value: "Local Nigeria", label: "Local (Nigeria) member" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex min-w-[140px] flex-1 cursor-pointer items-center gap-[7px] rounded-[9px] border-[1.5px] border-line px-3.5 py-[9px] text-[14px]"
                >
                  <input type="radio" name="memberType" value={opt.value} required className="accent-green-700" />{" "}
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <Field id="location" label="City / State (Nigeria) or City / Country (diaspora) *" full>
            <input
              type="text"
              id="location"
              name="location"
              required
              placeholder="e.g. Benin City, Edo State — or London, UK"
              className={inputClass}
            />
          </Field>
          <Field id="occupation" label="Occupation / line of business" full>
            <input type="text" id="occupation" name="occupation" placeholder="Optional" className={inputClass} />
          </Field>
          <Field id="notes" label="Anything else we should know?" full>
            <textarea id="notes" name="notes" rows={3} placeholder="Optional" className={inputClass} />
          </Field>
        </div>

        <label className="mt-1.5 mb-5 flex items-start gap-2.5 text-[13px] text-muted">
          <input type="checkbox" id="consent" name="consent" required className="mt-[3px] accent-green-700" />
          <span>
            I confirm the details above are accurate and I agree to be contacted by VEKAT Nig Ltd / Home Bridge
            Cooperative about my membership.
          </span>
        </label>

        <div className="flex flex-col gap-3">
          <button type="submit" disabled={submitting} className="btn btn-primary justify-center disabled:opacity-70">
            {submitting ? "Submitting…" : "Submit Registration"}
          </button>
          <p className="text-center text-[12.5px] text-muted">
            Your information is submitted directly to the cooperative&apos;s membership records.
          </p>
        </div>
      </form>

      {showPay && (
        <div ref={payRef} className="mt-[18px] rounded-xl border border-dashed border-gold-500 bg-cream-dim p-[18px]">
          <p className="mb-3 text-[13.5px] text-muted">
            <strong>Thank you — your registration has been received.</strong> The final step is your registration
            payment:
          </p>
          <a
            href={STRIPE_PAYMENT_LINK}
            target="_blank"
            rel="noopener"
            className="btn btn-primary w-full justify-center"
          >
            Pay Registration Fee →
          </a>
        </div>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  full = false,
  children,
}: {
  id: string;
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`mb-4 flex flex-col gap-1.5 ${full ? "md:col-span-2" : ""}`}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
    </div>
  );
}
