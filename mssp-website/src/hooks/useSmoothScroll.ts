import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '../lib/device'
import { measureSections, startScrollDirector, updateScroll } from '../lib/scroll'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null
const locks = new Set<string>()

export const getLenis = () => lenis

function applyLocks() {
  if (!lenis) return
  if (locks.size > 0) lenis.stop()
  else lenis.start()
}

/** Pause smooth scrolling while a reason (menu, modal, preloader…) holds a lock. */
export function setScrollLock(reason: string, locked: boolean) {
  if (locked) locks.add(reason)
  else locks.delete(reason)
  applyLocks()
}

/** Smoothly scrolls to a selector, element, or absolute position. */
export function scrollToTarget(target: string | number | HTMLElement, offset = 0) {
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4), force: true })
    return
  }
  if (typeof target === 'number') window.scrollTo({ top: target })
  else {
    const el = typeof target === 'string' ? document.querySelector(target) : target
    el?.scrollIntoView()
  }
}

/**
 * Lenis smooth scrolling driven by the GSAP ticker so ScrollTrigger, Lenis and
 * the 3D scroll director all agree on the same scroll position every frame.
 */
export function useSmoothScroll() {
  useEffect(() => {
    const reduced = prefersReducedMotion()
    const instance = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !reduced,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.1,
      autoRaf: false,
    })
    lenis = instance
    applyLocks()

    const onScroll = () => {
      ScrollTrigger.update()
      updateScroll()
    }
    instance.on('scroll', onScroll)

    const tick = (time: number) => instance.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    const stopDirector = startScrollDirector()
    ScrollTrigger.addEventListener('refresh', measureSections)

    return () => {
      ScrollTrigger.removeEventListener('refresh', measureSections)
      stopDirector()
      gsap.ticker.remove(tick)
      instance.destroy()
      lenis = null
    }
  }, [])
}
