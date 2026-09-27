import { useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { socModules, type SocModule } from '../../data/content'
import { useUI } from '../../lib/store'
import { createFlowMaterial, createHologramMaterial, palette } from '../materials/shared'
import { Globe } from '../objects/Globe'
import { FlowTube, Glow, HudRing, TickRing } from '../objects/primitives'
import { useStation } from '../Station'
import { DASH_H, DASH_W, painters } from './dashboards'

const PANEL_R = 4.35
const PANEL_Y = 2.25
const PANEL_W = 2.05
const PANEL_H = (PANEL_W * DASH_H) / DASH_W

function panelPose(index: number, count: number) {
  const spread = THREE.MathUtils.degToRad(112)
  const a = -spread / 2 + (index / (count - 1)) * spread
  const lift = index === Math.floor(count / 2) ? 0.3 : Math.abs(index - (count - 1) / 2) === 1 ? 0.12 : 0
  return {
    position: new THREE.Vector3(Math.sin(a) * PANEL_R, PANEL_Y + lift, -Math.cos(a) * PANEL_R + 0.6),
    rotationY: -a,
  }
}

function DashboardPanel({ module, index, count }: { module: SocModule; index: number; count: number }) {
  const group = useRef<THREE.Group>(null)
  const { active } = useStation()
  const activeModule = useUI((s) => s.activeModule)
  const setActiveModule = useUI((s) => s.setActiveModule)
  const [hovered, setHovered] = useState(false)
  const isActive = activeModule === module.id
  const pose = useMemo(() => panelPose(index, count), [index, count])

  const { canvas, texture, material } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = DASH_W
    canvas.height = DASH_H
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      toneMapped: false,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    return { canvas, texture, material }
  }, [])
  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(module.color),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [module.color],
  )
  const accum = useRef(index * 0.13)

  useFrame(({ clock }, delta) => {
    if (!active.current || !group.current) return
    const t = clock.elapsedTime
    accum.current += delta
    const interval = isActive ? 0.09 : 0.45
    if (accum.current >= interval) {
      accum.current = 0
      const ctx = canvas.getContext('2d')
      if (ctx) {
        painters[module.id](ctx, t, module.color, isActive)
        texture.needsUpdate = true
      }
    }
    const g = group.current
    const forward = isActive ? 0.75 : hovered ? 0.25 : 0
    const targetScale = isActive ? 1.14 : hovered ? 1.05 : 0.94
    g.position.set(
      pose.position.x * (1 - forward / PANEL_R),
      pose.position.y + Math.sin(t * 0.8 + index) * 0.06,
      pose.position.z * (1 - forward / PANEL_R),
    )
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, targetScale, 6, delta))
    const brightness = isActive ? 1.55 : hovered ? 1.1 : 0.62
    material.color.setScalar(THREE.MathUtils.damp(material.color.r, brightness, 6, delta))
    glowMaterial.opacity = THREE.MathUtils.damp(glowMaterial.opacity, isActive ? 0.16 : 0, 6, delta)
  })

  const over = (e: ThreeEvent<PointerEvent>) => {
    if (!active.current || e.pointerType === 'touch') return
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }
  const out = () => {
    setHovered(false)
    document.body.style.cursor = ''
  }
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!active.current) return
    e.stopPropagation()
    setActiveModule(module.id)
  }

  return (
    <group ref={group} position={pose.position} rotation-y={pose.rotationY}>
      <mesh material={glowMaterial} position-z={-0.05} scale={[PANEL_W * 1.25, PANEL_H * 1.35, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh material={material} onPointerOver={over} onPointerOut={out} onClick={click}>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
      </mesh>
    </group>
  )
}

function Analyst({ position, material }: { position: [number, number, number]; material: THREE.ShaderMaterial }) {
  const facing = Math.atan2(-position[0], -position[2])
  const head = useRef<THREE.Mesh>(null)
  const { active } = useStation()
  const seed = position[0] * 2 + position[2]
  useFrame(({ clock }) => {
    if (!active.current || !head.current) return
    head.current.rotation.y = Math.sin(clock.elapsedTime * 0.5 + seed) * 0.35
  })
  return (
    <group position={position} rotation-y={facing}>
      {/* chair */}
      <mesh position={[0, 0.42, -0.26]}>
        <boxGeometry args={[0.46, 0.62, 0.06]} />
        <meshStandardMaterial color="#0b1328" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.46, 0.06, 0.46]} />
        <meshStandardMaterial color="#0b1328" metalness={0.8} roughness={0.35} />
      </mesh>
      {/* hologram body */}
      <mesh position={[0, 0.66, -0.04]} material={material}>
        <capsuleGeometry args={[0.17, 0.34, 4, 12]} />
      </mesh>
      <mesh ref={head} position={[0, 1.12, -0.02]} material={material}>
        <sphereGeometry args={[0.13, 20, 16]} />
      </mesh>
      {/* personal monitors */}
      {[-0.2, 0.2].map((x, i) => (
        <mesh key={i} position={[x, 0.98, 0.42]} rotation={[0, -x * 1.2, 0]}>
          <planeGeometry args={[0.36, 0.22]} />
          <meshBasicMaterial
            color={(i ? palette.purple : palette.cyan).clone().multiplyScalar(0.9)}
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Section 3: SOC command centre with holo-table, analysts, and floating module dashboards. */
export function SocScene() {
  const hologram = useMemo(() => createHologramMaterial(palette.cyan, 1.1), [])
  const spinner = useRef<THREE.Group>(null)
  const { active } = useStation()

  const links = useMemo(
    () =>
      socModules.map((m, i) => {
        const pose = panelPose(i, socModules.length)
        const end = pose.position.clone()
        end.y -= PANEL_H / 2 + 0.05
        const start = new THREE.Vector3(0, 0.82, 0)
        const mid = start.clone().lerp(end, 0.5)
        mid.y += 0.9
        return {
          curve: new THREE.QuadraticBezierCurve3(start, mid, end),
          material: createFlowMaterial({ color: new THREE.Color(m.color), speed: 0.45, count: 2, offset: i * 0.2, base: 0.08, intensity: 1.6 }),
        }
      }),
    [],
  )

  useFrame((_, delta) => {
    if (active.current && spinner.current) spinner.current.rotation.y += delta * 0.2
  })

  return (
    <group>
      <Glow color={palette.blue} size={12} intensity={0.2} position={[0, 2, -3]} />
      {/* Floor platform */}
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[3.6, 64]} />
        <meshStandardMaterial color="#050b1a" metalness={0.9} roughness={0.3} envMapIntensity={0.8} />
      </mesh>
      <HudRing radius={3.6} width={0.03} color={palette.cyan} opacity={0.6} y={0.01} />
      <HudRing radius={2.8} width={0.01} color={palette.blue} opacity={0.4} y={0.01} />
      <group ref={spinner} position-y={0.02}>
        <TickRing radius={3.8} count={120} length={0.06} color={palette.cyan} opacity={0.4} every={10} />
      </group>

      {/* Holo table */}
      <mesh position-y={0.4}>
        <cylinderGeometry args={[1.05, 1.2, 0.8, 48]} />
        <meshStandardMaterial color="#081226" metalness={0.9} roughness={0.25} envMapIntensity={1.2} />
      </mesh>
      <HudRing radius={1.02} width={0.03} color={palette.cyan} opacity={0.9} y={0.81} />
      <HudRing radius={0.7} width={0.01} color={palette.purple} opacity={0.6} y={0.81} />
      <group position-y={1.75}>
        <Globe radius={0.55} samples={6000} arcs={5} rotationSpeed={0.35} atmosphere={0.7} tilt={0.2} dotScale={0.55} />
      </group>

      <Analyst position={[-1.95, 0, 0.35]} material={hologram} />
      <Analyst position={[1.95, 0, 0.35]} material={hologram} />
      <Analyst position={[-1.15, 0, -1.6]} material={hologram} />
      <Analyst position={[1.15, 0, -1.6]} material={hologram} />

      {links.map((l, i) => (
        <FlowTube key={i} curve={l.curve} material={l.material} radius={0.012} segments={40} />
      ))}
      {socModules.map((m, i) => (
        <DashboardPanel key={m.id} module={m} index={i} count={socModules.length} />
      ))}
    </group>
  )
}
