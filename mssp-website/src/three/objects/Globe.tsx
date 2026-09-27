import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { fibonacciLandPoints } from '../../lib/geo'
import { mulberry32 } from '../../lib/math'
import { fogFragment, fogVertex, outputChunk, palette, sharedUniforms } from '../materials/shared'
import { useStation } from '../Station'
import { FlowTube } from './primitives'

export function latLonToVector3(lat: number, lon: number, radius: number, target = new THREE.Vector3()) {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lon + 180)
  return target.set(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta))
}

const HUBS: [number, number][] = [
  [40.7, -74.0], [37.8, -122.4], [51.5, -0.1], [50.1, 8.7], [1.35, 103.8], [35.7, 139.7],
  [-33.9, 151.2], [-23.5, -46.6], [25.2, 55.3], [19.1, 72.9], [55.8, 37.6], [43.7, -79.4],
  [-26.2, 28.0], [31.2, 121.5], [59.3, 18.1], [6.5, 3.4],
]

export interface GlobeProps {
  radius?: number
  samples?: number
  /** Dot diameter as a fraction of the average dot spacing. */
  dotScale?: number
  arcs?: number
  rotationSpeed?: number
  tilt?: number
  colorA?: THREE.Color
  colorB?: THREE.Color
  atmosphere?: number
  /** Initial spin (radians) so a chosen longitude faces the camera. */
  initialRotation?: number
  children?: ReactNode
}

