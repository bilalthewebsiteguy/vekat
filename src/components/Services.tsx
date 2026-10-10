import {
  BriefcaseBusiness,
  Building2,
  HardHat,
  KeyRound,
  RadioTower,
  Ship,
  Sprout,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

const services: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Ship,
    title: "Trade & General Merchandise",
    text: "Import and export, general merchandising, hire-purchase dealing and commission agency across manufactured and raw-state goods.",
  },
  {
    icon: Building2,
    title: "Real Estate & Development",
    text: "Land and property dealing, construction and development — acting as promoter, developer, contractor and builder.",
  },
  {
    icon: KeyRound,
    title: "Estate & Facilities Management",
    text: "Property management, rent collection and facilities oversight for individuals, firms, companies and government bodies.",
  },
  {
    icon: HardHat,
    title: "Building & Construction Services",
    text: "Undertaking, supervising, altering, improving and repairing works on immovable estates and properties.",
  },
  {
    icon: Stethoscope,
    title: "Healthcare, Pharmacy & Education",
    text: "Operating pharmaceutical stores, pharmacies, chemist shops and dispensaries, alongside education services.",
  },
  {
    icon: Sprout,
    title: "Agriculture & Agro-Allied",
    text: "Mechanised farming, poultry and livestock, and the processing, storage and marketing of agricultural produce.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Business & Management Consultancy",
    text: "Advisory support across the group's sectors — structuring ventures, partnerships and projects such as Home Bridge.",
  },
  {
    icon: RadioTower,
    title: "Telecommunications & Installations",
    text: "Telecoms infrastructure, network and equipment installation, and related technical and maintenance services.",
  },
];

export default function Services() {
  return (
    <section id="services" className="border-y border-line bg-cream-dim py-[60px] md:py-24">
      <div className="wrap">
        <div className="mb-12 grid items-end gap-4 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <div className="eyebrow">Business areas</div>
            <h2 className="m-0 text-[clamp(28px,3.4vw,38px)]">Eight divisions, one group.</h2>
          </div>
          <p className="m-0 text-[16px] text-muted">
            Spanning VEKAT&apos;s constitution and its growing technical services — the full scope the company is
            built to operate in.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {services.map(({ icon: Icon, title, text }, i) => (
            <div
              key={title}
              className="group relative bg-cream p-7 transition-colors duration-200 hover:bg-white"
            >
              <div className="mb-8 flex items-center justify-between">
                <Icon className="size-6 text-green-700" strokeWidth={1.5} aria-hidden />
                <span className="font-display text-[14px] text-gold-500 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mb-2 text-[18px]">{title}</h3>
              <p className="m-0 text-[14.5px] text-muted">{text}</p>
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gold-500 transition-transform duration-300 group-hover:scale-x-100"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
