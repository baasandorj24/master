import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { getQualityTier, prefersReducedMotion, type QualityTier } from '../lib/device'
import { CameraRig } from './CameraRig'
import { FOG_COLOR, FOG_DENSITY, palette } from './materials/shared'
import { Conduits } from './objects/Conduits'
import { CyberParticles } from './objects/CyberParticles'
import { SkyDome } from './objects/SkyDome'
import { WarpStreaks } from './objects/WarpStreaks'
import { rig } from './rig'
import { AttackChainScene } from './scenes/AttackChainScene'
import { AttackSurfaceScene } from './scenes/AttackSurfaceScene'
import { DetectionScene } from './scenes/DetectionScene'
import { HeroScene } from './scenes/HeroScene'
import { MetricsScene } from './scenes/MetricsScene'
import { OutroScene } from './scenes/OutroScene'
import { ServicesScene } from './scenes/ServicesScene'
import { SocScene } from './scenes/SocScene'
import { Station } from './Station'

const QUALITY = {
  high: { dpr: [1, 1.75] as [number, number], particles: 4200, streams: 1000, streaks: 360, planet: 52000, multisampling: 4 },
  medium: { dpr: [1, 1.5] as [number, number], particles: 2800, streams: 700, streaks: 240, planet: 36000, multisampling: 0 },
  low: { dpr: [1, 1.5] as [number, number], particles: 1600, streams: 420, streaks: 140, planet: 24000, multisampling: 0 },
}

/** A key light that follows the pointer through the scene — live, dynamic reflections. */
function PointerLight() {
  const light = useRef<THREE.PointLight>(null)
  const target = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }) => {
    if (!light.current) return
    camera.getWorldDirection(target)
    target.multiplyScalar(7).add(camera.position)
    target.x += rig.pointer.x * 4
    target.y += rig.pointer.y * 2.5 + 1
    light.current.position.lerp(target, 0.12)
  })
  return <pointLight ref={light} color={palette.cyan} intensity={28} distance={16} decay={1.6} />
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.25} color="#8fb4ff" />
      <directionalLight position={[5, 8, 6]} intensity={1.1} color="#9fdcff" />
      <directionalLight position={[-6, -3, -4]} intensity={0.9} color={palette.purple} />
      <PointerLight />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3} color="#22e3ff" position={[0, 5, -6]} scale={[12, 1.2, 1]} />
        <Lightformer form="rect" intensity={2.5} color="#9b5cff" position={[-6, 1, 3]} rotation-y={Math.PI / 2} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={2} color="#2f7bff" position={[6, -1, 2]} rotation-y={-Math.PI / 2} scale={[10, 2, 1]} />
        <Lightformer form="ring" intensity={4} color="#ffffff" position={[0, 6, 4]} scale={2.5} />
      </Environment>
    </>
  )
}

function Effects({ quality, bloom }: { quality: QualityTier; bloom: boolean }) {
  const q = QUALITY[quality]
  return (
    <EffectComposer multisampling={q.multisampling} frameBufferType={THREE.HalfFloatType}>
      <Bloom
        mipmapBlur
        intensity={bloom ? 1.15 : 0.7}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.25}
        radius={0.72}
      />
      <Vignette offset={0.28} darkness={0.72} />
    </EffectComposer>
  )
}

/** The single, persistent WebGL canvas the whole scroll story plays out in. */
export default function Experience() {
  const [quality] = useState<QualityTier>(getQualityTier)
  const [strongBloom, setStrongBloom] = useState(true)
  const [dprCap, setDprCap] = useState(QUALITY[quality].dpr[1])
  const reduced = useMemo(prefersReducedMotion, [])
  const q = QUALITY[quality]

  return (
    <Canvas
      className="!fixed inset-0"
      dpr={[1, dprCap]}
      gl={{
        antialias: false,
        alpha: false,
        stencil: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.NoToneMapping,
      }}
      camera={{ fov: 42, near: 0.1, far: 500, position: [0, 0.4, 36] }}
      eventSource={document.getElementById('root') ?? undefined}
      eventPrefix="client"
      style={{ pointerEvents: 'none' }}
    >
      <color attach="background" args={[FOG_COLOR]} />
      <fogExp2 attach="fog" args={[FOG_COLOR, FOG_DENSITY]} />
      <PerformanceMonitor
        onDecline={() => {
          setStrongBloom(false)
          setDprCap((d) => Math.max(1, d - 0.25))
        }}
      />

      <CameraRig />
      <Lights />
      <SkyDome />
      <CyberParticles count={q.particles} />
      {!reduced && <WarpStreaks count={q.streaks} />}
      <Conduits />

      <Station index={0}>
        <HeroScene threatCount={quality === 'low' ? 5 : 7} />
      </Station>
      <Station index={1}>
        <AttackSurfaceScene />
      </Station>
      <Station index={2}>
        <DetectionScene particles={q.streams} />
      </Station>
      <Station index={3}>
        <SocScene />
      </Station>
      <Station index={4}>
        <AttackChainScene />
      </Station>
      <Station index={5}>
        <ServicesScene />
      </Station>
      <Station index={6}>
        <MetricsScene />
      </Station>
      <Station index={7}>
        <OutroScene samples={q.planet} />
      </Station>

      <Effects quality={quality} bloom={strongBloom} />
    </Canvas>
  )
}
