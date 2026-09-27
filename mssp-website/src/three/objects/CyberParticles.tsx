import { useMemo } from 'react'
import * as THREE from 'three'
import { mulberry32 } from '../../lib/math'
import { outputChunk, palette, sharedUniforms } from '../materials/shared'

const BOX = new THREE.Vector3(64, 42, 90)

/**
 * An endless field of drifting, twinkling particles representing global cyber
 * activity. Positions wrap around the camera inside the vertex shader so the
 * field has constant density along the entire flight path.
 */
export function CyberParticles({ count = 4000 }: { count?: number }) {
  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(7)
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)
    const tints = [palette.cyan, palette.blue, palette.purple, palette.white, palette.azure]
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * BOX.x
      positions[i * 3 + 1] = (rand() - 0.5) * BOX.y
      positions[i * 3 + 2] = (rand() - 0.5) * BOX.z
      const r = rand()
      c.copy(tints[r < 0.38 ? 0 : r < 0.66 ? 1 : r < 0.84 ? 2 : r < 0.94 ? 4 : 3])
      colors.set([c.r, c.g, c.b], i * 3)
      sizes[i] = rand() < 0.04 ? 3.2 + rand() * 2 : 0.9 + rand() * 1.4
      phases[i] = rand()
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: sharedUniforms.uTime,
        uPixelRatio: sharedUniforms.uPixelRatio,
        uBox: { value: BOX },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPixelRatio;
        uniform vec3 uBox;
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.y += uTime * (0.08 + aPhase * 0.18);
          p.x += sin(uTime * 0.21 + aPhase * 6.2831) * 0.6;
          p.z += cos(uTime * 0.17 + aPhase * 12.0) * 0.6;
          vec3 rel = mod(p - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5;
          vec4 mv = viewMatrix * vec4(cameraPosition + rel, 1.0);
          gl_Position = projectionMatrix * mv;

          float twinkle = 0.45 + 0.55 * sin(uTime * (0.8 + aPhase * 2.4) + aPhase * 40.0);
          vec3 edge = abs(rel) / (uBox * 0.5);
          float fade = 1.0 - smoothstep(0.7, 1.0, max(max(edge.x, edge.y), edge.z));
          float depth = -mv.z;
          vAlpha = twinkle * fade * smoothstep(0.6, 3.0, depth);
          vColor = aColor;
          gl_PointSize = min(aSize * uPixelRatio * (42.0 / max(depth, 0.1)), 48.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float core = smoothstep(0.5, 0.0, d);
          float a = pow(core, 2.2) * vAlpha;
          gl_FragColor = vec4(vColor * a * 1.4, 1.0);
          ${outputChunk}
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return { geometry, material }
  }, [count])

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
