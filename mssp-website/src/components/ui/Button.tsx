import { forwardRef, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useFinePointer, useReducedMotion } from '../../hooks/useMediaQuery'

type Variant = 'primary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  magnetic?: boolean
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px] gap-2',
  md: 'h-11 px-5 text-sm gap-2.5',
  lg: 'h-13 px-7 text-[15px] gap-3',
}

const variants: Record<Variant, string> = {
  primary:
    'text-white bg-[linear-gradient(110deg,#0fb8ff_0%,#2f7bff_45%,#7a4dff_100%)] shadow-[0_0_0_1px_rgba(125,220,255,0.35)_inset,0_10px_40px_-8px_rgba(47,123,255,0.75),0_0_60px_-12px_rgba(34,227,255,0.6)] hover:shadow-[0_0_0_1px_rgba(160,235,255,0.6)_inset,0_14px_50px_-8px_rgba(47,123,255,0.95),0_0_80px_-10px_rgba(34,227,255,0.85)]',
  ghost:
    'text-slate-100 glass hover:border-neon-cyan/40 hover:text-white hover:shadow-[0_0_40px_-10px_rgba(34,227,255,0.5)]',
  danger:
    'text-white bg-threat/15 border border-threat/40 hover:bg-threat/25 hover:shadow-[0_0_30px_-8px_rgba(255,61,113,0.7)]',
}

/** Premium CTA button with magnetic hover, light sweep, and glow. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, magnetic = true, className = '', children, ...props },
  forwarded,
) {
  const fine = useFinePointer()
  const reduced = useReducedMotion()
  const enabled = magnetic && fine && !reduced
  const local = useRef<HTMLButtonElement | null>(null)
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.4 })
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.4 })

  return (
    <motion.button
      ref={(el) => {
        local.current = el
        if (typeof forwarded === 'function') forwarded(el)
        else if (forwarded) forwarded.current = el
      }}
      style={{ x, y }}
      whileTap={{ scale: 0.97 }}
      onPointerMove={(e) => {
        if (!enabled || !local.current) return
        const r = local.current.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * 0.22)
        y.set((e.clientY - (r.top + r.height / 2)) * 0.3)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
      className={`group relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium tracking-tight transition-[box-shadow,background-color,border-color,color] duration-300 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {variant === 'primary' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shine bg-gradient-to-r from-transparent via-white/35 to-transparent"
        />
      )}
      <span className="relative z-10">{children}</span>
      {icon && <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-1">{icon}</span>}
    </motion.button>
  )
})
