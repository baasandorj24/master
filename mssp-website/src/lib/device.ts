export type QualityTier = 'high' | 'medium' | 'low'

const mq = (query: string) =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches

export const prefersReducedMotion = () => mq('(prefers-reduced-motion: reduce)')

export const isCoarsePointer = () => mq('(pointer: coarse)')

/** Coarse, load-time device classification used to scale the 3D workload. */
export function getQualityTier(): QualityTier {
  if (typeof window === 'undefined') return 'medium'
  const width = window.innerWidth
  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  if (width < 768) return 'low'
  if (isCoarsePointer() || cores <= 4 || memory <= 4) return 'medium'
  return 'high'
}

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}
