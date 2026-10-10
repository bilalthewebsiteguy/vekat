const services = [
  {
    icon: "⇄",
    title: "Trade & General Merchandise",
    text: "Import and export, general merchandising, hire-purchase dealing and commission agency across manufactured and raw-state goods.",
  },
  {
    icon: "⌂",
    title: "Real Estate & Development",
    text: "Land and property dealing, construction and development — acting as promoter, developer, contractor and builder.",
  },
  {
    icon: "⚑",
    title: "Estate & Facilities Management",
    text: "Property management, rent collection and facilities oversight for individuals, firms, companies and government bodies.",
  },
  {
    icon: "▦",
    title: "Building & Construction Services",
    text: "Undertaking, supervising, altering, improving and repairing works on immovable estates and properties.",
  },
  {
    icon: "✚",
    title: "Healthcare, Pharmacy & Education",
    text: "Operating pharmaceutical stores, pharmacies, chemist shops and dispensaries, alongside education services.",
  },
  {
    icon: "❀",
    title: "Agriculture & Agro-Allied",
    text: "Mechanised farming, poultry and livestock, and the processing, storage and marketing of agricultural produce.",
  },
  {
    icon: "◆",
    title: "Business & Management Consultancy",
    text: "Advisory support across the group's sectors — structuring ventures, partnerships and projects such as Home Bridge.",
  },
  {
    icon: "☎",
    title: "Telecommunications & Installations",
    text: "Telecoms infrastructure, network and equipment installation, and related technical and maintenance services.",
  },
];

export default function Services() {
  return (
    <section id="services" className="border-y border-line bg-cream-dim py-[60px] md:py-[88px]">
      <div className="wrap">
        <div className="mx-auto mb-12 max-w-[640px] text-center">
          <div className="eyebrow">Business areas</div>
          <h2>Eight divisions, one group.</h2>
          <p className="text-muted">
            Spanning VEKAT&apos;s constitution and its growing technical services — the full scope the company is
            built to operate in.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[22px]">
          {services.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-line bg-white px-[26px] py-7 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(27,67,50,.09)]"
            >
              <div className="service-icon">{s.icon}</div>
              <h3 className="mb-2 text-[18px]">{s.title}</h3>
              <p className="m-0 text-[14.5px] text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
