import { useRef, type CSSProperties, type ReactNode } from 'react'
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion'
import { useFinePointer, useReducedMotion } from '../../hooks/useMediaQuery'

interface TiltCardProps {
  children: ReactNode
  className?: string
  /** Classes for the glass surface layer. */
  surfaceClassName?: string
  max?: number
  glareColor?: string
  style?: CSSProperties
}

/**
 * Mouse-driven 3D tilt with a moving specular glare.
 *
 * The card deliberately avoids `transform-style: preserve-3d`, which disables
 * `backdrop-filter` in Chromium. Inner depth is simulated instead: children
 * using the `tilt-depth-*` utilities parallax-shift with the pointer via the
 * `--tilt-x` / `--tilt-y` custom properties set here.
 */
export function TiltCard({
  children,
  className = '',
  surfaceClassName = 'glass',
  max = 9,
  glareColor = 'rgba(140, 230, 255, 0.16)',
  style,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const fine = useFinePointer()
  const reduced = useReducedMotion()
  const enabled = fine && !reduced

  const spring = { stiffness: 170, damping: 17 }
  const px = useSpring(useMotionValue(0), spring)
  const py = useSpring(useMotionValue(0), spring)
  const rx = useSpring(useMotionValue(0), spring)
  const ry = useSpring(useMotionValue(0), spring)
  const gx = useMotionValue(50)
  const gy = useMotionValue(30)
  const glare = useMotionTemplate`radial-gradient(520px circle at ${gx}% ${gy}%, ${glareColor}, transparent 42%)`
  const rim = useMotionTemplate`radial-gradient(360px circle at ${gx}% ${gy}%, rgba(125, 235, 255, 0.55), transparent 55%)`

  return (
    <motion.div
      ref={ref}
      onPointerMove={(e) => {
        if (!enabled || !ref.current) return
        const r = ref.current.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width
        const y = (e.clientY - r.top) / r.height
        px.set(x * 2 - 1)
        py.set(y * 2 - 1)
        ry.set((x - 0.5) * max * 2)
        rx.set(-(y - 0.5) * max * 2)
        gx.set(x * 100)
        gy.set(y * 100)
      }}
      onPointerLeave={() => {
        px.set(0)
        py.set(0)
        rx.set(0)
        ry.set(0)
      }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1100, ['--tilt-x' as string]: px, ['--tilt-y' as string]: py, ...style }}
      className={`group/tilt relative ${className}`}
    >
      <div aria-hidden className={`absolute inset-0 rounded-[inherit] ${surfaceClassName}`} />
      {/* Specular rim that follows the cursor. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] p-px opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-100 [mask-composite:exclude] [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [-webkit-mask-composite:xor]"
        style={{ background: rim }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-100"
        style={{ background: glare }}
      />
      <div className="relative h-full">{children}</div>
    </motion.div>
  )
}
