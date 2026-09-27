import { useMemo } from 'react'
import * as THREE from 'three'
import { fogFragment, fogVertex, outputChunk, palette, sharedUniforms } from '../materials/shared'

/** Glowing hexagonal grid floor with outward-travelling energy pulses. */
export function HexFloor({
  size = 40,
  scale = 1.6,
  radius = 12,
  color = palette.cyan,
  accent = palette.purple,
  intensity = 1,
  y = 0,
}: {
  size?: number
  scale?: number
  radius?: number
  color?: THREE.Color
  accent?: THREE.Color
  intensity?: number
  y?: number
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: sharedUniforms.uTime,
          uFog: sharedUniforms.uFog,
          uScale: { value: scale },
          uRadius: { value: radius },
          uColor: { value: color.clone() },
          uAccent: { value: accent.clone() },
          uIntensity: { value: intensity },
        },
        vertexShader: /* glsl */ `
          varying vec2 vPos;
          ${fogVertex}
          void main() {
            vPos = position.xy;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vFogDepth = -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uScale;
          uniform float uRadius;
          uniform vec3 uColor;
          uniform vec3 uAccent;
          uniform float uIntensity;
          varying vec2 vPos;
          ${fogFragment}

          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float hexDist(vec2 p) {
            p = abs(p);
            return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
          }
          vec4 hexCoords(vec2 uv) {
            vec2 r = vec2(1.0, 1.7320508);
            vec2 h = r * 0.5;
            vec2 a = mod(uv, r) - h;
            vec2 b = mod(uv - h, r) - h;
            vec2 gv = dot(a, a) < dot(b, b) ? a : b;
            return vec4(gv, uv - gv);
          }

          void main() {
            vec4 hc = hexCoords(vPos / uScale);
            float edge = 0.5 - hexDist(hc.xy);
            float line = smoothstep(0.035, 0.0, edge);
            vec2 id = hc.zw;
            float rnd = hash(id);
            float r = length(vPos);
            float fade = 1.0 - smoothstep(uRadius * 0.35, uRadius, r);
            float wave = exp(-pow((r - mod(uTime * 2.2, uRadius * 1.4)) * 0.9, 2.0));
            float cell = step(0.93, rnd) * (0.5 + 0.5 * sin(uTime * 2.0 + rnd * 50.0));
            vec3 col = uColor * line * (0.18 + wave * 0.9) + uAccent * cell * 0.08 * (1.0 - line);
            gl_FragColor = vec4(col * fade * uIntensity * fogFade(), 1.0);
            ${outputChunk}
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [scale, radius, color, accent, intensity],
  )

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y} material={material}>
      <planeGeometry args={[size, size]} />
    </mesh>
  )
}
