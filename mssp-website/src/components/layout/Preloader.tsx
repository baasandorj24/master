import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { prefersReducedMotion } from '../../lib/device'
import { useUI } from '../../lib/store'
import { LogoMark } from '../ui/Logo'

const BOOT = [
  { at: 0.05, text: 'Establishing secure channel' },
  { at: 0.3, text: 'Syncing global threat intelligence' },
  { at: 0.55, text: 'Calibrating detection models' },
  { at: 0.8, text: 'Bringing SOC online' },
]
const DURATION = 2000

/** Short cinematic boot sequence while the 3D experience warms up. */
export function Preloader() {
  const ready = useUI((s) => s.ready)
  const setReady = useUI((s) => s.setReady)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setReady()
      return
    }
    let raf = 0
    let timeout = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / DURATION))
      setProgress(1 - Math.pow(1 - t, 2.2))
      if (t < 1) raf = requestAnimationFrame(tick)
      else timeout = window.setTimeout(setReady, 280)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timeout)
    }
  }, [setReady])

  return (
    <AnimatePresence>
      {!ready && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[60] grid place-items-center bg-void"
          exit={{ opacity: 0, scale: 1.06, filter: 'blur(14px)' }}
          transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
          role="status"
          aria-live="polite"
          aria-label="Loading"
        >
          <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(circle_at_center,black,transparent_65%)]" />
          <div className="relative flex w-[min(360px,82vw)] flex-col items-center">
            <div className="relative grid h-28 w-28 place-items-center">
              <div className="absolute inset-0 animate-spin rounded-full border border-neon-cyan/20 border-t-neon-cyan [animation-duration:1.6s]" />
              <div className="absolute inset-3 animate-spin rounded-full border border-neon-purple/20 border-b-neon-purple [animation-direction:reverse] [animation-duration:2.4s]" />
              <LogoMark className="h-12 w-12" />
            </div>
            <div className="mt-8 w-full font-mono text-[11px] tracking-[0.14em] text-slate-400 uppercase">
              {BOOT.map((line) => {
                const shown = progress >= line.at
                const done = progress >= line.at + 0.2
                return (
                  <div key={line.text} className={`flex justify-between py-0.5 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}>
                    <span>{line.text}</span>
                    <span className={done ? 'text-safe' : 'text-neon-cyan'}>{done ? 'OK' : '···'}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-5 h-[3px] w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple shadow-[0_0_14px_rgba(34,227,255,0.8)]"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="mt-2 flex w-full justify-between font-mono text-[10px] tracking-[0.2em] text-slate-500">
              <span>SECURE SESSION</span>
              <span className="text-slate-300">{Math.round(progress * 100)}%</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
