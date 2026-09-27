import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '../../lib/device'
import { useUI } from '../../lib/store'

gsap.registerPlugin(ScrollTrigger)

export interface RevealPart {
  text: string
  className?: string
  /** Start this part on a new line. */
  block?: boolean
}

interface RevealTextProps {
  parts: RevealPart[] | string
  as?: 'h1' | 'h2' | 'h3' | 'p'
  className?: string
  id?: string
  delay?: number
  /** 'scroll' reveals when scrolled into view; 'ready' waits for the preloader. */
  trigger?: 'scroll' | 'ready'
  stagger?: number
}

/** GSAP word-by-word masked reveal with blur and 3D rotation. */
export function RevealText({ parts, as = 'h2', className = '', id, delay = 0, trigger = 'scroll', stagger = 0.045 }: RevealTextProps) {
  const ref = useRef<HTMLHeadingElement>(null)
  // All supported tags share the same DOM surface for our purposes.
  const Tag = as as 'h2'
  const ready = useUI((s) => s.ready)
  const list: RevealPart[] = typeof parts === 'string' ? [{ text: parts }] : parts
  const full = list.map((p) => p.text).join(' ')

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      const words = el.querySelectorAll<HTMLElement>('[data-word]')
      const hidden = { x: 0, y: 0, yPercent: 118, opacity: 0, rotateX: -55, filter: 'blur(10px)', transformOrigin: '50% 100%' }
      if (trigger === 'ready' && !ready) {
        gsap.set(words, hidden)
        return
      }
      gsap.fromTo(words, hidden, {
        x: 0,
        y: 0,
        yPercent: 0,
        opacity: 1,
        rotateX: 0,
        filter: 'blur(0px)',
        duration: 1.25,
        ease: 'expo.out',
        stagger,
        delay,
        immediateRender: true,
        clearProps: 'transform,filter,opacity',
        scrollTrigger: trigger === 'scroll' ? { trigger: el, start: 'top 88%', once: true } : undefined,
      })
    }, el)
    return () => ctx.revert()
  }, [ready, trigger, delay, stagger])

  return (
    <Tag ref={ref} id={id} className={className}>
      <span className="sr-only">{full}</span>
      <span aria-hidden="true" className="[perspective:800px]">
        {list.map((part, pi) => {
          const words = part.text.split(' ')
          return (
            <span key={pi} className={part.block ? 'block' : undefined}>
              {words.map((w, wi) => (
                <span key={wi}>
                  <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
                    <span data-word className={`inline-block will-change-transform ${part.className ?? ''}`}>
                      {w}
                    </span>
                  </span>
                  {wi < words.length - 1 || (!list[pi + 1]?.block && pi < list.length - 1) ? ' ' : null}
                </span>
              ))}
            </span>
          )
        })}
      </span>
    </Tag>
  )
}
