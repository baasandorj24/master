import { useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { assetCategories } from '../../data/content'
import { mulberry32 } from '../../lib/math'
import { useUI, type AssetCategory } from '../../lib/store'
import { createFlowMaterial, createFresnelMaterial, palette } from '../materials/shared'
import { FlowTube, Glow, HudRing, TickRing } from '../objects/primitives'
import { useStation } from '../Station'

interface Part {
  geometry: THREE.BufferGeometry
  position?: [number, number, number]
  rotation?: [number, number, number]
}

/** Low-poly holographic "icons" for each asset class. */
function buildParts(kind: AssetCategory): Part[] {
  switch (kind) {
    case 'endpoint':
      return [
        { geometry: new THREE.BoxGeometry(0.62, 0.4, 0.03), position: [0, 0.2, -0.12], rotation: [-0.22, 0, 0] },
        { geometry: new THREE.BoxGeometry(0.66, 0.03, 0.42), position: [0, -0.03, 0.1] },
      ]
    case 'cloud':
      return [
        { geometry: new THREE.IcosahedronGeometry(0.2, 1), position: [-0.22, -0.02, 0] },
        { geometry: new THREE.IcosahedronGeometry(0.27, 1), position: [0.04, 0.08, 0] },
        { geometry: new THREE.IcosahedronGeometry(0.18, 1), position: [0.3, -0.04, 0] },
      ]
    case 'server':
      return [-0.2, 0, 0.2].map((y) => ({ geometry: new THREE.BoxGeometry(0.5, 0.15, 0.4), position: [0, y, 0] as [number, number, number] }))
    case 'saas':
      return [
        { geometry: new THREE.CylinderGeometry(0.32, 0.32, 0.12, 6), rotation: [Math.PI / 2, 0, 0] },
        { geometry: new THREE.CylinderGeometry(0.14, 0.14, 0.16, 6), rotation: [Math.PI / 2, 0, 0], position: [0, 0, 0.04] },
      ]
    case 'user':
      return [
        { geometry: new THREE.CapsuleGeometry(0.15, 0.2, 3, 10), position: [0, -0.16, 0] },
        { geometry: new THREE.IcosahedronGeometry(0.13, 1), position: [0, 0.2, 0] },
      ]
  }
}

interface NodeDef {
  id: string
  label: string
  kind: AssetCategory
  color: THREE.Color
  position: THREE.Vector3
  radius: number
  exposed: boolean
}

const NODE_NAMES: Record<AssetCategory, string[]> = {
  endpoint: ['FIN-LT-0421', 'ENG-MBP-1187', 'HR-WS-0093'],
  cloud: ['k8s-prod-eu', 'lambda-billing', 'vm-analytics-02'],
  server: ['SRV-DB-07', 'SRV-DC-01', 'OT-GW-12'],
  saas: ['Email & Calendar', 'CRM Platform', 'File Sharing'],
  user: ['a.khan (Finance)', 'svc-backup', 'Domain Admins'],
}

function useNodes(): NodeDef[] {
  return useMemo(() => {
    const rand = mulberry32(42)
    const nodes: NodeDef[] = []
    assetCategories.forEach((cat, ci) => {
      const sector = (ci / assetCategories.length) * Math.PI * 2 + 0.3
      ;[-0.36, 0, 0.36].forEach((spread, k) => {
        const a = sector + spread
        const r = [3.1, 3.9, 3.35][k] + rand() * 0.2
        const y = (rand() - 0.4) * 1.3
        nodes.push({
          id: `${cat.id}-${k}`,
          label: NODE_NAMES[cat.id][k],
          kind: cat.id,
          color: new THREE.Color(cat.color),
          position: new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r),
          radius: r,
          exposed: (ci === 1 && k === 2) || (ci === 3 && k === 0) || (ci === 4 && k === 1),
        })
      })
    })
    return nodes
  }, [])
}

const scan = { radius: 0 }

