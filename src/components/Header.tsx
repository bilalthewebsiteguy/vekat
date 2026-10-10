"use client";

import Image from "next/image";
import { useState } from "react";

const navLinks = [
  { href: "#top", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#services", label: "Business Areas" },
  { href: "#homebridge", label: "Home Bridge Cooperative" },
  { href: "#contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-cream/92 backdrop-blur-[8px]">
      <div className="bg-green-900 text-[13.5px] font-medium text-cream">
        <div className="wrap flex flex-wrap items-center justify-center gap-x-[18px] gap-y-1.5 py-[7px] text-center md:justify-between md:text-left">
          <div>
            <a href="mailto:admin@vekat.org" className="text-cream no-underline opacity-90 hover:opacity-100">
              admin@vekat.org
            </a>
            <span className="mx-3 opacity-80">•</span>
            <a href="tel:+2348105832602" className="text-cream no-underline opacity-90 hover:opacity-100">
              +234 810 583 2602
            </a>
          </div>
          <div>
            Abuja, FCT, Nigeria<span className="mx-3 opacity-80">•</span>RC 9616601
          </div>
        </div>
      </div>

      <nav className="wrap flex items-center justify-between py-3.5">
        <a href="#top" className="flex items-center gap-2.5 no-underline" onClick={() => setOpen(false)}>
          <Image
            src="/vekat-logo.png"
            alt="VEKAT Nig Ltd"
            width={1628}
            height={600}
            priority
            className="h-[42px] w-auto"
          />
        </a>

        <div
          id="navlinks"
          className={`absolute inset-x-0 top-full flex h-dvh flex-col items-start gap-[22px] overflow-y-auto bg-cream px-6 py-7 transition-[transform,visibility] duration-250 ease-in-out xl:visible xl:static xl:ml-11 xl:flex-1 xl:h-auto xl:translate-x-0 xl:flex-row xl:items-center xl:gap-10 xl:overflow-visible xl:bg-transparent xl:p-0 xl:transition-none ${
            open ? "visible translate-x-0" : "invisible -translate-x-full"
          }`}
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b-2 border-transparent px-0.5 py-1.5 text-[17px] font-medium text-ink no-underline hover:border-gold-500 xl:text-[16px]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="#register"
            className="btn btn-primary px-11 py-4 text-[16px] font-bold whitespace-nowrap max-sm:px-5 max-sm:py-2.5 max-sm:text-[14px]"
          >
            Registration
          </a>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="navlinks"
            onClick={() => setOpen((v) => !v)}
            className="cursor-pointer border-none bg-transparent p-1.5 xl:hidden"
          >
            <span className="my-[5px] block h-0.5 w-6 rounded-sm bg-green-700" />
            <span className="my-[5px] block h-0.5 w-6 rounded-sm bg-green-700" />
            <span className="my-[5px] block h-0.5 w-6 rounded-sm bg-green-700" />
          </button>
        </div>
      </nav>
    </header>
  );
}
