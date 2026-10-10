const offerings = [
  "Import, export & general merchandise trading",
  "Real estate development & facilities management",
  "Healthcare, pharmacy & education services",
  "Agriculture & agro-allied production",
  "Business & management consultancy",
];

const stats = [
  { value: "RC 9616601", label: "CAC registered, 2026" },
  { value: "8", label: "Business divisions" },
  { value: "2", label: "Start regions — FCT & Edo" },
];

export default function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden pt-24 pb-[110px] text-cream"
      style={{
        background:
          "radial-gradient(ellipse 900px 500px at 85% -10%, rgba(201,151,43,.18), transparent 60%), linear-gradient(180deg, var(--color-green-900), var(--color-green-700) 70%)",
      }}
    >
      <div className="wrap grid items-center gap-14 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <h1 className="text-[clamp(34px,4.6vw,56px)] text-cream">
            Building trade, property <em className="text-gold-400 not-italic">&amp; people</em> across Nigeria and
            the diaspora.
          </h1>
          <p className="max-w-[46ch] text-[18px] text-[#DCE4DD]">
            VEKAT Nig Ltd is a diversified consultancy and trading group working across import &amp; export, real
            estate, healthcare, agriculture and business advisory — and the umbrella behind the Home Bridge
            Cooperative.
          </p>
          <div className="mt-7 flex flex-wrap gap-3.5">
            <a href="#homebridge" className="btn btn-primary">
              Explore Home Bridge Cooperative
            </a>
            <a href="#contact" className="btn btn-outline-light">
              Talk to Us
            </a>
          </div>
          <div className="mt-12 grid max-w-[520px] grid-cols-3 gap-[18px]">
            {stats.map((s) => (
              <div key={s.label}>
                <b className="block font-display text-[26px] text-gold-400">{s.value}</b>
                <span className="text-[12.5px] text-[#C4D0C8]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="-order-1 rounded-[20px] border border-cream/18 bg-cream/6 p-[30px] backdrop-blur-[6px] lg:order-none">
          <h3 className="mb-3.5 text-[19px] text-cream">What we do</h3>
          <ul className="m-0 mb-[22px] list-none p-0">
            {offerings.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 border-t border-cream/12 py-2 text-[14.5px] text-[#E4E9E1] first:border-t-0"
              >
                <span className="shrink-0 text-gold-400">●</span> {item}
              </li>
            ))}
          </ul>
          <a href="#services" className="btn btn-outline-light w-full justify-center">
            See all business areas
          </a>
        </div>
      </div>
    </section>
  );
}
