import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '../../lib/math'
import { createFlowMaterial, palette } from '../materials/shared'
import { rig } from '../rig'
import { STATIONS } from '../stations'
import { FlowTube } from './primitives'

/**
 * Glowing data conduits that link every station, so the flight between
 * sections follows the arteries of the defence ecosystem. They surge while
 * the camera is in transit and settle down once it parks at a station.
 */
export function Conduits() {
  const strands = useMemo(() => {
    const rand = mulberry32(64)
    const list: { curve: THREE.CatmullRomCurve3; radius: number; material: THREE.ShaderMaterial }[] = []
    for (let i = 0; i < STATIONS.length - 1; i++) {
      const a = new THREE.Vector3(...STATIONS[i].position)
      const b = new THREE.Vector3(...STATIONS[i + 1].position)
      for (let k = 0; k < 2; k++) {
        const lift = k === 0 ? -3.4 : -4.2
        const side = k === 0 ? 1.2 : -1.6
        const p0 = a.clone().add(new THREE.Vector3(side, lift, -4.5))
        const p3 = b.clone().add(new THREE.Vector3(side, lift, -4.5))
        const m1 = p0.clone().lerp(p3, 0.33).add(new THREE.Vector3((rand() - 0.5) * 8, -2.5 + rand() * 2, 0))
        const m2 = p0.clone().lerp(p3, 0.66).add(new THREE.Vector3((rand() - 0.5) * 8, rand() * 2.5, 0))
        list.push({
          curve: new THREE.CatmullRomCurve3([p0, m1, m2, p3], false, 'centripetal'),
          radius: k === 0 ? 0.045 : 0.03,
          material: createFlowMaterial({
            color: k === 0 ? palette.cyan : palette.purple,
            speed: 0.05 + rand() * 0.03,
            count: 4,
            offset: rand(),
            base: 0.14,
            intensity: 2.2,
          }),
        })
      }
    }
    return list
  }, [])

  useFrame(() => {
    // 0 when parked exactly on a station, 1 halfway between two stations.
    const surge = THREE.MathUtils.clamp(Math.abs(rig.station - Math.round(rig.station)) * 2, 0, 1)
    strands.forEach(({ material }) => {
      material.uniforms.uBase.value = 0.06 + surge * 0.12
      material.uniforms.uIntensity.value = 1 + surge * 1.6
    })
  })

  return (
    <group>
      {strands.map((s, i) => (
        <FlowTube key={i} curve={s.curve} material={s.material} radius={s.radius} segments={180} />
      ))}
    </group>
  )
}
