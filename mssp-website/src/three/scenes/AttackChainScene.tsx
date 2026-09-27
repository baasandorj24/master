import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { attackChain } from '../../data/content'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { clamp, smoothstep } from '../../lib/math'
import { scroll } from '../../lib/scroll'
import { createFresnelMaterial, fogFragment, fogVertex, outputChunk, palette, sharedUniforms } from '../materials/shared'
import { Glow, HudRing } from '../objects/primitives'
import { useStation, useStationNear } from '../Station'

const STAGE_POINTS = [
  new THREE.Vector3(-4.4, -1.1, 0.6),
  new THREE.Vector3(-2.2, 0.55, -0.7),
  new THREE.Vector3(0, -0.5, 0.5),
  new THREE.Vector3(2.2, 0.75, -0.6),
  new THREE.Vector3(4.4, -0.1, 0.3),
]
const LEAD_IN = new THREE.Vector3(-7.5, -2.2, 1.6)
const RESPONSE_AT = 0.9

/** Progress 0..1 across the pinned section → per-stage timing helpers. */
const stageReachedAt = (k: number) => 0.2 * k + 0.1
const containedAt = (k: number) => RESPONSE_AT + (4 - k) * 0.018

function useChain() {
  return useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([LEAD_IN, ...STAGE_POINTS], false, 'centripetal')
    const samples = 600
    const stageU = STAGE_POINTS.map((p) => {
      let best = 0
      let bestD = Infinity
      for (let i = 0; i <= samples; i++) {
        const d = curve.getPointAt(i / samples).distanceToSquared(p)
        if (d < bestD) {
          bestD = d
          best = i / samples
        }
      }
      return best
    })
    return { curve, stageU }
  }, [])
}

function headU(p: number, stageU: number[]) {
  if (p <= stageReachedAt(0)) return (p / stageReachedAt(0)) * stageU[0]
  for (let k = 0; k < 4; k++) {
    const a = stageReachedAt(k)
    const b = stageReachedAt(k + 1)
    if (p <= b) return THREE.MathUtils.lerp(stageU[k], stageU[k + 1], smoothstep(a, b, p))
  }
  return stageU[4]
}

function usePathMaterial() {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: sharedUniforms.uTime,
          uFog: sharedUniforms.uFog,
          uHead: { value: 0 },
          uContain: { value: 0 },
          uIdle: { value: palette.blue.clone() },
          uThreat: { value: palette.threat.clone() },
          uSafe: { value: palette.cyan.clone() },
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
          uniform float uHead;
          uniform float uContain;
          uniform vec3 uIdle;
          uniform vec3 uThreat;
          uniform vec3 uSafe;
          varying vec2 vUv;
          ${fogFragment}
          void main() {
            float lit = step(vUv.x, uHead);
            vec3 hot = mix(uThreat, uSafe, uContain);
            float head = exp(-pow((vUv.x - uHead) * 45.0, 2.0)) * (1.0 - uContain);
            float trail = lit * (0.35 + 0.65 * smoothstep(uHead - 0.3, uHead, vUv.x));
            float flow = lit * uContain * pow(fract(vUv.x * 7.0 + uTime * 0.9), 10.0);
            float idleFlow = (1.0 - lit) * pow(fract(vUv.x * 5.0 - uTime * 0.25), 16.0) * 0.5;
            vec3 col = uIdle * (0.1 + idleFlow) + hot * (trail * 0.9 + head * 3.5 + flow * 2.0);
            gl_FragColor = vec4(col * fogFade(), 1.0);
            ${outputChunk}
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )
}

