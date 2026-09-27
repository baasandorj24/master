import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scroll } from '../../lib/scroll'
import { outputChunk, palette } from '../materials/shared'

/**
 * Camera-following nebula dome: deep-space gradient with drifting blue/violet
 * light pools whose direction shifts as the story progresses.
 */
export function SkyDome() {
  const mesh = useRef<THREE.Mesh>(null)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uProgress: { value: 0 },
          uCyan: { value: palette.cyan.clone() },
          uBlue: { value: palette.blue.clone() },
          uPurple: { value: palette.purple.clone() },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uProgress;
          uniform vec3 uCyan;
          uniform vec3 uBlue;
          uniform vec3 uPurple;
          varying vec3 vDir;

          float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }

          vec3 rotY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }

          void main() {
            vec3 d = normalize(vDir);
            float h = d.y * 0.5 + 0.5;
            vec3 col = mix(vec3(0.0015, 0.003, 0.008), vec3(0.004, 0.008, 0.022), h);

            float a = uProgress * 3.14159;
            vec3 p1 = normalize(rotY(vec3(-0.65, 0.35, -0.7), a));
            vec3 p2 = normalize(rotY(vec3(0.75, -0.25, -0.6), a * 0.7));
            vec3 p3 = normalize(rotY(vec3(0.1, 0.8, -0.6), -a));

            col += uPurple * pow(max(dot(d, p1), 0.0), 5.0) * 0.16;
            col += uBlue * pow(max(dot(d, p2), 0.0), 4.0) * 0.14;
            col += uCyan * pow(max(dot(d, p3), 0.0), 9.0) * 0.06;

            // Faint distant starfield baked into the dome.
            vec3 cell = floor(d * 320.0);
            float star = step(0.9965, hash(cell));
            col += vec3(0.55, 0.7, 1.0) * star * 0.35 * hash(cell + 3.1);

            // Dither to avoid banding in the dark gradient.
            col += (hash(d * 1000.0) - 0.5) / 255.0;
            gl_FragColor = vec4(col, 1.0);
            ${outputChunk}
          }
        `,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  )

  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position)
    material.uniforms.uProgress.value = scroll.progress
  })

  return (
    <mesh ref={mesh} material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[200, 48, 24]} />
    </mesh>
  )
}
