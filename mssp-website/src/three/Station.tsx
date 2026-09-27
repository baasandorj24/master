import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { clamp } from '../lib/math'
import { rig } from './rig'
import { STATIONS } from './stations'

interface StationContextValue {
  index: number
  /** 0 when far away, 1 when the camera is parked at this station. */
  presence: { current: number }
  /** Whether this station is currently rendered (neighbouring the camera). */
  active: { current: boolean }
}

const StationContext = createContext<StationContextValue>({
  index: 0,
  presence: { current: 1 },
  active: { current: true },
})

export const useStation = () => useContext(StationContext)

/** React state that flips when the camera comes within `range` of this station (for DOM overlays). */
export function useStationNear(range = 0.6) {
  const { index } = useStation()
  const [near, setNear] = useState(false)
  const last = useRef(false)
  useFrame(() => {
    const next = Math.abs(rig.station - index) < range
    if (next !== last.current) {
      last.current = next
      setNear(next)
    }
  })
  return near
}

/**
 * Positions a scene at its station and culls it when the camera is far away,
 * so only the one or two neighbouring stations are ever rendered.
 */
export function Station({ index, children }: { index: number; children: ReactNode }) {
  const group = useRef<Group>(null)
  const presence = useRef(0)
  const active = useRef(false)
  const def = STATIONS[index]

  useFrame(() => {
    const d = Math.abs(rig.station - index)
    const visible = d < 1.2
    active.current = visible
    presence.current = clamp(1 - (d - 0.2) / 0.8)
    if (group.current) group.current.visible = visible
  })

  const value = useMemo(() => ({ index, presence, active }), [index])

  return (
    <group ref={group} position={def.position}>
      <StationContext.Provider value={value}>{children}</StationContext.Provider>
    </group>
  )
}
