import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { Activity, ArrowRight, ChevronDown, PlayCircle, ShieldCheck } from 'lucide-react'
import { hero, liveFeed } from '../data/content'
import { scrollToTarget } from '../hooks/useSmoothScroll'
import { prefersReducedMotion } from '../lib/device'
import { useUI } from '../lib/store'
import { Button } from '../components/ui/Button'
import { RevealText } from '../components/ui/RevealText'

const EASE = [0.16, 1, 0.3, 1] as const

function useUtcClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now.toISOString().slice(11, 19)
}

function useTicker(start: number) {
  const [n, setN] = useState(start)
  useEffect(() => {
    const id = window.setInterval(() => setN((v) => v + 1 + Math.floor(Math.random() * 4)), 900)
    return () => clearInterval(id)
  }, [])
  return n
}

const verdictStyle: Record<string, string> = {
  Blocked: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  Contained: 'text-safe border-safe/30 bg-safe/10',
  Investigating: 'text-warn border-warn/30 bg-warn/10',
}

/** Rolling feed of recent detections — gives the hero a live SOC pulse. */
function LiveFeed() {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setOffset((o) => o + 1), 2600)
    return () => clearInterval(id)
  }, [])
  const items = Array.from({ length: 4 }, (_, i) => {
    const idx = (offset + i) % liveFeed.length
    return { ...liveFeed[idx], key: offset + i }
  }).reverse()

  return (
    <div className="w-[21rem] rounded-2xl p-4 glass-strong glow-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-slate-400 uppercase">
          <Activity className="h-3.5 w-3.5 text-neon-cyan" /> Live detections
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-safe">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-safe" /> STREAMING
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.key}
              layout
              initial={{ opacity: 0, y: -14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-slate-100">{item.tactic}</div>
                <div className="truncate font-mono text-[10.5px] text-slate-500">
                  {item.source} · {item.region}
                </div>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] ${verdictStyle[item.verdict]}`}>{item.verdict}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

export function Hero() {
  const ready = useUI((s) => s.ready)
  const openContact = useUI((s) => s.openContact)
  const clock = useUtcClock()
  const blocked = useTicker(1284)
  const section = useRef<HTMLElement>(null)
  const content = useRef<HTMLDivElement>(null)

  // Content drifts up and fades as the camera leaves the hero.
  useLayoutEffect(() => {
    if (!section.current || !content.current || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.to(content.current, {
        yPercent: -14,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: section.current, start: 'top top', end: 'bottom top', scrub: true },
      })
    })
    return () => ctx.revert()
  }, [])

  const show = (delay: number) => ({
    initial: { opacity: 0, y: 24, filter: 'blur(8px)' },
    animate: ready ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined,
    transition: { duration: 1.1, delay, ease: EASE },
  })

  return (
    <section id="top" ref={section} data-station="0" aria-labelledby="hero-title" className="relative flex min-h-[100svh] items-center">
      <div ref={content} className="relative mx-auto w-full max-w-7xl px-5 pt-28 pb-32 sm:px-8 lg:pt-28 lg:pb-24">
        <div className="max-w-[40rem] lg:max-w-[44rem] xl:max-w-[48rem]">
          <motion.div {...show(0.2)} className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full py-1.5 pr-4 pl-2 text-[12px] glass">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-safe/15 px-2.5 py-0.5 font-mono text-[10px] tracking-[0.16em] text-safe uppercase">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-safe opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-safe" />
              </span>
              SOC live
            </span>
            <span className="font-mono text-slate-300 tabular-nums">{clock} UTC</span>
            <span className="hidden text-slate-500 sm:inline">·</span>
            <span className="hidden text-slate-400 sm:inline">
              <span className="font-mono text-slate-200 tabular-nums">{blocked.toLocaleString('en-US')}</span> threats blocked this hour
            </span>
          </motion.div>

          <RevealText
            as="h1"
            id="hero-title"
            trigger="ready"
            delay={0.35}
            stagger={0.07}
            className="mt-6 text-[2.5rem] leading-[1.03] font-semibold tracking-[-0.035em] sm:text-[3.4rem] lg:text-[3.55rem] xl:text-[3.95rem] 2xl:text-[4.3rem]"
            parts={[
              { text: hero.headline[0].text, block: true },
              { text: hero.headline[1].text, className: 'text-gradient', block: true },
              { text: hero.headline[2].text, className: 'text-gradient-violet', block: true },
            ]}
          />

          <motion.p {...show(1.0)} className="mt-6 max-w-xl text-lg font-medium text-slate-200 sm:text-xl">
            {hero.subheadline}
          </motion.p>
          <motion.p {...show(1.1)} className="mt-3 hidden max-w-lg text-[15px] leading-relaxed text-slate-400 sm:block [@media(max-height:760px)]:hidden">
            {hero.supporting}
          </motion.p>

          <motion.div {...show(1.25)} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" icon={<ArrowRight className="h-4 w-4" />} onClick={() => openContact('assessment')}>
              Request Assessment
            </Button>
            <Button size="lg" variant="ghost" icon={<PlayCircle className="h-4 w-4 text-neon-cyan" />} onClick={() => openContact('demo')}>
              Book Demo
            </Button>
          </motion.div>

          <motion.dl {...show(1.4)} className="mt-9 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-5">
            {hero.quickStats.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-xl font-semibold text-white sm:text-2xl">{s.value}</dd>
                <dd className="mt-1 text-[12px] leading-snug text-slate-500">{s.label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 30, filter: 'blur(10px)' }}
          animate={ready ? { opacity: 1, x: 0, filter: 'blur(0px)' } : undefined}
          transition={{ duration: 1.2, delay: 1.6, ease: EASE }}
          className="absolute right-8 bottom-28 hidden 2xl:block"
        >
          <LiveFeed />
        </motion.div>
      </div>

      {/* Industries marquee + scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : undefined}
        transition={{ duration: 1.2, delay: 1.8 }}
        className="absolute inset-x-0 bottom-0 pb-6"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 sm:px-8">
          <div className="hidden shrink-0 items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-slate-500 uppercase md:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-neon-cyan" /> Trusted across
          </div>
          <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
            <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
              {[...hero.industries, ...hero.industries].map((name, i) => (
                <span key={i} className="font-display text-sm text-slate-400/80">
                  {name}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => scrollToTarget('#attack-surface')}
            className="group ml-auto hidden shrink-0 items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-slate-400 uppercase transition-colors hover:text-white sm:flex"
          >
            Enter the defense grid
            <span className="grid h-8 w-8 place-items-center rounded-full border border-white/15 transition-colors group-hover:border-neon-cyan/60">
              <ChevronDown className="h-4 w-4 animate-bounce text-neon-cyan" />
            </span>
          </button>
        </div>
      </motion.div>
    </section>
  )
}
