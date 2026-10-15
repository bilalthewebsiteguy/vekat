import { Landmark } from "lucide-react";

const profile = [
  { label: "Company name", value: "VEKAT Nig Ltd" },
  { label: "RC number", value: "9616601" },
  { label: "Company type", value: "Private company limited by shares" },
  { label: "Incorporated", value: "16 June 2026" },
  { label: "Registered office", value: "Abuja, FCT, Nigeria" },
  { label: "Share capital", value: "₦1,000,000" },
];

export default function About() {
  return (
    <section id="about" className="section-screen py-12">
      <div className="wrap grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <div className="eyebrow">About the company</div>
          <h2 className="text-[clamp(26px,2.6vw,34px)]">
            A private Nigerian company built for diversified, cross-sector growth.
          </h2>
          <p className="text-[16px] text-muted">
            VEKAT Nig Ltd was incorporated under the Companies and Allied Matters Act, 2020 as a private company
            limited by shares. Its constitution spans trade, real estate, healthcare, agriculture and consultancy,
            and the group&apos;s work today also extends into telecommunications and installations — giving VEKAT
            room to back ventures across several sectors from one Abuja-based office, while also acting as a
            hands-on multi-sector consultancy for partners and member projects such as the Home Bridge Cooperative.
          </p>
          <p className="m-0 text-[16px] text-muted">
            The company is led by its two founding directors and shareholders, with its registered office in Abuja,
            FCT.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(27,67,50,.04),0_12px_32px_rgba(27,67,50,.06)]">
          <div className="flex items-center gap-3 border-b border-line bg-cream-dim/60 px-7 py-5">
            <Landmark className="size-5 text-gold-500" strokeWidth={1.75} aria-hidden />
            <div>
              <div className="text-[15px] font-semibold text-green-700">Company profile</div>
              <div className="text-[13px] text-muted">Registered with the Corporate Affairs Commission</div>
            </div>
          </div>
          <dl className="m-0 grid sm:grid-cols-2">
            {profile.map((item, i) => (
              <div
                key={item.label}
                className={`border-b border-line px-7 py-[18px] ${i % 2 === 0 ? "sm:border-r" : ""}`}
              >
                <dt className="mb-1 text-[12px] font-semibold tracking-[0.08em] text-muted uppercase">
                  {item.label}
                </dt>
                <dd className="m-0 text-[15px] font-medium text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
