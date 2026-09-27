import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { clamp, mulberry32 } from '../../lib/math'
import { outputChunk, palette } from '../materials/shared'
import { rig } from '../rig'

const BOX = new THREE.Vector3(46, 30, 70)

/**
 * Velocity-stretched light streaks. They are invisible while the camera is
 * parked and stretch into hyperspace trails while flying between stations.
 */
export function WarpStreaks({ count = 320 }: { count?: number }) {
  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(21)
    const seeds = new Float32Array(count * 2 * 3)
    const ends = new Float32Array(count * 2)
    const tints = new Float32Array(count * 2 * 3)
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const x = (rand() - 0.5) * BOX.x
      const y = (rand() - 0.5) * BOX.y
      const z = (rand() - 0.5) * BOX.z
      c.copy(rand() < 0.6 ? palette.cyan : rand() < 0.5 ? palette.blue : palette.purple)
      for (let k = 0; k < 2; k++) {
        seeds.set([x, y, z], (i * 2 + k) * 3)
        tints.set([c.r, c.g, c.b], (i * 2 + k) * 3)
        ends[i * 2 + k] = k
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(seeds, 3))
    geometry.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(tints, 3))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uVel: { value: new THREE.Vector3() },
        uStrength: { value: 0 },
        uBox: { value: BOX },
      },
      vertexShader: /* glsl */ `
        uniform vec3 uVel;
        uniform float uStrength;
        uniform vec3 uBox;
        attribute float aEnd;
        attribute vec3 aColor;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec3 rel = mod(position - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5;
          vec3 wp = cameraPosition + rel - uVel * aEnd * 0.09;
          vec4 mv = viewMatrix * vec4(wp, 1.0);
          gl_Position = projectionMatrix * mv;
          vec3 edge = abs(rel) / (uBox * 0.5);
          float fade = 1.0 - smoothstep(0.6, 1.0, max(max(edge.x, edge.y), edge.z));
          vAlpha = (1.0 - aEnd) * uStrength * fade * smoothstep(1.0, 4.0, -mv.z);
          vColor = aColor;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          gl_FragColor = vec4(vColor * vAlpha * 1.6, 1.0);
          ${outputChunk}
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return { geometry, material }
  }, [count])

  useFrame(() => {
    material.uniforms.uVel.value.copy(rig.velocity).clampLength(0, 60)
    const strength = clamp((rig.speed - 2) / 26)
    material.uniforms.uStrength.value = strength
  })

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />
}
