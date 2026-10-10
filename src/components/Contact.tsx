import { ArrowUpRight, Mail, MapPin, Phone, Users, type LucideIcon } from "lucide-react";

const channels: { icon: LucideIcon; label: string; value: string; href?: string }[] = [
  { icon: Mail, label: "General enquiries", value: "admin@vekat.org", href: "mailto:admin@vekat.org" },
  { icon: Phone, label: "Phone", value: "+234 810 583 2602", href: "tel:+2348105832602" },
  { icon: Users, label: "Home Bridge Cooperative", value: "info@homebridge.org", href: "mailto:info@homebridge.org" },
  { icon: MapPin, label: "Office", value: "Abuja, Federal Capital Territory, Nigeria" },
];

export default function Contact() {
  return (
    <section id="contact" className="border-t border-line bg-cream-dim py-[60px] md:py-24">
      <div className="wrap grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <div className="eyebrow">Get in touch</div>
          <h2 className="text-[clamp(28px,3.4vw,38px)]">Talk to VEKAT Nig Ltd</h2>
          <p className="max-w-[44ch] text-[16px] text-muted">
            For partnerships, business enquiries or questions about the Home Bridge Cooperative, reach the team
            directly by email or phone.
          </p>
          <a href="mailto:admin@vekat.org" className="btn btn-primary mt-4">
            Email us
          </a>
        </div>

        <ul className="m-0 list-none divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white p-0">
          {channels.map(({ icon: Icon, label, value, href }) => {
            const body = (
              <>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-green-700">
                  <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold tracking-[0.08em] text-muted uppercase">
                    {label}
                  </span>
                  <span className="block text-[16px] font-medium text-ink">{value}</span>
                </span>
                {href && (
                  <ArrowUpRight
                    className="size-5 shrink-0 text-muted transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gold-500"
                    aria-hidden
                  />
                )}
              </>
            );
            return (
              <li key={label}>
                {href ? (
                  <a
                    href={href}
                    className="group flex items-center gap-4 px-6 py-5 no-underline transition-colors hover:bg-cream"
                  >
                    {body}
                  </a>
                ) : (
                  <div className="flex items-center gap-4 px-6 py-5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
