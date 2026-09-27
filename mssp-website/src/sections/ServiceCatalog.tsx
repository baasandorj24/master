import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowUpRight, Check, Crosshair, Layers, Radar, ScanSearch, ShieldCheck, Siren, type LucideIcon } from 'lucide-react'
import { services, type Service } from '../data/content'
import { prefersReducedMotion } from '../lib/device'
import { useUI } from '../lib/store'
import { SectionHeader } from '../components/ui/SectionHeader'
import { TiltCard } from '../components/ui/TiltCard'

gsap.registerPlugin(ScrollTrigger)

const icons: Record<Service['icon'], LucideIcon> = {
  radar: Radar,
  shield: ShieldCheck,
  layers: Layers,
  scan: ScanSearch,
  siren: Siren,
  crosshair: Crosshair,
}

function ServiceCard({ service, onSelect }: { service: Service; onSelect: () => void }) {
  const Icon = icons[service.icon]
  return (
    <TiltCard className="h-full rounded-3xl" glareColor={`${service.accent}2a`}>
      <article className="flex h-full flex-col p-6 sm:p-7">
        <div className="flex items-start justify-between tilt-depth-3">
          <div className="relative grid h-14 w-14 place-items-center">
            <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full" aria-hidden>
              <path d="M28 3 49.6 15.5v25L28 53 6.4 40.5v-25Z" fill={`${service.accent}14`} stroke={service.accent} strokeOpacity="0.55" strokeWidth="1.2" />
            </svg>
            <div className="absolute inset-2 rounded-full opacity-60 blur-xl transition-opacity duration-500 group-hover/tilt:opacity-100" style={{ background: `${service.accent}55` }} />
            <Icon className="relative h-6 w-6" style={{ color: service.accent }} />
          </div>
          {service.badge && (
            <span className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] text-neon-cyan uppercase">
              {service.badge}
            </span>
          )}
        </div>
        <div className="mt-6 font-mono text-[10px] tracking-[0.2em] uppercase tilt-depth-2" style={{ color: service.accent }}>
          {service.kicker}
        </div>
        <h3 className="mt-2 text-2xl font-semibold tilt-depth-2">{service.title}</h3>
        <p className="mt-3 text-[14px] leading-relaxed text-slate-400 tilt-depth-1">{service.description}</p>
        <ul className="mt-5 space-y-2 tilt-depth-1">
          {service.features.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-slate-200">
              <Check className="h-4 w-4 shrink-0" style={{ color: service.accent }} />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-7 tilt-depth-2">
          <button
            type="button"
            onClick={onSelect}
            className="group/link inline-flex items-center gap-1.5 text-[13.5px] font-medium text-white"
            aria-label={`Talk to an expert about ${service.title}`}
          >
            Talk to an expert
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" style={{ color: service.accent }} />
          </button>
        </div>
      </article>
    </TiltCard>
  )
}

export function ServiceCatalog() {
  const grid = useRef<HTMLDivElement>(null)
  const openContact = useUI((s) => s.openContact)

  useLayoutEffect(() => {
    const el = grid.current
    if (!el || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-card]')
      gsap.set(cards, { opacity: 0, y: 90, rotateX: 28, transformPerspective: 1200, transformOrigin: '50% 100%' })
      ScrollTrigger.batch(cards, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { opacity: 1, y: 0, rotateX: 0, duration: 1.3, ease: 'expo.out', stagger: 0.1, clearProps: 'transform' }),
      })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section id="services" data-station="5" aria-labelledby="services-title" className="relative py-28 lg:py-40">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <SectionHeader
          index="05"
          eyebrow="Service Catalog"
          titleId="services-title"
          align="center"
          title={[{ text: 'Security outcomes,' }, { text: 'delivered as a service.', className: 'text-gradient', block: true }]}
          description="Modular managed services that scale from a single capability to a fully outsourced security program — all operated from one platform, by one team."
        />
        <div ref={grid} className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {services.map((s) => (
            <div key={s.id} data-card>
              <ServiceCard service={s} onSelect={() => openContact('demo')} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
