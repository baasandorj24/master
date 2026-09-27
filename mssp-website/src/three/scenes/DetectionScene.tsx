import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '../../lib/math'
import { createFresnelMaterial, fogFragment, fogVertex, outputChunk, palette, sharedUniforms } from '../materials/shared'
import { Glow, HudRing } from '../objects/primitives'
import { useStation } from '../Station'

const LAYERS = [
  { x: -2.7, count: 7, radius: 1.5 },
  { x: -1.15, count: 10, radius: 1.8 },
  { x: 0.35, count: 10, radius: 1.65 },
  { x: 1.75, count: 6, radius: 1.15 },
]
const CORE = new THREE.Vector3(3.35, 0, 0)

function useNetwork() {
  return useMemo(() => {
    const layers = LAYERS.map((layer, li) =>
      Array.from({ length: layer.count }, (_, i) => {
        const a = (i / layer.count) * Math.PI * 2 + li * 0.4
        return new THREE.Vector3(layer.x, Math.cos(a) * layer.radius, Math.sin(a) * layer.radius * 0.8)
      }),
    )
    const rand = mulberry32(17)
    const positions: number[] = []
    const ts: number[] = []
    const seeds: number[] = []
    const push = (a: THREE.Vector3, b: THREE.Vector3) => {
      const s = rand()
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z)
      ts.push(0, 1)
      seeds.push(s, s)
    }
    for (let l = 0; l < layers.length - 1; l++) {
      layers[l].forEach((a) => layers[l + 1].forEach((b) => push(a, b)))
    }
    layers[layers.length - 1].forEach((a) => push(a, CORE))
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('aT', new THREE.Float32BufferAttribute(ts, 1))
    geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1))
    return { layers, geometry, nodes: layers.flat() }
  }, [])
}

function useSynapseMaterial() {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: sharedUniforms.uTime,
          uFog: sharedUniforms.uFog,
          uA: { value: palette.blue.clone() },
          uB: { value: palette.cyan.clone() },
        },
        vertexShader: /* glsl */ `
          attribute float aT;
          attribute float aSeed;
          varying float vT;
          varying float vSeed;
          ${fogVertex}
          void main() {
            vT = aT;
            vSeed = aSeed;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vFogDepth = -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uA;
          uniform vec3 uB;
          varying float vT;
          varying float vSeed;
          ${fogFragment}
          void main() {
            float phase = fract(uTime * (0.35 + vSeed * 0.5) + vSeed * 7.0);
            float pulse = exp(-pow((vT - phase) * 10.0, 2.0)) * step(0.42, vSeed);
            float a = 0.07 + pulse * 1.6;
            vec3 col = mix(uA, uB, pulse);
            gl_FragColor = vec4(col * a * fogFade(), 1.0);
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

/** Particles streaming from the edge of the world into the input layer and into the core. */
function DataStreams({ inputs, outputs, count }: { inputs: THREE.Vector3[]; outputs: THREE.Vector3[]; count: number }) {
  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(23)
    const starts = new Float32Array(count * 3)
    const ends = new Float32Array(count * 3)
    const meta = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      const toCore = i < count * 0.28
      if (toCore) {
        const o = outputs[Math.floor(rand() * outputs.length)]
        starts.set([o.x, o.y, o.z], i * 3)
        ends.set([CORE.x, CORE.y, CORE.z], i * 3)
      } else {
        const a = rand() * Math.PI * 2
        const r = 1 + rand() * 2.4
        starts.set([-6.5 - rand() * 2, Math.cos(a) * r, Math.sin(a) * r], i * 3)
        const t = inputs[Math.floor(rand() * inputs.length)]
        ends.set([t.x, t.y, t.z], i * 3)
      }
      // offset, speed, type (0 data, 1 threat), stream kind (0 input, 1 core)
      meta.set([rand(), toCore ? 0.5 + rand() * 0.4 : 0.18 + rand() * 0.22, rand() < 0.1 ? 1 : 0, toCore ? 1 : 0], i * 4)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(starts, 3))
    geometry.setAttribute('aEnd', new THREE.BufferAttribute(ends, 3))
    geometry.setAttribute('aMeta', new THREE.BufferAttribute(meta, 4))
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: sharedUniforms.uTime,
        uFog: sharedUniforms.uFog,
        uPointScale: sharedUniforms.uPointScale,
        uData: { value: palette.cyan.clone() },
        uAlt: { value: palette.blue.clone() },
        uThreat: { value: palette.threat.clone() },
        uCore: { value: new THREE.Color('#c9f6ff') },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPointScale;
        uniform vec3 uData;
        uniform vec3 uAlt;
        uniform vec3 uThreat;
        uniform vec3 uCore;
        attribute vec3 aEnd;
        attribute vec4 aMeta;
        varying vec3 vColor;
        varying float vAlpha;
        ${fogVertex}
        void main() {
          float prog = fract(uTime * aMeta.y + aMeta.x);
          float eased = aMeta.w > 0.5 ? prog * prog : smoothstep(0.0, 1.0, prog);
          vec3 p = mix(position, aEnd, eased);
          // Spiral swirl that tightens as the packet approaches its target.
          float swirl = (1.0 - eased) * (aMeta.w > 0.5 ? 0.15 : 0.45);
          float ang = uTime * 1.3 + aMeta.x * 40.0;
          p.y += cos(ang) * swirl;
          p.z += sin(ang) * swirl;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vFogDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
          vec3 col = mix(uData, uAlt, fract(aMeta.x * 13.0) * 0.6);
          col = mix(col, uThreat, aMeta.z);
          col = mix(col, uCore, aMeta.w * eased);
          vColor = col;
          vAlpha = smoothstep(0.0, aMeta.w > 0.5 ? 0.12 : 0.3, prog) * (1.0 - smoothstep(0.88, 1.0, prog));
          float size = 0.05 + aMeta.z * 0.04 + aMeta.w * 0.02;
          gl_PointSize = size * uPointScale / max(-mv.z, 0.1);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        ${fogFragment}
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = pow(smoothstep(0.5, 0.0, d), 1.6) * vAlpha;
          gl_FragColor = vec4(vColor * a * 2.0 * fogFade(), 1.0);
          ${outputChunk}
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return { geometry, material }
  }, [inputs, outputs, count])

  return <points geometry={geometry} material={material} frustumCulled={false} />
}

function AICore() {
  const rings = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Mesh>(null)
  const { active } = useStation()
  const plasma = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: sharedUniforms.uTime,
          uFog: sharedUniforms.uFog,
          uA: { value: palette.cyan.clone() },
          uB: { value: palette.purple.clone() },
        },
        vertexShader: /* glsl */ `
          varying vec3 vLocal;
          varying vec3 vNormalV;
          varying vec3 vViewDir;
          ${fogVertex}
          void main() {
            vLocal = position;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vNormalV = normalize(normalMatrix * normal);
            vViewDir = normalize(-mv.xyz);
            vFogDepth = -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uA;
          uniform vec3 uB;
          varying vec3 vLocal;
          varying vec3 vNormalV;
          varying vec3 vViewDir;
          ${fogFragment}
          void main() {
            vec3 n = normalize(vLocal);
            float f = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vViewDir))), 2.0);
            float w = sin(n.x * 9.0 + uTime * 1.7) * sin(n.y * 11.0 - uTime * 1.3) * sin(n.z * 7.0 + uTime);
            float bands = smoothstep(0.1, 0.9, 0.5 + 0.5 * w);
            vec3 col = mix(uA, uB, bands) * (0.35 + bands * 0.9) + uA * f * 1.6;
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
  const halo = useMemo(() => createFresnelMaterial({ color: palette.cyan, power: 1.6, intensity: 1.1 }), [])

  useFrame(({ clock }, delta) => {
    if (!active.current) return
    if (rings.current) {
      rings.current.children[0].rotation.z += delta * 0.8
      rings.current.children[1].rotation.x += delta * 0.6
      rings.current.children[2].rotation.y -= delta * 0.4
    }
    if (inner.current) inner.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.06)
  })

  return (
    <group position={CORE}>
      <Glow color={palette.cyan} size={5.5} intensity={0.5} />
      <Glow color={palette.purple} size={3} intensity={0.45} />
      <mesh ref={inner}>
        <icosahedronGeometry args={[0.3, 3]} />
        <meshBasicMaterial color={palette.white.clone().multiplyScalar(2.6)} toneMapped={false} />
      </mesh>
      <mesh material={plasma}>
        <icosahedronGeometry args={[0.72, 16]} />
      </mesh>
      <mesh material={halo} scale={1.25}>
        <sphereGeometry args={[0.72, 32, 32]} />
      </mesh>
      <group ref={rings}>
        <group rotation-x={Math.PI / 2}>
          <HudRing radius={1.12} width={0.018} color={palette.cyan} opacity={0.8} />
        </group>
        <group rotation-z={0.9}>
          <HudRing radius={1.3} width={0.014} color={palette.purple} opacity={0.7} thetaLength={Math.PI * 1.4} />
        </group>
        <group rotation-x={0.6}>
          <HudRing radius={1.48} width={0.01} color={palette.blue} opacity={0.6} thetaLength={Math.PI * 0.8} />
        </group>
      </group>
    </group>
  )
}