function AssetNode({ node, onHover }: { node: NodeDef; onHover: (n: NodeDef | null) => void }) {
  const group = useRef<THREE.Group>(null)
  const { active, presence } = useStation()
  const highlighted = useUI((s) => s.hoveredAsset)
  const [hovered, setHovered] = useState(false)
  const parts = useMemo(() => buildParts(node.kind), [node.kind])
  const edges = useMemo(() => parts.map((p) => new THREE.EdgesGeometry(p.geometry, 20)), [parts])
  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0a1224',
        metalness: 0.85,
        roughness: 0.22,
        emissive: node.color,
        emissiveIntensity: 0.12,
        envMapIntensity: 1.4,
        transparent: true,
        opacity: 0.92,
      }),
    [node.color],
  )
  const edgeMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: node.color.clone(), transparent: true, toneMapped: false }),
    [node.color],
  )
  const seed = useMemo(() => node.position.x * 3.1 + node.position.z * 1.7, [node.position])

  useFrame(({ clock }, delta) => {
    if (!active.current || !group.current) return
    const t = clock.elapsedTime
    const dimmed = highlighted !== null && highlighted !== node.kind
    const focus = hovered || highlighted === node.kind
    const target = focus ? 1.3 : dimmed ? 0.8 : 1
    const s = THREE.MathUtils.damp(group.current.scale.x, target, 8, delta)
    group.current.scale.setScalar(s)
    group.current.position.y = node.position.y + Math.sin(t * 0.9 + seed) * 0.08
    group.current.rotation.y = Math.sin(t * 0.4 + seed) * 0.35

    const scanHit = Math.exp(-Math.abs(scan.radius - node.radius) * 5)
    const warn = node.exposed ? Math.pow(0.5 + 0.5 * Math.sin(t * 3 + seed), 2) : 0
    const base = dimmed ? 0.25 : focus ? 3.2 : 1.35
    const color = edgeMaterial.color
    color.copy(node.color).lerp(palette.threat, warn * 0.85).multiplyScalar(base + scanHit * 2.5)
    edgeMaterial.opacity = 0.35 + 0.65 * presence.current
    bodyMaterial.emissiveIntensity = (focus ? 0.45 : 0.1) + scanHit * 0.4 + warn * 0.25
    if (node.exposed) bodyMaterial.emissive.copy(node.color).lerp(palette.threat, warn)
  })

  const over = (e: ThreeEvent<PointerEvent>) => {
    if (!active.current || e.pointerType === 'touch') return
    e.stopPropagation()
    setHovered(true)
    onHover(node)
    document.body.style.cursor = 'pointer'
  }
  const out = () => {
    setHovered(false)
    onHover(null)
    document.body.style.cursor = ''
  }

  return (
    <group ref={group} position={node.position} onPointerOver={over} onPointerOut={out}>
      {parts.map((p, i) => (
        <group key={i} position={p.position} rotation={p.rotation}>
          <mesh geometry={p.geometry} material={bodyMaterial} />
          <lineSegments geometry={edges[i]} material={edgeMaterial} />
        </group>
      ))}
      {/* Enlarged invisible hit area for easier hovering. */}
      <mesh visible={false}>
        <sphereGeometry args={[0.55, 8, 8]} />
      </mesh>
      {hovered && (
        <Html position={[0, 0.72, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="glass-strong min-w-44 rounded-xl px-3 py-2 text-left whitespace-nowrap">
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: `#${node.color.getHexString()}` }}>
              {assetCategories.find((c) => c.id === node.kind)?.label}
            </div>
            <div className="mt-0.5 font-display text-sm font-semibold text-white">{node.label}</div>
            <div className={`mt-1 flex items-center gap-1.5 text-[11px] ${node.exposed ? 'text-threat' : 'text-safe'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${node.exposed ? 'bg-threat' : 'bg-safe'}`} />
              {node.exposed ? 'Exposure detected · remediation queued' : 'Protected · telemetry healthy'}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

/** Organisation core at the centre of the attack surface. */
function Hub() {
  const ref = useRef<THREE.Group>(null)
  const { active } = useStation()
  const shell = useMemo(() => createFresnelMaterial({ color: palette.cyan, power: 2.2, intensity: 1.6 }), [])
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.62, 0)), [])
  useFrame((_, delta) => {
    if (!active.current || !ref.current) return
    ref.current.rotation.y += delta * 0.5
    ref.current.rotation.x += delta * 0.2
  })
  return (
    <group>
      <Glow color={palette.cyan} size={3.4} intensity={0.55} />
      <group ref={ref}>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={palette.cyan.clone().multiplyScalar(2)} toneMapped={false} />
        </lineSegments>
      </group>
      <mesh>
        <icosahedronGeometry args={[0.26, 2]} />
        <meshBasicMaterial color={palette.white.clone().multiplyScalar(2.2)} toneMapped={false} />
      </mesh>
      <mesh material={shell}>
        <sphereGeometry args={[0.8, 32, 32]} />
      </mesh>
    </group>
  )
}

