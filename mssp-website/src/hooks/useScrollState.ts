import { useSyncExternalStore } from 'react'
import { scroll, subscribeScroll } from '../lib/scroll'

/** Index of the station currently closest to the camera (re-renders only on change). */
export function useActiveStation() {
  return useSyncExternalStore(
    subscribeScroll,
    () => Math.round(scroll.station),
    () => 0,
  )
}

/** True once the page has been scrolled past `threshold` pixels. */
export function useScrolledPast(threshold: number) {
  return useSyncExternalStore(
    subscribeScroll,
    () => scroll.y > threshold,
    () => false,
  )
}