/** Dotted holographic Earth with graticule, atmosphere, and data arcs. */
export function Globe({
  radius = 1.6,
  samples = 16000,
  dotScale = 0.5,
  arcs = 10,
  rotationSpeed = 0.08,
  tilt = 0.32,
  colorA = palette.cyan,
  colorB = palette.purple,
  atmosphere = 1,
  initialRotation = 0,
  children,
}: GlobeProps) {
  const spin = useRef<THREE.Group>(null)
  const { active } = useStation()

  const dots = useMemo(() => {
    const latLon = fibonacciLandPoints(samples)
    const count = latLon.length / 2
    const positions = new Float32Array(count * 3)
    const rand = new Float32Array(count)
    const r = mulberry32(11)
    const v = new THREE.Vector3()
    for (let i = 0; i < count; i++) {
      latLonToVector3(latLon[i * 2], latLon[i * 2 + 1], radius, v)
      positions.set([v.x, v.y, v.z], i * 3)
      rand[i] = r()
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 1))
    const spacing = Math.sqrt((4 * Math.PI * radius * radius) / samples)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: sharedUniforms.uTime,
        uFog: sharedUniforms.uFog,
        uPointScale: sharedUniforms.uPointScale,
        uSize: { value: spacing * dotScale },
        uRadius: { value: radius },
        uColorA: { value: colorA.clone() },
        uColorB: { value: colorB.clone() },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPointScale;
        uniform float uSize;
        uniform float uRadius;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        attribute float aRand;
        varying vec3 vColor;
        varying float vAlpha;
        ${fogVertex}
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 n = normalize(normalMatrix * normalize(position));
          float facing = dot(n, normalize(-mv.xyz));
          float lat = position.y / uRadius;
          vec3 col = mix(uColorB, uColorA, smoothstep(-0.7, 0.7, lat));
          float city = step(0.965, aRand);
          float pulse = city * pow(0.5 + 0.5 * sin(uTime * 2.2 + aRand * 120.0), 3.0);
          vColor = mix(col, vec3(1.0), pulse * 0.7);
          vAlpha = smoothstep(-0.2, 0.35, facing) * (0.6 + pulse * 1.6);
          vFogDepth = -mv.z;
          gl_PointSize = uSize * (1.0 + city * 0.9) * uPointScale / max(-mv.z, 0.1);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        ${fogFragment}
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.18, d) * vAlpha;
          gl_FragColor = vec4(vColor * a * 1.3 * fogFade(), 1.0);
          ${outputChunk}
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return { geometry, material }
  }, [radius, samples, dotScale, colorA, colorB])

  const [sphereMaterial] = useState(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uFog: sharedUniforms.uFog,
          uRim: { value: palette.blue.clone() },
          uGrid: { value: palette.cyan.clone() },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vNormalV;
          varying vec3 vViewDir;
          ${fogVertex}
          void main() {
            vUv = uv;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vNormalV = normalize(normalMatrix * normal);
            vViewDir = normalize(-mv.xyz);
            vFogDepth = -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uRim;
          uniform vec3 uGrid;
          varying vec2 vUv;
          varying vec3 vNormalV;
          varying vec3 vViewDir;
          ${fogFragment}
          void main() {
            float f = pow(1.0 - max(dot(normalize(vNormalV), normalize(vViewDir)), 0.0), 3.0);
            vec2 g = abs(fract(vUv * vec2(36.0, 18.0)) - 0.5);
            float line = smoothstep(0.47, 0.5, max(g.x, g.y));
            vec3 col = vec3(0.004, 0.012, 0.03) + uRim * f * 0.55 + uGrid * line * 0.05;
            float fog = fogFade();
            gl_FragColor = vec4(col * fog, 1.0);
            ${outputChunk}
          }
        `,
      }),
  )

  const [atmosphereMaterial] = useState(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uFog: sharedUniforms.uFog,
          uColor: { value: palette.blue.clone().lerp(palette.cyan, 0.35) },
          uIntensity: { value: atmosphere },
        },
        vertexShader: /* glsl */ `
          varying vec3 vNormalV;
          ${fogVertex}
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vNormalV = normalize(normalMatrix * normal);
            vFogDepth = -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uIntensity;
          varying vec3 vNormalV;
          ${fogFragment}
          void main() {
            float i = pow(max(0.0, 0.68 - dot(normalize(vNormalV), vec3(0.0, 0.0, 1.0))), 3.2);
            gl_FragColor = vec4(uColor * min(i, 2.5) * 0.9 * uIntensity * fogFade(), 1.0);
            ${outputChunk}
          }
        `,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
  )

  const arcCurves = useMemo(() => {
    const rand = mulberry32(99)
    const list: { curve: THREE.QuadraticBezierCurve3; color: THREE.Color; speed: number; offset: number }[] = []
    for (let i = 0; i < arcs; i++) {
      const a = HUBS[Math.floor(rand() * HUBS.length)]
      let b = HUBS[Math.floor(rand() * HUBS.length)]
      if (a === b) b = HUBS[(HUBS.indexOf(a) + 3) % HUBS.length]
      const start = latLonToVector3(a[0], a[1], radius * 1.005)
      const end = latLonToVector3(b[0], b[1], radius * 1.005)
      const dist = start.distanceTo(end)
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(radius * (1 + dist * 0.28 / radius))
      list.push({
        curve: new THREE.QuadraticBezierCurve3(start, mid, end),
        color: rand() < 0.65 ? palette.cyan : rand() < 0.5 ? palette.purple : palette.azure,
        speed: 0.22 + rand() * 0.3,
        offset: rand(),
      })
    }
    return list
  }, [arcs, radius])

  useFrame((_, delta) => {
    if (!active.current || !spin.current) return
    spin.current.rotation.y += delta * rotationSpeed
  })

  return (
    <group rotation={[tilt, 0, 0.12]}>
      <group ref={spin} rotation-y={initialRotation}>
        <mesh material={sphereMaterial}>
          <sphereGeometry args={[radius * 0.985, 64, 48]} />
        </mesh>
        <points geometry={dots.geometry} material={dots.material} />
        {arcCurves.map((a, i) => (
          <FlowTube
            key={i}
            curve={a.curve}
            color={a.color}
            radius={radius * 0.0045}
            speed={a.speed}
            offset={a.offset}
            base={0.08}
            intensity={2}
            segments={48}
          />
        ))}
        {children}
      </group>
      {atmosphere > 0 && (
        <mesh material={atmosphereMaterial} scale={1.16}>
          <sphereGeometry args={[radius, 48, 32]} />
        </mesh>
      )}
    </group>
  )
}
