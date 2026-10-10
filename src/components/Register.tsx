import { Mail } from "lucide-react";
import RegistrationForm from "./RegistrationForm";

const steps = [
  {
    title: "Fill the form",
    text: "Tell us who you are and where you're joining from.",
  },
  {
    title: "We record your details",
    text: "Your registration is saved to the cooperative's membership records.",
  },
  {
    title: "Complete payment",
    text: "Pay your registration fee securely via our payment partner.",
  },
  {
    title: "Confirmation",
    text: "The Home Bridge team follows up by email with your next steps.",
  },
];

export default function Register() {
  return (
    <section id="register" className="section-screen bg-cream py-12 lg:py-8">
      <div className="wrap grid items-start gap-10 lg:gap-14 lg:grid-cols-[.9fr_1.1fr]">
        <div className="lg:sticky lg:top-[97px]">
          <div className="eyebrow">Membership registration</div>
          <h2 className="text-[clamp(26px,2.6vw,34px)]">Join the Home Bridge Cooperative</h2>
          <p className="text-[15.5px] text-muted">
            Complete the short form to register your interest. Your details are stored securely for the
            cooperative&apos;s records, and you&apos;ll be guided to complete your registration payment.
          </p>
          <ol className="my-6 grid list-none gap-x-6 gap-y-5 p-0 sm:grid-cols-2">
            {steps.map((s, i) => (
              <li key={s.title} className="relative pl-[42px]">
                <span className="absolute top-0 left-0 flex size-7 items-center justify-center rounded-full bg-green-700 font-display text-[14px] font-bold text-gold-400">
                  {i + 1}
                </span>
                <b className="mb-[3px] block text-[15px] text-green-700">{s.title}</b>
                <span className="text-[14px] leading-snug text-muted">{s.text}</span>
              </li>
            ))}
          </ol>

          <p className="m-0 flex items-center gap-2.5 text-[14px] text-muted">
            <Mail className="size-[18px] shrink-0 text-gold-500" strokeWidth={1.75} aria-hidden />
            <span>
              Questions before you join? Email{" "}
              <a href="mailto:info@homebridge.org" className="font-medium text-green-700 hover:text-gold-500">
                info@homebridge.org
              </a>
            </span>
          </p>
        </div>

        <RegistrationForm />
      </div>
    </section>
  );
}
