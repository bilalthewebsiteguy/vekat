import { cacheLife } from "next/cache";
import Image from "next/image";

const columns = [
  {
    title: "COMPANY",
    links: [
      { href: "#top", label: "Home" },
      { href: "#about", label: "About Us" },
      { href: "#services", label: "Business Areas" },
      { href: "#contact", label: "Contact" },
    ],
  },
  {
    title: "HOME BRIDGE",
    links: [
      { href: "#homebridge", label: "About the Cooperative" },
      { href: "#register", label: "Member Registration" },
      { href: "mailto:info@homebridgecooperative.org", label: "info@homebridgecooperative.org" },
    ],
  },
  {
    title: "CONTACT",
    links: [
      { href: "mailto:admin@vekat.org", label: "admin@vekat.org" },
      { href: "tel:+2348105832602", label: "+234 810 583 2602" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-green-900 pt-[54px] pb-7 text-[#C4D0C8]">
      <div className="wrap">
        <div className="mb-10 grid gap-7 md:grid-cols-2 md:gap-10 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            {/* The full logo's wordmark is dark green, so the footer pairs the icon with a light wordmark. */}
            <a href="#top" className="mb-3.5 inline-flex items-center gap-2.5 no-underline">
              <Image src="/vekat-icon.png" alt="" width={600} height={600} className="size-[34px] rounded-[8px] ring-1 ring-gold-400/45" />
              <span className="leading-none">
                <span className="block font-display text-[22px] font-bold tracking-[0.02em] text-cream">VEKAT</span>
                <span className="block text-[10px] font-bold tracking-[0.3em] text-gold-400">NIG LTD</span>
              </span>
            </a>
            <p className="max-w-[32ch] text-[13.5px] text-[#9FB0A5]">
              A diversified Nigerian group in trade, real estate, healthcare, agriculture, telecommunications and
              consultancy — and the umbrella behind the Home Bridge Cooperative.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3.5 font-sans text-[13px] tracking-[0.04em] text-cream">{col.title}</h4>
              <ul className="m-0 list-none p-0">
                {col.links.map((l) => (
                  <li key={l.href} className="mb-[9px]">
                    <a href={l.href} className="text-[14px] text-[#B9C6BD] no-underline hover:text-gold-400">
                      {l.label}
                    </a>
                  </li>
                ))}
                {col.title === "CONTACT" && (
                  <li className="mb-[9px] text-[14px] text-[#B9C6BD]">Abuja, FCT, Nigeria</li>
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-2.5 border-t border-cream/10 pt-[22px] text-[12.5px] text-[#88978D]">
          <span>© <CopyrightYear /> VEKAT Nig Ltd. All rights reserved.</span>
          <span>RC 9616601 · Incorporated under CAMA 2020</span>
        </div>
      </div>
    </footer>
  );
}

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
