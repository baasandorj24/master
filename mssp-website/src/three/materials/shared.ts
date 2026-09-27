import * as THREE from 'three'

export const FOG_COLOR = '#02040a'
export const FOG_DENSITY = 0.027

/** Uniforms shared by every custom shader so time/fog are updated once per frame. */
export const sharedUniforms = {
  uTime: { value: 0 },
  uFog: { value: FOG_DENSITY },
  uPixelRatio: { value: 1 },
  /** Pixels per world unit at distance 1 (drawing-buffer pixels) for size-attenuated points. */
  uPointScale: { value: 800 },
}

export const palette = {
  cyan: new THREE.Color('#22e3ff'),
  blue: new THREE.Color('#2f7bff'),
  azure: new THREE.Color('#4d8dff'),
  purple: new THREE.Color('#9b5cff'),
  pink: new THREE.Color('#e879f9'),
  threat: new THREE.Color('#ff3d71'),
  safe: new THREE.Color('#34d399'),
  amber: new THREE.Color('#fbbf24'),
  white: new THREE.Color('#e8f6ff'),
}

/**
 * Exponential-squared fog that fades additive materials to black (rather than
 * towards the fog colour, which would brighten them).
 */
export const fogVertex = /* glsl */ `
  varying float vFogDepth;
`
export const fogFragment = /* glsl */ `
  varying float vFogDepth;
  uniform float uFog;
  float fogFade() { return exp(-uFog * uFog * vFogDepth * vFogDepth); }
`

export const outputChunk = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`

/** Standard fresnel rim material (atmospheres, force fields, holograms). */
export function createFresnelMaterial({
  color = palette.cyan,
  power = 2.5,
  intensity = 1.5,
  side = THREE.FrontSide,
  base = 0,
}: {
  color?: THREE.Color
  power?: number
  intensity?: number
  side?: THREE.Side
  base?: number
} = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color.clone() },
      uPower: { value: power },
      uIntensity: { value: intensity },
      uBase: { value: base },
      uFog: sharedUniforms.uFog,
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      ${fogVertex}
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormalV = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uIntensity;
      uniform float uBase;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      ${fogFragment}
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vViewDir))), uPower);
        float a = (f + uBase) * uIntensity * fogFade();
        gl_FragColor = vec4(uColor * a, 1.0);
        ${outputChunk}
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side,
  })
}

/** Soft radial glow sprite used for halos and light blooms behind objects. */
export function createGlowMaterial(color: THREE.Color, intensity = 1) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color.clone() },
      uIntensity: { value: intensity },
      uFog: sharedUniforms.uFog,
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
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;
      ${fogFragment}
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float g = pow(max(0.0, 1.0 - d), 2.4);
        gl_FragColor = vec4(uColor * g * uIntensity * fogFade(), 1.0);
        ${outputChunk}
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

/**
 * Flowing-energy material for TubeGeometry paths (uv.x runs along the tube).
 * Comets travel from the start of the curve to the end.
 */
export function createFlowMaterial({
  color = palette.cyan,
  speed = 0.35,
  count = 1,
  offset = 0,
  base = 0.12,
  intensity = 1.6,
}: {
  color?: THREE.Color
  speed?: number
  count?: number
  offset?: number
  base?: number
  intensity?: number
} = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: sharedUniforms.uTime,
      uFog: sharedUniforms.uFog,
      uColor: { value: color.clone() },
      uSpeed: { value: speed },
      uCount: { value: count },
      uOffset: { value: offset },
      uBase: { value: base },
      uIntensity: { value: intensity },
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
      uniform float uSpeed;
      uniform float uCount;
      uniform float uOffset;
      uniform float uBase;
      uniform float uIntensity;
      varying vec2 vUv;
      ${fogFragment}
      void main() {
        float x = fract(vUv.x * uCount - uTime * uSpeed + uOffset);
        float head = pow(x, 18.0);
        float tail = pow(x, 4.0) * 0.4;
        float ends = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
        float a = (uBase + (head * 2.6 + tail) * uIntensity) * ends;
        gl_FragColor = vec4(uColor * a * fogFade(), 1.0);
        ${outputChunk}
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

/** Holographic scanline material used for analyst figures and holo props. */
export function createHologramMaterial(color = palette.cyan, intensity = 1.2) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: sharedUniforms.uTime,
      uFog: sharedUniforms.uFog,
      uColor: { value: color.clone() },
      uIntensity: { value: intensity },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      varying vec3 vWorld;
      ${fogVertex}
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 mv = viewMatrix * world;
        vNormalV = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      varying vec3 vWorld;
      ${fogFragment}
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vViewDir))), 2.0);
        float scan = 0.55 + 0.45 * sin(vWorld.y * 60.0 - uTime * 4.0);
        float flicker = 0.92 + 0.08 * sin(uTime * 23.0 + vWorld.x * 3.0);
        float a = (0.12 + f * 1.1) * scan * flicker * uIntensity;
        gl_FragColor = vec4(uColor * a * fogFade(), 1.0);
        ${outputChunk}
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}
