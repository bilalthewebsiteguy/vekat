import RegistrationForm from "./RegistrationForm";

const steps = [
  { title: "Fill the form", text: "Tell us who you are and where you're joining from." },
  { title: "We record your details", text: "Your registration is saved to the cooperative's membership records." },
  { title: "Complete payment", text: "Pay your registration fee securely via our payment partner." },
  { title: "Confirmation", text: "The Home Bridge team follows up by email with your next steps." },
];

export default function Register() {
  return (
    <section id="register" className="bg-cream py-[60px] md:py-[88px]">
      <div className="wrap grid items-start gap-[54px] lg:grid-cols-[.9fr_1.1fr]">
        <div>
          <div className="eyebrow">Membership registration</div>
          <h2 className="text-[clamp(26px,3.2vw,34px)]">Join the Home Bridge Cooperative</h2>
          <p className="text-[15.5px] text-muted">
            Complete the short form to register your interest. Your details are stored securely for the
            cooperative&apos;s records, and you&apos;ll be guided to complete your registration payment.
          </p>
          <ol className="mt-[26px] list-none p-0">
            {steps.map((s, i) => (
              <li key={s.title} className="relative pb-[26px] pl-[42px]">
                <span className="absolute top-0 left-0 flex size-7 items-center justify-center rounded-full bg-green-700 font-display text-[14px] font-bold text-gold-400">
                  {i + 1}
                </span>
                {i < steps.length - 1 && (
                  <span aria-hidden className="absolute top-[30px] bottom-0 left-[13px] w-px bg-line" />
                )}
                <b className="mb-[3px] block text-[15px] text-green-700">{s.title}</b>
                <span className="text-[14px] text-muted">{s.text}</span>
              </li>
            ))}
          </ol>
        </div>

        <RegistrationForm />
      </div>
    </section>
  );
}
