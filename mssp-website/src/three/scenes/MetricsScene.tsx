import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { metrics } from '../../data/content'
import { mulberry32, smoothstep } from '../../lib/math'
import { scroll } from '../../lib/scroll'
import { fogFragment, fogVertex, outputChunk, palette, sharedUniforms } from '../materials/shared'
import { HexFloor } from '../objects/HexFloor'
import { Glow, HudRing } from '../objects/primitives'
import { rig } from '../rig'
import { useStation } from '../Station'
import { STATIONS } from '../stations'

const RINGS = 16
const SPACING = 0.26
const BASE_Y = -2.4
const PARKED_DISTANCE = new THREE.Vector3(...STATIONS[6].offset).distanceTo(new THREE.Vector3(...STATIONS[6].target))

function useBeamMaterial(color: THREE.Color) {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: sharedUniforms.uTime,
          uFog: sharedUniforms.uFog,
          uColor: { value: color.clone() },
          uHeight: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          ${fogVertex}
          void main() {
            vUv = uv;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vFogDepth = -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uHeight;
          varying vec2 vUv;
          ${fogFragment}
          void main() {
            float lit = step(vUv.y, uHeight);
            float stripes = 0.6 + 0.4 * sin(vUv.y * 60.0 - uTime * 5.0);
            float top = exp(-pow((vUv.y - uHeight) * 30.0, 2.0));
            float a = lit * (0.2 * stripes) + top * 1.0;
            gl_FragColor = vec4(uColor * a * fogFade(), 1.0);
            ${outputChunk}
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [color],
  )
}

function Tower({ index, color, height }: { index: number; color: THREE.Color; height: number }) {
  const group = useRef<THREE.Group>(null)
  const rings = useRef<THREE.InstancedMesh>(null)
  const crown = useRef<THREE.Group>(null)
  const { active } = useStation()
  const beam = useBeamMaterial(color)
  const total = Math.round(RINGS * height)
  const fullHeight = total * SPACING

  const particles = useMemo(() => {
    const rand = mulberry32(31 + index)
    const n = 70
    const pos = new Float32Array(n * 3)
    const meta = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2
      const r = 0.25 + rand() * 0.45
      pos.set([Math.cos(a) * r, 0, Math.sin(a) * r], i * 3)
      meta[i] = rand()
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(meta, 1))
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: sharedUniforms.uTime,
        uFog: sharedUniforms.uFog,
        uPointScale: sharedUniforms.uPointScale,
        uColor: { value: color.clone() },
        uHeight: { value: fullHeight },
        uGrow: { value: 0 },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPointScale;
        uniform float uHeight;
        uniform float uGrow;
        attribute float aSeed;
        varying float vAlpha;
        ${fogVertex}
        void main() {
          float h = fract(uTime * (0.12 + aSeed * 0.2) + aSeed) * uHeight * uGrow;
          vec3 p = position + vec3(0.0, h, 0.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vFogDepth = -mv.z;
          vAlpha = uGrow * (1.0 - h / max(uHeight, 0.001));
          gl_PointSize = 0.05 * uPointScale / max(-mv.z, 0.1);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlpha;
        ${fogFragment}
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(uColor * smoothstep(0.5, 0.0, d) * vAlpha * 2.0 * fogFade(), 1.0);
          ${outputChunk}
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return { geometry, material }
  }, [index, color, fullHeight])

  const ringColor = useMemo(() => color.clone().multiplyScalar(1.5), [color])
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock, camera, size }) => {
    if (!active.current || !group.current) return
    const t = clock.elapsedTime

    // Align towers with the HTML metric cards, using the camera's parked distance
    // so they don't drift while the camera is still flying in.
    const aspect = size.width / size.height
    const dist = PARKED_DISTANCE * (aspect < 1.25 ? 1.2 : 1)
    const halfW = Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2)) * dist * aspect
    const ndc = rig.portrait ? (index - 1) * 0.55 : scroll.metricColumns[index] ?? 0
    group.current.position.x = ndc * halfW

    const grow = smoothstep(0.18, 0.5, scroll.visible[6])
    const visibleRings = Math.max(0, Math.round(total * grow))
    const mesh = rings.current
    if (mesh) {
      mesh.count = visibleRings
      for (let i = 0; i < visibleRings; i++) {
        const wobble = 1 + Math.sin(t * 2 + i * 0.6 + index) * 0.05
        const taper = 1 - (i / total) * 0.35
        v.set(0, i * SPACING, 0)
        sc.setScalar(taper * wobble)
        matrix.compose(v, q, sc)
        mesh.setMatrixAt(i, matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
    beam.uniforms.uHeight.value = grow
    particles.material.uniforms.uGrow.value = grow
    if (crown.current) {
      crown.current.position.y = visibleRings * SPACING + 0.1
      crown.current.visible = grow > 0.02
      crown.current.rotation.y += 0.02
    }
  })

  return (
    <group ref={group} position-y={BASE_Y}>
      <HudRing radius={0.95} width={0.03} color={color} opacity={0.8} />
      <HudRing radius={1.2} width={0.01} color={color} opacity={0.4} />
      <instancedMesh ref={rings} args={[undefined, undefined, total]} frustumCulled={false}>
        <torusGeometry args={[0.62, 0.018, 8, 64]} />
        <meshBasicMaterial color={ringColor} toneMapped={false} />
      </instancedMesh>
      <mesh material={beam} position-y={fullHeight / 2}>
        <cylinderGeometry args={[0.16, 0.16, fullHeight, 24, 1, true]} />
      </mesh>
      <points geometry={particles.geometry} material={particles.material} frustumCulled={false} />
      <group ref={crown}>
        <Glow color={color} size={2.2} intensity={0.55} />
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.85, 0.012, 8, 64]} />
          <meshBasicMaterial color={color.clone().multiplyScalar(2.5)} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

/** Section 6: holographic data towers rising behind the customer-success metrics. */
export function MetricsScene() {
  const colors = useMemo(() => metrics.primary.map((m) => new THREE.Color(m.color)), [])
  return (
    <group>
      <Glow color={palette.blue} size={14} intensity={0.12} position={[0, 0, -5]} />
      {colors.map((c, i) => (
        <Tower key={i} index={i} color={c} height={[0.72, 0.86, 1][i]} />
      ))}
      <HexFloor y={BASE_Y - 0.02} size={40} radius={16} scale={1.2} color={palette.blue} accent={palette.cyan} intensity={0.9} />
    </group>
  )
}
