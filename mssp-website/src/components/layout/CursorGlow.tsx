import { useEffect } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useFinePointer, useReducedMotion } from '../../hooks/useMediaQuery'

/** Soft light that trails the cursor, lighting the scene beneath the content. */
export function CursorGlow() {
  const fine = useFinePointer()
  const reduced = useReducedMotion()
  const x = useSpring(useMotionValue(-1000), { stiffness: 120, damping: 22, mass: 0.6 })
  const y = useSpring(useMotionValue(-1000), { stiffness: 120, damping: 22, mass: 0.6 })

  useEffect(() => {
    if (!fine || reduced) return
    const move = (e: PointerEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [fine, reduced, x, y])

  if (!fine || reduced) return null
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[5] h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen"
      style={{
        x,
        y,
        background: 'radial-gradient(circle, rgba(34,227,255,0.09) 0%, rgba(47,123,255,0.05) 35%, transparent 65%)',
      }}
    />
  )
}
