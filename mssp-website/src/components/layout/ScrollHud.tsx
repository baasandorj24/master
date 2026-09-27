import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { stationLabels } from '../../data/content'
import { useActiveStation } from '../../hooks/useScrollState'
import { scrollToTarget } from '../../hooks/useSmoothScroll'
import { scroll, subscribeScroll } from '../../lib/scroll'
import { useUI } from '../../lib/store'
import { STATIONS } from '../../three/stations'

const targets = ['#top', '#attack-surface', '#detection', '#soc', '#threat-hunting', '#services', '#results', '#contact']

/** Cinematic heads-up display: progress rail, sector index, and live coordinates. */
export function ScrollHud() {
  const active = useActiveStation()
  const ready = useUI((s) => s.ready)
  const bar = useRef<HTMLDivElement>(null)
  const coords = useRef<HTMLSpanElement>(null)
  const readout = useRef<HTMLDivElement>(null)

  useEffect(
    () =>
      subscribeScroll(() => {
        if (bar.current) bar.current.style.transform = `scaleX(${scroll.progress})`
        if (readout.current) readout.current.style.opacity = scroll.progress > 0.9 || scroll.y < scroll.vh * 0.6 ? '0' : '1'
        if (coords.current) {
          const s = Math.min(scroll.station, STATIONS.length - 1)
          const i = Math.floor(s)
          const j = Math.min(i + 1, STATIONS.length - 1)
          const t = s - i
          const z = STATIONS[i].position[2] + (STATIONS[j].position[2] - STATIONS[i].position[2]) * t
          const y = STATIONS[i].position[1] + (STATIONS[j].position[1] - STATIONS[i].position[1]) * t
          coords.current.textContent = `Y ${y.toFixed(1).padStart(6, ' ')} · Z ${z.toFixed(1).padStart(7, ' ')}`
        }
      }),
    [],
  )

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px]">
        <div
          ref={bar}
          className="h-full origin-left bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple shadow-[0_0_12px_rgba(34,227,255,0.8)]"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      <motion.nav
        aria-label="Section navigation"
        initial={{ opacity: 0, x: 20 }}
        animate={ready ? { opacity: 1, x: 0 } : undefined}
        transition={{ duration: 1, delay: 0.9 }}
        className="fixed top-1/2 right-4 z-30 hidden -translate-y-1/2 xl:block"
      >
        <ul className="flex flex-col items-end gap-3.5">
          {stationLabels.map((label, i) => {
            const isActive = active === i
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => scrollToTarget(targets[i])}
                  className="group flex items-center gap-3"
                  aria-label={`Go to ${label}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span
                    className={`translate-x-2 font-mono text-[10px] tracking-[0.2em] uppercase opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 ${
                      isActive ? 'text-neon-cyan' : 'text-slate-400'
                    }`}
                  >
                    {label}
                  </span>
                  <span
                    className={`block rounded-full transition-all duration-500 ${
                      isActive ? 'h-6 w-[3px] bg-neon-cyan shadow-[0_0_12px_rgba(34,227,255,0.9)]' : 'h-[6px] w-[6px] bg-slate-500/70 group-hover:bg-slate-300'
                    }`}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </motion.nav>

      <motion.div
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : undefined}
        transition={{ duration: 1, delay: 1.1 }}
        className="pointer-events-none fixed bottom-5 left-6 z-30 hidden font-mono text-[10px] tracking-[0.22em] text-slate-500 uppercase xl:block"
        aria-hidden
      >
        <div ref={readout} className="transition-opacity duration-500">
        <div className="flex items-center gap-3">
          <span className="text-neon-cyan">SEC {String(active).padStart(2, '0')}</span>
          <span className="h-px w-6 bg-slate-600" />
          <span className="text-slate-300">{stationLabels[active]}</span>
        </div>
        <span ref={coords} className="mt-1 block whitespace-pre text-slate-600" />
        </div>
      </motion.div>
    </>
  )
}
