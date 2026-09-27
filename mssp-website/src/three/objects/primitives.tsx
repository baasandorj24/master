import { useMemo, useState } from 'react'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createFlowMaterial, createGlowMaterial } from '../materials/shared'

/** Glowing path with comets flowing along a curve. */
export function FlowTube({
  curve,
  color,
  radius = 0.015,
  speed = 0.35,
  count = 1,
  offset = 0,
  base = 0.12,
  intensity = 1.6,
  segments = 64,
  material: externalMaterial,
}: {
  curve: THREE.Curve<THREE.Vector3>
  color?: THREE.Color
  radius?: number
  speed?: number
  count?: number
  offset?: number
  base?: number
  intensity?: number
  segments?: number
  material?: THREE.ShaderMaterial
}) {
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, segments, radius, 6, false), [curve, segments, radius])
  // Material props are treated as initial values; pass `material` to control it externally.
  const [ownMaterial] = useState(() =>
    externalMaterial ? null : createFlowMaterial({ color, speed, count, offset, base, intensity }),
  )
  const material = externalMaterial ?? ownMaterial ?? undefined
  return <mesh geometry={geometry} material={material} />
}

/** Camera-facing additive halo. */
export function Glow({
  color,
  size = 1,
  intensity = 1,
  position,
}: {
  color: THREE.Color
  size?: number
  intensity?: number
  position?: [number, number, number]
}) {
  const material = useMemo(() => createGlowMaterial(color, intensity), [color, intensity])
  return (
    <Billboard position={position}>
      <mesh material={material} scale={size}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </Billboard>
  )
}

/** Thin additive ring in the XZ plane, optionally segmented. */
export function HudRing({
  radius,
  width = 0.02,
  color,
  opacity = 0.6,
  segments = 128,
  thetaLength = Math.PI * 2,
  thetaStart = 0,
  y = 0,
}: {
  radius: number
  width?: number
  color: THREE.Color | string
  opacity?: number
  segments?: number
  thetaLength?: number
  thetaStart?: number
  y?: number
}) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y}>
      <ringGeometry args={[radius - width / 2, radius + width / 2, segments, 1, thetaStart, thetaLength]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}

/** Tick marks arranged around a circle (instanced), for HUD dials. */
export function TickRing({
  radius,
  count = 72,
  length = 0.12,
  width = 0.012,
  color,
  opacity = 0.7,
  every = 6,
}: {
  radius: number
  count?: number
  length?: number
  width?: number
  color: THREE.Color | string
  opacity?: number
  every?: number
}) {
  const geometry = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      const long = i % every === 0
      const l = long ? length * 2 : length
      const g = new THREE.PlaneGeometry(width, l)
      g.rotateX(-Math.PI / 2)
      g.translate(0, 0, -(radius + l / 2))
      g.rotateY(a)
      parts.push(g)
    }
    return mergeGeometries(parts) ?? new THREE.BufferGeometry()
  }, [radius, count, length, width, every])
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}
