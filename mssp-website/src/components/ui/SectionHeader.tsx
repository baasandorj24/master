import { useLayoutEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { prefersReducedMotion } from '../../lib/device'
import { FadeIn } from './Motion'
import { RevealText, type RevealPart } from './RevealText'

interface SectionHeaderProps {
  index: string
  eyebrow: string
  title: RevealPart[]
  titleId: string
  description?: ReactNode
  align?: 'left' | 'center'
  className?: string
}

export function Eyebrow({ index, children, className = '' }: { index?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-3 font-mono text-[11px] tracking-[0.28em] text-neon-cyan uppercase ${className}`}>
      {index && <span className="text-neon-cyan/60">{index}</span>}
      <span className="h-px w-8 bg-gradient-to-r from-neon-cyan to-transparent" />
      <span>{children}</span>
    </div>
  )
}

/** Section eyebrow + GSAP-revealed headline + description, with a parallax index numeral. */
export function SectionHeader({ index, eyebrow, title, titleId, description, align = 'left', className = '' }: SectionHeaderProps) {
  const numeral = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = numeral.current
    if (!el || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { yPercent: 35 },
        { yPercent: -35, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } },
      )
    })
    return () => ctx.revert()
  }, [])

  const centered = align === 'center'
  return (
    <div className={`relative ${centered ? 'mx-auto text-center' : ''} ${className}`}>
      <span
        ref={numeral}
        aria-hidden
        className={`pointer-events-none absolute -top-16 font-display text-[9rem] leading-none font-bold text-outline select-none sm:-top-20 sm:text-[12rem] ${
          centered ? 'left-1/2 -translate-x-1/2' : '-left-2 sm:-left-6'
        }`}
      >
        {index}
      </span>
      <FadeIn>
        <Eyebrow index={index} className={centered ? 'justify-center' : ''}>
          {eyebrow}
        </Eyebrow>
      </FadeIn>
      <RevealText
        id={titleId}
        parts={title}
        className="relative mt-5 text-[2.1rem] leading-[1.05] font-semibold sm:text-5xl lg:text-[3.4rem]"
      />
      {description && (
        <FadeIn delay={0.15}>
          <p className={`mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-[1.075rem] ${centered ? 'mx-auto' : ''}`}>
            {description}
          </p>
        </FadeIn>
      )}
    </div>
  )
}