function StageNode({ index, position }: { index: number; position: THREE.Vector3 }) {
  const isResponse = index === attackChain.length - 1
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Group>(null)
  const beam = useRef<THREE.Mesh>(null)
  const label = useRef<HTMLDivElement>(null)
  const { active } = useStation()
  const isDesktop = useIsDesktop()
  const near = useStationNear(0.55)
  const edges = useMemo(() => new THREE.EdgesGeometry(isResponse ? new THREE.IcosahedronGeometry(0.4, 1) : new THREE.OctahedronGeometry(0.34, 0)), [isResponse])
  const edgeMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: palette.blue.clone(), toneMapped: false, transparent: true }), [])
  const coreMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: palette.blue.clone(), toneMapped: false }), [])
  const shell = useMemo(() => createFresnelMaterial({ color: isResponse ? palette.cyan : palette.blue, power: 2, intensity: 1.2 }), [isResponse])
  const beamMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: palette.threat.clone(),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  )
  const tmp = useMemo(() => new THREE.Color(), [])

  useFrame(({ clock }, delta) => {
    if (!active.current || !group.current) return
    const p = scroll.hold[4]
    const t = clock.elapsedTime
    const reached = smoothstep(stageReachedAt(index) - 0.03, stageReachedAt(index), p)
    const contained = smoothstep(containedAt(index), containedAt(index) + 0.03, p)

    if (isResponse) {
      tmp.copy(palette.cyan).multiplyScalar(1.2 + reached * 2.5 + Math.sin(t * 3) * 0.2)
    } else {
      tmp.copy(palette.blue).multiplyScalar(0.9)
      tmp.lerp(palette.threat, reached).lerp(palette.cyan, contained)
      tmp.multiplyScalar(1 + reached * (1.6 + Math.sin(t * 8) * 0.4 * (1 - contained)))
    }
    edgeMaterial.color.copy(tmp)
    coreMaterial.color.copy(tmp).multiplyScalar(0.8)
    shell.uniforms.uColor.value.copy(tmp).multiplyScalar(0.28)

    group.current.rotation.y += delta * (0.4 + reached * 1.2)
    const pulse = 1 + reached * (1 - contained) * Math.sin(t * 6) * 0.08
    group.current.scale.setScalar(pulse * (isResponse ? 1 + contained * 0.25 : 1))
    if (ring.current) {
      ring.current.rotation.z += delta * (0.6 + reached * 2)
      ring.current.scale.setScalar(1 + reached * 0.25)
    }
    if (beam.current) {
      beamMaterial.color.copy(isResponse ? palette.cyan : palette.threat).lerp(palette.cyan, contained)
      beamMaterial.opacity = (isResponse ? 0.12 + reached * 0.3 : reached * 0.22) * (0.8 + Math.sin(t * 4) * 0.2)
    }
    if (label.current) {
      const state = isResponse ? (reached > 0.5 ? 'contained' : 'idle') : contained > 0.5 ? 'contained' : reached > 0.5 ? 'compromised' : 'idle'
      if (label.current.dataset.state !== state) label.current.dataset.state = state
    }
  })

  return (
    <group position={position}>
      <group ref={group}>
        <lineSegments geometry={edges} material={edgeMaterial} />
        <mesh material={coreMaterial}>
          <icosahedronGeometry args={[isResponse ? 0.16 : 0.12, 1]} />
        </mesh>
        <mesh material={shell}>
          <sphereGeometry args={[isResponse ? 0.62 : 0.5, 24, 24]} />
        </mesh>
      </group>
      {/* HudRing lies in XZ; rotate it into the camera-facing XY plane and spin around Z. */}
      <group ref={ring}>
        <group rotation-x={Math.PI / 2}>
          <HudRing radius={0.72} width={0.02} color={isResponse ? palette.cyan : palette.azure} opacity={0.7} thetaLength={Math.PI * 0.55} segments={32} />
          <HudRing radius={0.72} width={0.02} color={isResponse ? palette.cyan : palette.azure} opacity={0.7} thetaStart={Math.PI} thetaLength={Math.PI * 0.55} segments={32} />
        </group>
      </group>
      <mesh ref={beam} material={beamMaterial} position-y={1.6}>
        <cylinderGeometry args={[0.012, 0.07, 3.2, 16, 1, true]} />
      </mesh>
      {isDesktop && near && (
        <Html position={[0, -0.95, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div
            ref={label}
            data-state="idle"
            className="group rounded-full border border-white/10 bg-black/40 px-3 py-1 font-mono text-[10px] tracking-[0.16em] whitespace-nowrap text-slate-300 uppercase backdrop-blur-md transition-colors duration-300 data-[state=compromised]:border-threat/60 data-[state=compromised]:text-threat data-[state=contained]:border-neon-cyan/60 data-[state=contained]:text-neon-cyan"
          >
            {String(index + 1).padStart(2, '0')} · {attackChain[index].title}
          </div>
        </Html>
      )}
    </group>
  )
}

/** Section 4: 3D kill-chain — a threat traverses the chain and is contained at Response. */
export function AttackChainScene() {
  const { curve, stageU } = useChain()
  const pathMaterial = usePathMaterial()
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 320, 0.028, 8, false), [curve])
  const head = useRef<THREE.Group>(null)
  const reticle = useRef<THREE.Group>(null)
  const shock = useRef<THREE.Mesh>(null)
  const shockState = useRef({ start: 0, armed: true })
  const { active } = useStation()
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock }, delta) => {
    if (!active.current) return
    const p = scroll.hold[4]
    const u = headU(p, stageU)
    const contain = smoothstep(RESPONSE_AT - 0.02, RESPONSE_AT + 0.06, p)
    pathMaterial.uniforms.uHead.value = u
    pathMaterial.uniforms.uContain.value = contain

    if (head.current) {
      curve.getPointAt(clamp(u), tmp)
      head.current.position.copy(tmp)
      const s = Math.max(0.001, 1 - contain) * (1 + Math.sin(clock.elapsedTime * 10) * 0.12)
      head.current.scale.setScalar(s)
      head.current.visible = contain < 0.99
    }
    if (reticle.current) {
      const target = STAGE_POINTS[Math.min(4, Math.floor(clamp(p) * 5))]
      reticle.current.position.lerp(target, 1 - Math.exp(-6 * delta))
      reticle.current.rotation.z += delta * 1.4
      const s = 1.05 + Math.sin(clock.elapsedTime * 4) * 0.06
      reticle.current.scale.setScalar(s)
    }
    if (shock.current) {
      // Time-based containment shockwave: fires when Response is reached, then pulses.
      const now = clock.elapsedTime
      const s = shockState.current
      if (p >= RESPONSE_AT && s.armed) {
        s.armed = false
        s.start = now
      } else if (p < RESPONSE_AT - 0.03) s.armed = true
      let age = now - s.start
      if (!s.armed && age > 2.8) {
        s.start = now
        age = 0
      }
      const k = age / 1.5
      shock.current.visible = !s.armed && k < 1
      shock.current.scale.setScalar(0.6 + k * 4)
      ;(shock.current.material as THREE.MeshBasicMaterial).opacity = Math.pow(1 - clamp(k), 1.5) * 0.9
    }
  })

  return (
    <group rotation={[0.12, 0, 0]}>
      <Glow color={palette.purple} size={10} intensity={0.16} position={[0, 0, -3]} />
      <mesh geometry={tube} material={pathMaterial} />
      {STAGE_POINTS.map((p, i) => (
        <StageNode key={i} index={i} position={p} />
      ))}

      <group ref={head}>
        <mesh>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color={palette.threat.clone().multiplyScalar(4)} toneMapped={false} />
        </mesh>
        <Glow color={palette.threat} size={1.4} intensity={0.9} />
      </group>

      <group ref={reticle} position={STAGE_POINTS[0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation-z={(i * Math.PI) / 2}>
            <ringGeometry args={[0.92, 0.96, 24, 1, 0.2, Math.PI / 2 - 0.4]} />
            <meshBasicMaterial color={palette.amber.clone().multiplyScalar(1.6)} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh>
          <ringGeometry args={[1.08, 1.1, 64]} />
          <meshBasicMaterial color={palette.amber} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <mesh ref={shock} position={STAGE_POINTS[4]} visible={false}>
        <ringGeometry args={[0.96, 1, 96]} />
        <meshBasicMaterial color={palette.cyan.clone().multiplyScalar(2)} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
