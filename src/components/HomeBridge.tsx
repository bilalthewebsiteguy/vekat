const points = [
  "Open to members at home and in the diaspora alike",
  "Starting cohort rooted in Abuja, FCT and Edo State",
  "Structured, member-owned cooperative model",
  "Backed by VEKAT's real estate, trade and consultancy expertise",
];

const details = [
  { label: "Umbrella company", value: "VEKAT Nig Ltd" },
  { label: "Head office", value: "Benin City, Edo State" },
  { label: "Start cohort", value: "Abuja FCT & Edo State" },
  { label: "Membership", value: "Diaspora & local" },
  { label: "Enquiries", value: "info@homebridge.org" },
];

export default function HomeBridge() {
  return (
    <section
      id="homebridge"
      className="relative overflow-hidden bg-linear-135 from-green-700 to-green-900 py-[60px] text-cream md:py-[88px]"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle 500px at 90% 10%, rgba(201,151,43,.22), transparent 60%)" }}
      />
      <div className="wrap relative">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-[30px]">
          <div>
            <div className="eyebrow text-gold-400">Featured project</div>
            <h2 className="max-w-[16ch] text-[clamp(28px,3.6vw,40px)] text-cream">Home Bridge Cooperative</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-500/18 px-3.5 py-[7px] text-[12.5px] font-bold tracking-[0.04em] text-gold-400">
            ● Now open for registration
          </div>
        </div>

        <div className="grid items-start gap-[50px] lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="text-[16px] text-[#DCE4DD]">
              Home Bridge is VEKAT&apos;s diaspora–local development cooperative — connecting Nigerians and Africans
              abroad with trusted, member-owned development back home. It gives diaspora and local members a shared,
              structured way to save, invest and build together, under VEKAT Nig Ltd as the umbrella company.
            </p>
            <ul className="mt-[22px] mb-8 grid list-none gap-3.5 p-0">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[15px] text-[#E4E9E1]">
                  <span className="text-[18px] leading-[1.2] text-gold-400">✓</span> {p}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3.5">
              <a href="#register" className="btn btn-primary">
                Register as a Member
              </a>
              <a href="mailto:info@homebridge.org" className="btn btn-outline-light">
                Email the Cooperative
              </a>
            </div>
          </div>

          <div className="rounded-[18px] border border-cream/18 bg-cream/7 p-[26px]">
            <h4 className="mb-3.5 text-[16px] text-cream">Cooperative details</h4>
            {details.map((d) => (
              <div
                key={d.label}
                className="flex justify-between gap-4 border-t border-cream/14 py-[11px] text-[14px] text-[#D6DED8] first-of-type:border-t-0"
              >
                <span>{d.label}</span>
                <b className="text-right font-semibold text-cream">{d.value}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
