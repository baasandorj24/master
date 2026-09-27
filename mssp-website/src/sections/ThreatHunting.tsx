import { useLayoutEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Crosshair, Radar, ShieldCheck } from 'lucide-react'
import { attackChain } from '../data/content'
import { useUI } from '../lib/store'
import { Eyebrow } from '../components/ui/SectionHeader'
import { RevealText } from '../components/ui/RevealText'

gsap.registerPlugin(ScrollTrigger)

const EASE = [0.16, 1, 0.3, 1] as const
const LAST = attackChain.length - 1

/**
 * Pinned, scroll-scrubbed attack-chain narrative. The section is tall; its
 * inner stage is sticky while scroll progress drives both the timeline here
 * and the 3D kill-chain visualisation.
 */
export function ThreatHunting() {
  const section = useRef<HTMLElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const stage = useUI((s) => s.chainStage)
  const setStage = useUI((s) => s.setChainStage)

  useLayoutEffect(() => {
    const el = section.current
    if (!el) return
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          const next = Math.min(LAST, Math.floor(self.progress * attackChain.length))
          if (next !== useUI.getState().chainStage) setStage(next)
          if (bar.current) bar.current.style.transform = `scaleY(${self.progress})`
        },
      })
    }, el)
    return () => ctx.revert()
  }, [setStage])

  const current = attackChain[stage]
  const contained = stage === LAST

  return (
    <section ref={section} id="threat-hunting" data-station="4" aria-labelledby="hunting-title" className="relative h-[460vh]">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="flex h-[100svh] flex-col justify-between pt-24 pb-6 lg:block lg:h-auto lg:w-[44%] lg:py-0">
            <div>
              <Eyebrow index="04">Threat Hunting</Eyebrow>
              <RevealText
                id="hunting-title"
                parts={[{ text: 'Hunt the adversary' }, { text: 'before they strike.', className: 'text-gradient', block: true }]}
                className="mt-4 text-[1.9rem] leading-[1.05] font-semibold sm:text-5xl lg:text-[3.1rem]"
              />
              <p className="mt-4 hidden max-w-md text-[15px] leading-relaxed text-slate-400 sm:block">
                Hypothesis-driven hunters trace every step of the kill chain — and our responders shut it down. Scroll to follow a live intrusion.
              </p>
            </div>

            <div className="mt-8 lg:mt-10">
              {/* Timeline */}
              <div className="relative">
                <div className="absolute top-2 bottom-2 left-[15px] hidden w-px bg-white/10 lg:block" />
                <div
                  ref={bar}
                  className="absolute top-2 bottom-2 left-[15px] hidden w-px origin-top bg-gradient-to-b from-threat via-warn to-neon-cyan lg:block"
                  style={{ transform: 'scaleY(0)' }}
                />
                <ol className="flex justify-between gap-2 lg:block lg:space-y-1">
                  {attackChain.map((s, i) => {
                    const state = i < stage ? 'done' : i === stage ? 'active' : 'pending'
                    const isResponse = i === LAST
                    const tone =
                      state === 'pending'
                        ? 'border-white/15 text-slate-500 bg-void'
                        : isResponse || (contained && i < LAST)
                          ? 'border-neon-cyan/70 text-neon-cyan bg-neon-cyan/10 shadow-[0_0_18px_-4px_rgba(34,227,255,0.9)]'
                          : 'border-threat/70 text-threat bg-threat/10 shadow-[0_0_18px_-4px_rgba(255,61,113,0.9)]'
                    return (
                      <li key={s.id} className="relative flex items-center gap-4 lg:py-1.5">
                        <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border font-mono text-[11px] transition-all duration-500 ${tone}`}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="hidden min-w-0 lg:block">
                          <div className={`font-display text-[15px] font-semibold transition-colors duration-500 ${state === 'pending' ? 'text-slate-500' : 'text-white'}`}>{s.title}</div>
                          <div className="font-mono text-[10px] tracking-[0.18em] text-slate-500 uppercase">
                            {s.tactic} · {s.time}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>

              {/* Active stage detail */}
              <div className="relative mt-5 min-h-[14.5rem] sm:min-h-[13rem]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: 16, filter: 'blur(8px)', rotateX: 12 }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)', rotateX: 0 }}
                    exit={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
                    transition={{ duration: 0.5, ease: EASE }}
                    style={{ transformPerspective: 900 }}
                    className={`rounded-2xl p-5 glass-strong ${contained ? 'shadow-[0_0_60px_-20px_rgba(34,227,255,0.6)]' : 'shadow-[0_0_60px_-24px_rgba(255,61,113,0.6)]'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-[0.18em] uppercase ${
                          contained ? 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan' : 'border-threat/40 bg-threat/10 text-rose-200'
                        }`}
                      >
                        {contained ? <ShieldCheck className="h-3 w-3" /> : <Crosshair className="h-3 w-3" />}
                        {contained ? 'Threat contained' : `Stage ${stage + 1} · ${current.tactic}`}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">{current.time}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold sm:text-xl">{current.title}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-300">{current.narrative}</p>
                    <div className="mt-3 grid gap-2 text-[12.5px] sm:grid-cols-2">
                      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] text-warn uppercase">
                          <Radar className="h-3 w-3" /> {contained ? 'Response' : 'Hunt query'}
                        </div>
                        <p className="mt-1 leading-snug text-slate-400">{current.hunt}</p>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                        <div className="font-mono text-[10px] tracking-[0.16em] text-neon-cyan uppercase">Telemetry</div>
                        <p className="mt-1 leading-snug text-slate-400">{current.signal}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
