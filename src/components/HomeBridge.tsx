import { Check } from "lucide-react";

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
  { label: "Enquiries", value: "info@homebridgecooperative.org" },
];

export default function HomeBridge() {
  return (
    <section
      id="homebridge"
      className="section-screen relative overflow-hidden bg-linear-135 from-green-700 to-green-900 py-[60px] text-cream md:py-24"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle 500px at 90% 10%, rgba(201,151,43,.22), transparent 60%)",
        }}
      />
      <div className="wrap relative">
        <div className="mb-8">
            <div className="eyebrow text-gold-400">Featured project</div>
            <h2 className="m-0 text-[clamp(26px,2.6vw,34px)] text-cream">Home Bridge Cooperative</h2>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_.85fr] lg:gap-12">
          <div>
            <p className="m-0 text-[16px] text-[#DCE4DD]">
              Home Bridge is VEKAT&apos;s diaspora–local development cooperative — connecting Nigerians and Africans
              abroad with trusted, member-owned development back home. It gives diaspora and local members a shared,
              structured way to save, invest and build together, under VEKAT Nig Ltd as the umbrella company.
            </p>
            <ul className="mt-5 mb-7 grid list-none gap-x-6 gap-y-3 p-0 sm:grid-cols-2">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[14.5px] leading-snug text-[#E4E9E1]">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gold-500/20">
                    <Check className="size-3 text-gold-400" strokeWidth={3} aria-hidden />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3.5">
              <a href="#register" className="btn btn-primary">
                Register as a Member
              </a>
              <a href="mailto:info@homebridgecooperative.org" className="btn btn-outline-light">
                Email the Cooperative
              </a>
            </div>
          </div>

          <div className="rounded-[18px] border border-cream/15 bg-green-900/40 px-7 py-6">
            <div className="mb-3.5 flex items-center justify-between gap-4">
              <h4 className="m-0 text-[16px] text-cream">Cooperative details</h4>
              <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-gold-400">
                <span className="size-2 rounded-full bg-gold-400" />
                Open for registration
              </span>
            </div>
            {details.map((d) => (
              <div
                key={d.label}
                className="flex justify-between gap-4 border-t border-cream/14 py-2.5 text-[14px] text-[#D6DED8] first-of-type:border-t-0"
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