/** Section 2: holographic neural network and data streams feeding an AI core. */
export function DetectionScene({ particles = 900 }: { particles?: number }) {
  const { layers, geometry, nodes } = useNetwork()
  const synapse = useSynapseMaterial()
  const instanced = useRef<THREE.InstancedMesh>(null)
  const root = useRef<THREE.Group>(null)
  const { active } = useStation()
  const color = useMemo(() => new THREE.Color(), [])

  useFrame(({ clock }, delta) => {
    if (!active.current) return
    const t = clock.elapsedTime
    if (root.current) root.current.rotation.x += delta * 0.04
    const mesh = instanced.current
    if (!mesh) return
    nodes.forEach((_, i) => {
      const act = Math.pow(0.5 + 0.5 * Math.sin(t * 2.1 + i * 1.73), 6)
      color.copy(i % 3 === 0 ? palette.purple : palette.cyan).multiplyScalar(0.9 + act * 2.8)
      mesh.setColorAt(i, color)
    })
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  const matrices = useMemo(() => {
    const m = new THREE.Matrix4()
    return nodes.map((p) => m.clone().setPosition(p))
  }, [nodes])

  return (
    <group rotation={[0, -0.28, 0]} position={[-0.3, 0, 0]}>
      <group ref={root}>
        <lineSegments geometry={geometry} material={synapse} />
        <instancedMesh
          ref={(mesh) => {
            instanced.current = mesh
            if (!mesh) return
            matrices.forEach((m, i) => {
              mesh.setMatrixAt(i, m)
              mesh.setColorAt(i, palette.cyan)
            })
            mesh.instanceMatrix.needsUpdate = true
          }}
          args={[undefined, undefined, nodes.length]}
        >
          <icosahedronGeometry args={[0.085, 2]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
        {LAYERS.map((l, i) => (
          <group key={i} position-x={l.x} rotation-z={Math.PI / 2}>
            <HudRing radius={l.radius + 0.18} width={0.008} color={palette.blue} opacity={0.35} />
          </group>
        ))}
        <DataStreams inputs={layers[0]} outputs={layers[layers.length - 1]} count={particles} />
      </group>
      <AICore />
    </group>
  )
}
