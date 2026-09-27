import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'
import { mulberry32 } from '../../lib/math'
import { fogFragment, fogVertex, outputChunk, palette, sharedUniforms } from '../materials/shared'
import { Globe } from '../objects/Globe'
import { Glow, HudRing, TickRing } from '../objects/primitives'
import { rig } from '../rig'
import { useStation } from '../Station'

const GLOBE_R = 1.55
const SHIELD_R = 2.3
const MAX_IMPACTS = 6

const impactChunk = /* glsl */ `
  uniform vec4 uImpacts[${MAX_IMPACTS}];
  float impactField(vec3 n, float time) {
    float acc = 0.0;
    for (int i = 0; i < ${MAX_IMPACTS}; i++) {
      vec4 imp = uImpacts[i];
      float age = time - imp.w;
      if (age < 0.0 || age > 1.8) continue;
      float ang = acos(clamp(dot(n, normalize(imp.xyz)), -1.0, 1.0));
      float ring = smoothstep(0.14, 0.0, abs(ang - age * 1.25)) * (1.0 - age / 1.8);
      float flash = smoothstep(0.45, 0.0, ang) * max(0.0, 1.0 - age * 2.5);
      acc += ring + flash * 1.8;
    }
    return acc;
  }
`

function useShieldMaterials(impacts: THREE.Vector4[]) {
  return useMemo(() => {
    const common = {
      uTime: sharedUniforms.uTime,
      uFog: sharedUniforms.uFog,
      uImpacts: { value: impacts },
      uColor: { value: palette.cyan.clone().lerp(palette.blue, 0.35) },
      uHit: { value: new THREE.Color('#9ff6ff') },
    }
    const vertex = /* glsl */ `
      varying vec3 vLocal;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      ${fogVertex}
      void main() {
        vLocal = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormalV = normalize(normalMatrix * normalize(position));
        vViewDir = normalize(-mv.xyz);
        vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `
    const shell = new THREE.ShaderMaterial({
      uniforms: common,
      vertexShader: vertex,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uHit;
        varying vec3 vLocal;
        varying vec3 vNormalV;
        varying vec3 vViewDir;
        ${fogFragment}
        ${impactChunk}
        void main() {
          vec3 n = normalize(vLocal);
          float fres = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vViewDir))), 3.2);
          float band = smoothstep(0.05, 0.0, abs(n.y - sin(uTime * 0.55) * 0.92)) * 0.25;
          float hit = impactField(n, uTime);
          vec3 col = uColor * (fres * 0.85 + band * (0.3 + fres)) + uHit * hit * 0.55;
          gl_FragColor = vec4(col * fogFade(), 1.0);
          ${outputChunk}
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const lines = new THREE.ShaderMaterial({
      uniforms: common,
      vertexShader: vertex,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uHit;
        varying vec3 vLocal;
        varying vec3 vNormalV;
        varying vec3 vViewDir;
        ${fogFragment}
        ${impactChunk}
        void main() {
          vec3 n = normalize(vLocal);
          float facing = dot(normalize(vNormalV), normalize(vViewDir));
          float fres = pow(1.0 - abs(facing), 2.0);
          float back = facing < 0.0 ? 0.35 : 1.0;
          float band = smoothstep(0.08, 0.0, abs(n.y - sin(uTime * 0.55) * 0.92));
          float hit = impactField(n, uTime);
          float a = (0.06 + fres * 0.32 + band * 0.5) * back;
          vec3 col = uColor * a + uHit * hit * 1.2;
          gl_FragColor = vec4(col * fogFade(), 1.0);
          ${outputChunk}
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return { shell, lines }
  }, [impacts])
}

interface Threat {
  pos: THREE.Vector3
  vel: THREE.Vector3
  alive: boolean
  wait: number
  flash: number
  hit: THREE.Vector3
}

/** Hostile projectiles that are deflected by the shield, triggering ripples. */
function Threats({ count, onImpact }: { count: number; onImpact: (localDir: THREE.Vector3) => void }) {
  const { active } = useStation()
  const heads = useRef<(THREE.Group | null)[]>([])
  const flashes = useRef<(THREE.Mesh | null)[]>([])
  const rand = useMemo(() => mulberry32(5), [])
  const threats = useMemo<Threat[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        alive: false,
        wait: 0.4 + i * 0.7,
        flash: 0,
        hit: new THREE.Vector3(),
      })),
    [count],
  )

  const tailGeometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.028, 0.0, 1.4, 8, 1, true)
    g.translate(0, -0.7, 0)
    const colors = new Float32Array(g.attributes.position.count * 3)
    for (let i = 0; i < g.attributes.position.count; i++) {
      const y = g.attributes.position.getY(i)
      const t = 1 + y / 1.4
      colors.set([t, t * 0.25, t * 0.45], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [])

  const spawn = (t: Threat) => {
    const dir = new THREE.Vector3(rand() * 2 - 1, rand() * 1.6 - 0.8, (rand() * 2 - 1) * 0.55).normalize()
    t.pos.copy(dir).multiplyScalar(9 + rand() * 3)
    const aim = dir.clone().add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.7)).normalize()
    t.vel.copy(aim.multiplyScalar(SHIELD_R)).sub(t.pos).normalize().multiplyScalar(3.4 + rand() * 1.8)
    t.alive = true
  }

  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])

  useFrame((_, delta) => {
    if (!active.current) return
    const dt = Math.min(delta, 0.05)
    threats.forEach((t, i) => {
      const head = heads.current[i]
      const flash = flashes.current[i]
      if (!head || !flash) return
      if (!t.alive) {
        t.wait -= dt
        if (t.wait <= 0) spawn(t)
      } else {
        t.pos.addScaledVector(t.vel, dt)
        if (t.pos.length() <= SHIELD_R) {
          t.hit.copy(t.pos).setLength(SHIELD_R)
          t.alive = false
          t.wait = 0.6 + rand() * 2.2
          t.flash = 1
          onImpact(t.hit.clone().normalize())
        }
      }
      head.visible = t.alive
      if (t.alive) {
        head.position.copy(t.pos)
        head.quaternion.setFromUnitVectors(up, t.vel.clone().normalize())
      }
      t.flash = Math.max(0, t.flash - dt * 2.4)
      flash.visible = t.flash > 0
      if (t.flash > 0) {
        flash.position.copy(t.hit)
        flash.scale.setScalar(0.1 + (1 - t.flash) * 0.55)
        ;(flash.material as THREE.MeshBasicMaterial).opacity = t.flash
      }
    })
  })

  return (
    <>
      {threats.map((_, i) => (
        <group key={i}>
          <group ref={(el) => void (heads.current[i] = el)} visible={false}>
            <mesh>
              <sphereGeometry args={[0.045, 12, 12]} />
              <meshBasicMaterial color={palette.threat.clone().multiplyScalar(3)} toneMapped={false} />
            </mesh>
            <mesh geometry={tailGeometry}>
              <meshBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
          <mesh ref={(el) => void (flashes.current[i] = el)} visible={false}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial
              color={new THREE.Color('#bff8ff').multiplyScalar(2)}
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </>
  )
}

/** Gyroscopic orbit ring with travelling satellites. */
function OrbitRing({ radius, tilt, speed, color, satellites = 2 }: { radius: number; tilt: [number, number, number]; speed: number; color: THREE.Color; satellites?: number }) {
  const ref = useRef<THREE.Group>(null)
  const { active } = useStation()
  useFrame((_, delta) => {
    if (active.current && ref.current) ref.current.rotation.y += delta * speed
  })
  return (
    <group rotation={tilt}>
      <group ref={ref}>
        <HudRing radius={radius} width={0.012} color={color} opacity={0.55} segments={160} />
        <HudRing radius={radius} width={0.05} color={color} opacity={0.35} thetaLength={0.7} segments={24} />
        {Array.from({ length: satellites }, (_, i) => {
          const a = (i / satellites) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * radius, 0, Math.sin(a) * radius]}>
              <octahedronGeometry args={[0.055, 0]} />
              <meshBasicMaterial color={color.clone().multiplyScalar(2.5)} toneMapped={false} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

/** Holographic pedestal: concentric HUD rings and an energy beam. */
function Pedestal() {
  const spin = useRef<THREE.Group>(null)
  const { active } = useStation()
  const beam = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: sharedUniforms.uTime, uFog: sharedUniforms.uFog, uColor: { value: palette.cyan.clone() } },
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
          varying vec2 vUv;
          ${fogFragment}
          void main() {
            float fade = pow(1.0 - vUv.y, 2.2);
            float stripes = 0.65 + 0.35 * sin(vUv.y * 40.0 - uTime * 3.0);
            gl_FragColor = vec4(uColor * fade * stripes * 0.35 * fogFade(), 1.0);
            ${outputChunk}
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  )
  useFrame((_, delta) => {
    if (active.current && spin.current) spin.current.rotation.y -= delta * 0.15
  })
  return (
    <group position-y={-2.75}>
      <mesh material={beam} position-y={0.9}>
        <cylinderGeometry args={[0.55, 1.4, 1.8, 48, 1, true]} />
      </mesh>
      <HudRing radius={1.45} width={0.03} color={palette.cyan} opacity={0.7} />
      <HudRing radius={2.35} width={0.012} color={palette.blue} opacity={0.5} />
      <group ref={spin}>
        <TickRing radius={2.5} count={96} length={0.07} color={palette.cyan} opacity={0.5} every={8} />
        <HudRing radius={3.1} width={0.02} color={palette.purple} opacity={0.5} thetaLength={Math.PI * 0.6} segments={64} />
        <HudRing radius={3.1} width={0.02} color={palette.cyan} opacity={0.5} thetaStart={Math.PI} thetaLength={Math.PI * 0.35} segments={48} />
      </group>
    </group>
  )
}

/** Hero: a floating cyber core — dotted globe inside a geodesic energy shield. */
export function HeroScene({ threatCount = 7 }: { threatCount?: number }) {
  const tiltGroup = useRef<THREE.Group>(null)
  const { active } = useStation()
  const [impacts] = useState(() => Array.from({ length: MAX_IMPACTS }, () => new THREE.Vector4(0, 1, 0, -100)))
  const impactIndex = useRef(0)
  const { shell, lines } = useShieldMaterials(impacts)
  const geodesic = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(SHIELD_R, 3), 1), [])

  const onImpact = (dir: THREE.Vector3) => {
    const slot = impacts[impactIndex.current++ % MAX_IMPACTS]
    slot.set(dir.x, dir.y, dir.z, sharedUniforms.uTime.value)
  }

  useFrame((_, delta) => {
    if (!active.current || !tiltGroup.current) return
    const g = tiltGroup.current
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -rig.pointer.y * 0.18, 3, delta)
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, rig.pointer.x * 0.3, 3, delta)
  })

  return (
    <group>
      <Glow color={palette.blue} size={11} intensity={0.32} position={[0, 0, -2]} />
      <Glow color={palette.purple} size={7} intensity={0.22} position={[1.6, 1.2, -3]} />
      <Float speed={1.1} rotationIntensity={0.15} floatIntensity={0.55} floatingRange={[-0.12, 0.12]}>
        <group ref={tiltGroup}>
          <Globe radius={GLOBE_R} samples={18000} arcs={12} rotationSpeed={0.07} dotScale={0.62} initialRotation={-0.9} />
          <mesh material={shell}>
            <icosahedronGeometry args={[SHIELD_R, 12]} />
          </mesh>
          <lineSegments geometry={geodesic} material={lines} />
          <OrbitRing radius={2.85} tilt={[1.15, 0, 0.35]} speed={0.35} color={palette.cyan} satellites={3} />
          <OrbitRing radius={3.25} tilt={[1.7, 0.4, -0.5]} speed={-0.22} color={palette.purple} satellites={2} />
          <Threats count={threatCount} onImpact={onImpact} />
        </group>
      </Float>
      <Pedestal />
    </group>
  )
}
