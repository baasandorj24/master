/**
 * Scroll director.
 *
 * Maps the page scroll position onto a continuous "station" value that the 3D
 * camera flies along. Every section carries a `data-station` index; while a
 * section fills the viewport the camera holds at its station, and the scroll
 * distance between two sections becomes a cinematic flight between stations.
 *
 * State lives in a plain mutable object so the render loop can read it every
 * frame without triggering React renders.
 */
import { clamp } from './math'

export const STATION_COUNT = 8

export interface SectionMetric {
  top: number
  height: number
  holdStart: number
  holdEnd: number
}

interface Anchor {
  y: number
  s: number
}

export const scroll = {
  y: 0,
  vh: 1,
  max: 1,
  /** Continuous station value, e.g. 2.5 = halfway between station 2 and 3. */
  station: 0,
  /** Overall page progress 0..1. */
  progress: 0,
  /** Hold progress per station (0..1 while the section fills the viewport). */
  hold: new Float32Array(STATION_COUNT).fill(0.5),
  /** Enter→exit viewport progress per station. */
  visible: new Float32Array(STATION_COUNT),
  /** Normalised pointer, -1..1 on both axes (y up). */
  pointer: { x: 0, y: 0 },
  /** Hero intro fly-in, animated 0 → 1 once the preloader finishes. */
  intro: 0,
  /** Horizontal NDC centres of the metric cards (used to align the 3D towers). */
  metricColumns: [-0.6, 0, 0.6] as number[],
  sections: [] as SectionMetric[],
}

let anchors: Anchor[] = []
const listeners = new Set<() => void>()

export function subscribeScroll(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function measureSections() {
  if (typeof window === 'undefined') return
  const vh = window.innerHeight
  const sy = window.scrollY
  const groups = new Map<number, { top: number; bottom: number }>()

  document.querySelectorAll<HTMLElement>('[data-station]').forEach((el) => {
    const index = Number(el.dataset.station)
    const rect = el.getBoundingClientRect()
    const top = rect.top + sy
    const bottom = top + rect.height
    const g = groups.get(index)
    if (g) {
      g.top = Math.min(g.top, top)
      g.bottom = Math.max(g.bottom, bottom)
    } else groups.set(index, { top, bottom })
  })

  const sections: SectionMetric[] = []
  const next: Anchor[] = []
  for (let i = 0; i < STATION_COUNT; i++) {
    const g = groups.get(i)
    if (!g) continue
    const height = g.bottom - g.top
    let holdStart = i === 0 ? 0 : g.top
    let holdEnd = g.bottom - vh
    if (holdEnd < holdStart) {
      const mid = Math.max(0, g.top + height / 2 - vh / 2)
      holdStart = holdEnd = i === 0 ? 0 : mid
    }
    sections[i] = { top: g.top, height, holdStart, holdEnd }
    const last = next[next.length - 1]
    if (!last || holdStart >= last.y) next.push({ y: holdStart, s: i })
    if (holdEnd > holdStart) next.push({ y: holdEnd, s: i })
  }

  anchors = next
  scroll.sections = sections
  scroll.vh = vh
  scroll.max = Math.max(1, document.documentElement.scrollHeight - vh)

  const cards = document.querySelectorAll<HTMLElement>('[data-metric-column]')
  if (cards.length === 3) {
    scroll.metricColumns = Array.from(cards).map((c) => {
      const r = c.getBoundingClientRect()
      return ((r.left + r.width / 2) / window.innerWidth) * 2 - 1
    })
  }
  updateScroll()
}

function stationAt(y: number): number {
  if (anchors.length === 0) return 0
  if (y <= anchors[0].y) return anchors[0].s
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1]
    const b = anchors[i]
    if (y <= b.y) {
      const span = b.y - a.y
      return span <= 0 ? b.s : a.s + (b.s - a.s) * ((y - a.y) / span)
    }
  }
  return anchors[anchors.length - 1].s
}

export function updateScroll() {
  if (typeof window === 'undefined') return
  const y = window.scrollY
  scroll.y = y
  scroll.station = stationAt(y)
  scroll.progress = clamp(y / scroll.max)
  const vh = scroll.vh
  for (let i = 0; i < STATION_COUNT; i++) {
    const s = scroll.sections[i]
    if (!s) continue
    const span = s.holdEnd - s.holdStart
    scroll.hold[i] = span < 1 ? 0.5 : clamp((y - s.holdStart) / span)
    scroll.visible[i] = clamp((y + vh - s.top) / (s.height + vh))
  }
  listeners.forEach((cb) => cb())
}

/** Starts measuring + pointer tracking. Returns a cleanup function. */
export function startScrollDirector() {
  const onPointer = (e: PointerEvent) => {
    scroll.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    scroll.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
  }
  let raf = 0
  const schedule = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(measureSections)
  }
  const ro = new ResizeObserver(schedule)
  ro.observe(document.body)
  window.addEventListener('resize', schedule)
  window.addEventListener('scroll', updateScroll, { passive: true })
  window.addEventListener('pointermove', onPointer, { passive: true })
  document.fonts?.ready.then(schedule).catch(() => {})
  measureSections()

  return () => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    window.removeEventListener('resize', schedule)
    window.removeEventListener('scroll', updateScroll)
    window.removeEventListener('pointermove', onPointer)
  }
}
