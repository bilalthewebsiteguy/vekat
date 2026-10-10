export default function Contact() {
  const cardText = "text-[14.5px] text-muted no-underline";
  return (
    <section id="contact" className="border-t border-line bg-cream-dim py-[60px] md:py-[88px]">
      <div className="wrap">
        <div className="mx-auto mb-12 max-w-[640px] text-center">
          <div className="eyebrow">Get in touch</div>
          <h2>Talk to VEKAT Nig Ltd</h2>
        </div>
        <div className="grid gap-[22px] lg:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white p-[26px]">
            <div className="service-icon mb-3.5">✉</div>
            <h3 className="mb-1.5 text-[16px]">Email</h3>
            <a href="mailto:admin@vekat.org" className={`${cardText} hover:text-green-700`}>
              admin@vekat.org
            </a>
          </div>
          <div className="rounded-2xl border border-line bg-white p-[26px]">
            <div className="service-icon mb-3.5">☎</div>
            <h3 className="mb-1.5 text-[16px]">Phone</h3>
            <a href="tel:+2348105832602" className={`${cardText} hover:text-green-700`}>
              +234 810 583 2602
            </a>
          </div>
          <div className="rounded-2xl border border-line bg-white p-[26px]">
            <div className="service-icon mb-3.5">⌖</div>
            <h3 className="mb-1.5 text-[16px]">Office</h3>
            <p className={cardText}>Abuja, Federal Capital Territory, Nigeria</p>
          </div>
        </div>
      </div>
    </section>
  );
}
