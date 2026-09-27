import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { services } from '../../data/content'
import { palette } from '../materials/shared'
import { HexFloor } from '../objects/HexFloor'
import { Glow, HudRing } from '../objects/primitives'
import { useStation } from '../Station'

function HexMonolith({ index, color }: { index: number; color: THREE.Color }) {
  const ref = useRef<THREE.Group>(null)
  const { active } = useStation()
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.55, 0.55, 0.22, 6), [])
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry])
  const seed = index * 1.37
  useFrame(({ clock }) => {
    if (!active.current || !ref.current) return
    const t = clock.elapsedTime
    ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.6 + seed) * 0.25
    ref.current.rotation.z = t * 0.3 + seed
    ref.current.position.y = Math.sin(t * 0.7 + seed) * 0.3
  })
  return (
    <group ref={ref}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#0a1328" metalness={0.95} roughness={0.18} envMapIntensity={1.6} emissive={color} emissiveIntensity={0.08} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={color.clone().multiplyScalar(1.8)} toneMapped={false} />
      </lineSegments>
      <Glow color={color} size={2.2} intensity={0.35} />
    </group>
  )
}

/** Section 5 backdrop: a slow orbit of service "monoliths" above a hex-grid floor. */
export function ServicesScene() {
  const orbit = useRef<THREE.Group>(null)
  const { active } = useStation()
  const colors = useMemo(() => services.map((s) => new THREE.Color(s.accent)), [])

  useFrame((_, delta) => {
    if (active.current && orbit.current) orbit.current.rotation.y += delta * 0.08
  })

  return (
    <group>
      <Glow color={palette.blue} size={16} intensity={0.14} position={[0, 0, -6]} />
      <group ref={orbit} rotation-x={0.12}>
        {colors.map((c, i) => {
          const a = (i / colors.length) * Math.PI * 2
          return (
            <group key={i} position={[Math.cos(a) * 7.4, (i % 2 ? 1 : -1) * 1.2, Math.sin(a) * 5 - 1]}>
              <HexMonolith index={i} color={c} />
            </group>
          )
        })}
        <HudRing radius={7.6} width={0.02} color={palette.cyan} opacity={0.25} segments={180} />
      </group>
      <HexFloor y={-3.4} size={46} radius={20} scale={1.5} intensity={0.9} />
    </group>
  )
}
