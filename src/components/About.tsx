const credentials = [
  { label: "COMPANY NAME", value: "VEKAT Nig Ltd" },
  { label: "RC NUMBER", value: "9616601" },
  { label: "COMPANY TYPE", value: "Private company limited by shares" },
  { label: "INCORPORATED", value: "16 June 2026" },
  { label: "REGISTERED OFFICE", value: "Abuja, FCT, Nigeria" },
  { label: "SHARE CAPITAL", value: "₦1,000,000" },
  { label: "DIRECTOR", value: "Evbuomwan Victor Ekhorutomwen" },
  { label: "DIRECTOR", value: "Okonofua Sebastine" },
];

export default function About() {
  return (
    <section id="about" className="py-[60px] md:py-[88px]">
      <div className="wrap grid items-start gap-[60px] lg:grid-cols-[.95fr_1.05fr]">
        <div>
          <div className="eyebrow">About the company</div>
          <h2 className="text-[clamp(28px,3.4vw,38px)]">
            A private Nigerian company built for diversified, cross-sector growth.
          </h2>
          <p className="text-[16px] text-muted">
            VEKAT Nig Ltd was incorporated under the Companies and Allied Matters Act, 2020 as a private company
            limited by shares. Its constitution spans trade, real estate, healthcare, agriculture and consultancy,
            and the group&apos;s work today also extends into telecommunications and installations — giving VEKAT
            room to back ventures across several sectors from one Abuja-based office, while also acting as a
            hands-on multi-sector consultancy for partners and member projects such as the Home Bridge Cooperative.
          </p>
          <p className="text-[16px] text-muted">
            The company is led by its two founding directors and shareholders, with its registered office in Abuja,
            FCT.
          </p>
        </div>
        <div className="mt-7 grid gap-3.5 md:grid-cols-2">
          {credentials.map((c, i) => (
            <div key={i} className="rounded-xl border border-line bg-white px-[18px] py-4">
              <b className="block text-[13px] tracking-[0.03em] text-green-700">{c.label}</b>
              <span className="text-[14.5px] text-muted">{c.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
