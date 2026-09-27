import { Mail, MapPin, Phone, ShieldCheck, Siren } from 'lucide-react'
import { brand, certifications, contact, footerColumns, socials } from '../data/content'
import { FadeIn } from '../components/ui/Motion'
import { Logo } from '../components/ui/Logo'
import { SocialIcon } from '../components/ui/SocialIcon'
import { WorldMap } from '../components/layout/WorldMap'

const tel = (n: string) => `tel:${n.replace(/[^+\d]/g, '')}`

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer data-station="7" className="relative bg-gradient-to-b from-transparent via-void/75 to-void pt-16 pb-10">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <FadeIn>
              <div className="flex items-center justify-between gap-4">
                <div className="font-mono text-[10px] tracking-[0.24em] text-slate-500 uppercase">Global SOC network</div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-safe uppercase">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-safe" /> 9 SOCs online
                </div>
              </div>
              <div className="relative mt-4 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.015] p-3 sm:p-5">
                <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
                <WorldMap className="relative h-auto w-full" />
              </div>
            </FadeIn>
          </div>

          <div className="lg:col-span-5">
            <FadeIn delay={0.1}>
              <Logo />
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
                {brand.tagline} — 24/7 Managed SOC, MDR, Threat Hunting, and Incident Response for organisations that can't afford to blink.
              </p>
              <ul className="mt-7 space-y-3.5 text-sm">
                <li className="flex gap-3 text-slate-300">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neon-cyan" />
                  <address className="not-italic">
                    {contact.address.map((l) => (
                      <span key={l} className="block">
                        {l}
                      </span>
                    ))}
                  </address>
                </li>
                <li>
                  <a href={tel(contact.phone)} className="flex items-center gap-3 text-slate-300 transition-colors hover:text-white">
                    <Phone className="h-4 w-4 text-neon-cyan" /> Sales · {contact.phone}
                  </a>
                </li>
                <li>
                  <a href={tel(contact.hotline)} className="flex items-center gap-3 text-rose-200 transition-colors hover:text-white">
                    <Siren className="h-4 w-4 text-threat" /> 24/7 Incident hotline · {contact.hotline}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-slate-300 transition-colors hover:text-white">
                    <Mail className="h-4 w-4 text-neon-cyan" /> {contact.email}
                  </a>
                </li>
              </ul>
              <div className="mt-7 flex gap-2">
                {socials.map((s) => (
                  <a
                    key={s.id}
                    href={s.href}
                    aria-label={s.label}
                    className="grid h-10 w-10 place-items-center rounded-xl text-slate-300 transition-all duration-300 glass hover:-translate-y-0.5 hover:border-neon-cyan/40 hover:text-neon-cyan hover:shadow-[0_0_24px_-6px_rgba(34,227,255,0.7)]"
                  >
                    <SocialIcon id={s.id} />
                  </a>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>

        <div className="mt-14 grid gap-10 border-t border-white/5 pt-12 sm:grid-cols-2 lg:grid-cols-12">
          {footerColumns.map((col) => (
            <nav key={col.title} aria-label={col.title} className="lg:col-span-2">
              <h4 className="font-mono text-[10px] font-normal tracking-[0.24em] text-slate-500 uppercase">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-slate-300 transition-colors hover:text-neon-cyan">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="sm:col-span-2 lg:col-span-6">
            <h4 className="font-mono text-[10px] font-normal tracking-[0.24em] text-slate-500 uppercase">Certifications & compliance</h4>
            <ul className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-6 lg:grid-cols-3">
              {certifications.map((c) => (
                <li
                  key={c.name}
                  className="group relative flex flex-col items-center rounded-2xl px-2 py-3.5 text-center transition-all duration-300 glass hover:-translate-y-0.5 hover:border-neon-cyan/30"
                >
                  <ShieldCheck className="h-5 w-5 text-neon-cyan/80 transition-colors group-hover:text-neon-cyan" aria-hidden />
                  <span className="mt-2 font-display text-[13px] leading-tight font-semibold text-white">{c.name}</span>
                  <span className="font-mono text-[9.5px] tracking-[0.14em] text-slate-500 uppercase">{c.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/5 pt-6 text-[12.5px] text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {brand.legalName} All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {['Privacy', 'Terms', 'Responsible Disclosure', 'Cookie Settings'].map((l) => (
              <li key={l}>
                <a href="#" className="transition-colors hover:text-slate-200">
                  {l}
                </a>
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-safe shadow-[0_0_8px_rgba(52,211,153,0.9)]" /> All systems operational
          </p>
        </div>
      </div>
    </footer>
  )
}