function ScanWave() {
  const ring = useRef<THREE.Mesh>(null)
  const { active } = useStation()
  useFrame(({ clock }) => {
    if (!active.current || !ring.current) return
    const cycle = (clock.elapsedTime % 4.2) / 4.2
    scan.radius = 0.6 + cycle * 4.6
    ring.current.scale.setScalar(scan.radius)
    ;(ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - cycle) * 0.45
  })
  return (
    <mesh ref={ring} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.985, 1, 128]} />
      <meshBasicMaterial color={palette.cyan} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** Section 1: endpoints, cloud, servers, SaaS and identities linked by glowing network paths. */
export function AttackSurfaceScene() {
  const nodes = useNodes()
  const spin = useRef<THREE.Group>(null)
  const { active } = useStation()
  const setHoveredAsset = useUI((s) => s.setHoveredAsset)
  const highlighted = useUI((s) => s.hoveredAsset)
  const hoveredRef = useRef<NodeDef | null>(null)

  const links = useMemo(() => {
    const rand = mulberry32(3)
    const list: { curve: THREE.Curve<THREE.Vector3>; kind: AssetCategory; material: THREE.ShaderMaterial }[] = []
    nodes.forEach((n) => {
      const mid = n.position.clone().multiplyScalar(0.5)
      mid.y += 0.9 + rand() * 0.4
      list.push({
        curve: new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), mid, n.position.clone()),
        kind: n.kind,
        material: createFlowMaterial({ color: n.color, speed: 0.3 + rand() * 0.25, offset: rand(), base: 0.1, intensity: 1.8 }),
      })
    })
    // Lateral mesh links between neighbouring assets.
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]
      const b = nodes[(i + 1) % nodes.length]
      if (rand() < 0.35) continue
      const mid = a.position.clone().add(b.position).multiplyScalar(0.5)
      mid.y -= 0.4
      list.push({
        curve: new THREE.QuadraticBezierCurve3(a.position.clone(), mid, b.position.clone()),
        kind: a.kind,
        material: createFlowMaterial({ color: palette.azure, speed: 0.2 + rand() * 0.2, offset: rand(), base: 0.05, intensity: 1 }),
      })
    }
    return list
  }, [nodes])

  useFrame((_, delta) => {
    if (!active.current || !spin.current) return
    const paused = hoveredRef.current !== null
    spin.current.rotation.y += delta * (paused ? 0 : 0.06)
    links.forEach((l) => {
      const focus = highlighted === null || highlighted === l.kind
      const target = focus ? (highlighted === l.kind ? 3 : 1.8) : 0.35
      const u = l.material.uniforms.uIntensity
      u.value = THREE.MathUtils.damp(u.value, target, 6, delta)
    })
  })

  const onHover = (n: NodeDef | null) => {
    hoveredRef.current = n
    setHoveredAsset(n ? n.kind : null)
  }

  return (
    <group rotation={[0.08, 0, 0]} scale={0.88}>
      <group ref={spin}>
        <Hub />
        {links.map((l, i) => (
          <FlowTube key={i} curve={l.curve} material={l.material} radius={0.014} segments={40} />
        ))}
        {nodes.map((n) => (
          <AssetNode key={n.id} node={n} onHover={onHover} />
        ))}
      </group>
      <group position-y={-1.35}>
        <ScanWave />
        <HudRing radius={4.6} width={0.015} color={palette.blue} opacity={0.35} />
        <TickRing radius={4.75} count={120} length={0.05} color={palette.cyan} opacity={0.35} every={10} />
        <HudRing radius={2.2} width={0.01} color={palette.purple} opacity={0.3} />
      </group>
    </group>
  )
}
