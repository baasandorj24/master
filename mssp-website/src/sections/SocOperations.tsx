import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { Check, Globe2, Headset, Terminal } from 'lucide-react'
import { socModules, type SocModule } from '../data/content'
import { useUI } from '../lib/store'
import { FadeIn } from '../components/ui/Motion'
import { SectionHeader } from '../components/ui/SectionHeader'

const EASE = [0.16, 1, 0.3, 1] as const

function stamp(offsetSeconds: number) {
  return new Date(Date.now() - offsetSeconds * 1000).toISOString().slice(11, 19)
}

/** Streaming terminal of module activity. */
function LiveLog({ module }: { module: SocModule }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    setTick(0)
    const id = window.setInterval(() => setTick((t) => t + 1), 1700)
    return () => clearInterval(id)
  }, [module.id])
  const lines = Array.from({ length: 4 }, (_, i) => {
    const n = tick + i
    return { key: n, text: module.log[n % module.log.length], time: stamp((3 - i) * 2) }
  })
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-white/5 bg-black/40 font-mono text-[11.5px]">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2 text-[10px] tracking-[0.18em] text-slate-500 uppercase">
        <span className="flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5" style={{ color: module.color }} /> {module.short.toLowerCase().replace(' ', '-')}.stream
        </span>
        <span className="flex items-center gap-1.5 text-safe">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-safe" /> live
        </span>
      </div>
      <ul className="h-[7.5rem] space-y-1 overflow-hidden px-3 py-2.5" aria-live="off">
        <AnimatePresence initial={false}>
          {lines.map((l, i) => (
            <motion.li
              key={l.key}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: i === lines.length - 1 ? 1 : 0.55 + i * 0.12, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="flex gap-3 truncate"
            >
              <span className="text-slate-600">{l.time}</span>
              <span className="truncate text-slate-300">
                <span style={{ color: module.color }}>›</span> {l.text}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

export function SocOperations() {
  const active = useUI((s) => s.activeModule)
  const setActive = useUI((s) => s.setActiveModule)
  const [interacted, setInteracted] = useState(false)
  const [hovering, setHovering] = useState(false)
  const section = useRef<HTMLElement>(null)
  const inView = useInView(section, { amount: 0.45 })
  const module = socModules.find((m) => m.id === active) ?? socModules[0]

  // Gently cycle through modules until the visitor takes control.
  useEffect(() => {
    if (interacted || hovering || !inView) return
    const id = window.setTimeout(() => {
      const i = socModules.findIndex((m) => m.id === active)
      setActive(socModules[(i + 1) % socModules.length].id)
    }, 6500)
    return () => clearTimeout(id)
  }, [active, interacted, hovering, inView, setActive])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = socModules.findIndex((m) => m.id === active)
    let next = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % socModules.length
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + socModules.length) % socModules.length
    if (next < 0) return
    e.preventDefault()
    setInteracted(true)
    setActive(socModules[next].id)
    document.getElementById(`soc-tab-${socModules[next].id}`)?.focus()
  }

  return (
    <section ref={section} id="soc" data-station="3" aria-labelledby="soc-title" className="relative flex min-h-screen items-center py-28 lg:py-36">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <div className="lg:ml-auto lg:w-[47%]" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
          <SectionHeader
            index="03"
            eyebrow="Security Operations Center"
            titleId="soc-title"
            title={[{ text: 'Your SOC — fully staffed,' }, { text: 'always on.', className: 'text-gradient', block: true }]}
            description="Tier 1–3 analysts, detection engineers, and incident responders operate from follow-the-sun SOCs on one unified stack of SIEM, XDR, SOAR, NDR, and threat intelligence."
          />

          <FadeIn delay={0.15}>
            <div
              role="tablist"
              aria-label="SOC platform modules"
              onKeyDown={onKeyDown}
              className="mt-8 flex gap-1 overflow-x-auto rounded-2xl p-1.5 glass scrollbar-none"
            >
              {socModules.map((m) => {
                const selected = m.id === active
                return (
                  <button
                    key={m.id}
                    id={`soc-tab-${m.id}`}
                    role="tab"
                    type="button"
                    aria-selected={selected}
                    aria-controls="soc-panel"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => {
                      setInteracted(true)
                      setActive(m.id)
                    }}
                    className={`relative flex-1 shrink-0 rounded-xl px-3.5 py-2.5 font-mono text-[11.5px] font-medium tracking-wider whitespace-nowrap uppercase transition-colors duration-300 ${
                      selected ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {selected && (
                      <motion.span
                        layoutId="soc-tab"
                        className="absolute inset-0 rounded-xl border border-white/15 bg-white/[0.07]"
                        style={{ boxShadow: `0 0 26px -8px ${m.color}, inset 0 -2px 0 ${m.color}` }}
                        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                      />
                    )}
                    <span className="relative">{m.short}</span>
                  </button>
                )
              })}
            </div>
          </FadeIn>

          <FadeIn delay={0.25}>
            <div id="soc-panel" role="tabpanel" aria-labelledby={`soc-tab-${module.id}`} className="relative mt-3 overflow-hidden rounded-2xl p-5 glass-strong sm:p-6">
              <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full blur-3xl transition-colors duration-700" style={{ background: `${module.color}26` }} />
              <AnimatePresence mode="wait">
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="relative"
                >
                  <div className="font-mono text-[10px] tracking-[0.22em] uppercase" style={{ color: module.color }}>
                    {module.short} module
                  </div>
                  <h3 className="mt-1.5 text-xl font-semibold sm:text-[1.35rem]">{module.name}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-400">{module.description}</p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
                    <ul className="space-y-2">
                      {module.capabilities.map((c) => (
                        <li key={c} className="flex items-center gap-2.5 text-[13.5px] text-slate-200">
                          <span className="grid h-5 w-5 place-items-center rounded-full" style={{ background: `${module.color}22`, color: module.color }}>
                            <Check className="h-3 w-3" />
                          </span>
                          {c}
                        </li>
                      ))}
                    </ul>
                    <dl className="flex gap-3 sm:flex-col">
                      {module.kpis.map((k) => (
                        <div key={k.label} className="min-w-[7.5rem] rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5">
                          <dd className="font-display text-lg font-semibold text-white">{k.value}</dd>
                          <dt className="text-[11px] text-slate-500">{k.label}</dt>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <LiveLog module={module} />
                </motion.div>
              </AnimatePresence>
            </div>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-slate-400">
              <span className="flex items-center gap-2">
                <Headset className="h-4 w-4 text-neon-cyan" /> <span className="text-slate-200">450+</span> analysts & responders
              </span>
              <span className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-neon-purple" /> <span className="text-slate-200">9</span> follow-the-sun SOCs
              </span>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}
