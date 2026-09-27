import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion, useInView } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1] as const

/** Fade + rise + de-blur when scrolled into view. */
export function FadeIn({
  children,
  delay = 0,
  y = 26,
  className,
  once = true,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  once?: boolean
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 1, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/** Animated counter that counts up once visible. */
export function CountUp({
  value,
  decimals = 0,
  suffix = '',
  prefix = '',
  duration = 2.2,
  className,
}: {
  value: number
  decimals?: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, { duration, ease: EASE, onUpdate: setDisplay })
    return () => controls.stop()
  }, [inView, value, duration])

  return (
    <span ref={ref} className={className} aria-label={`${prefix}${value.toFixed(decimals)}${suffix}`}>
      <span aria-hidden>
        {prefix}
        {display.toFixed(decimals)}
        {suffix}
      </span>
    </span>
  )
}

function Digit({ digit, active, delay }: { digit: number; active: boolean; delay: number }) {
  return (
    <span className="relative inline-block h-[1em] overflow-hidden [perspective:400px]">
      <motion.span
        className="flex flex-col"
        initial={{ y: '0em', rotateX: 0 }}
        animate={active ? { y: `${-(10 + digit)}em`, rotateX: [0, -25, 0] } : undefined}
        transition={{ duration: 2.1, delay, ease: EASE }}
      >
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} className="block h-[1em] leading-none">
            {i % 10}
          </span>
        ))}
      </motion.span>
    </span>
  )
}

/** Slot-machine style number: each digit rolls into place in 3D. */
export function RollingNumber({ value, className = '' }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -12% 0px' })
  let digitIndex = 0
  return (
    <span ref={ref} className={`inline-flex items-end leading-none tabular-nums ${className}`}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="inline-flex items-end">
        {value.split('').map((ch, i) =>
          /\d/.test(ch) ? (
            <Digit key={i} digit={Number(ch)} active={inView} delay={0.08 * digitIndex++} />
          ) : (
            <span key={i} className="inline-block h-[1em] leading-none">
              {ch}
            </span>
          ),
        )}
      </span>
    </span>
  )
}
