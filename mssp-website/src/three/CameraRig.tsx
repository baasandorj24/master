import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { clamp, damp, easeInOutCubic, easeOutCubic, lerp } from '../lib/math'
import { scroll } from '../lib/scroll'
import { sharedUniforms } from './materials/shared'
import { rig } from './rig'
import { STATIONS } from './stations'

const LAST = STATIONS.length - 1

type Layout = 'desktop' | 'tablet' | 'portrait'

const scratch = new THREE.Vector3()
const introOffset = new THREE.Vector3()

function stationPose(index: number, layout: Layout, outPos: THREE.Vector3, outTarget: THREE.Vector3) {
  const d = STATIONS[index]
  const driftScale = (scroll.hold[index] - 0.5) * (layout === 'portrait' ? 0.55 : 1)
  const distance = layout === 'portrait' ? d.mobile?.distance ?? 1.6 : layout === 'tablet' ? 1.2 : 1

  outTarget.fromArray(d.target)
  // Camera sits along (offset - target), scaled for narrower viewports.
  outPos.fromArray(d.offset).sub(outTarget).multiplyScalar(distance).add(outTarget)

  if (d.lookDrift) outTarget.add(scratch.fromArray(d.lookDrift).multiplyScalar(driftScale))
  if (d.drift) outPos.add(scratch.fromArray(d.drift).multiplyScalar(driftScale))

  scratch.fromArray(d.position)
  outPos.add(scratch)
  outTarget.add(scratch)
}

function framing(index: number, layout: Layout): [number, number] {
  const d = STATIONS[index]
  if (layout === 'portrait') return [0, d.mobile?.screenY ?? 0]
  if (layout === 'tablet') return [d.screenX * 0.5, 0]
  return [d.screenX, 0]
}

/**
 * Flies the camera between stations based on scroll, with a cinematic arc,
 * subtle roll, pointer parallax, and per-station off-centre framing.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)

  const tmp = useRef({
    posA: new THREE.Vector3(),
    posB: new THREE.Vector3(),
    tgtA: new THREE.Vector3(),
    tgtB: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    tgt: new THREE.Vector3(),
    prev: new THREE.Vector3(),
    first: true,
  })

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    sharedUniforms.uTime.value += dt
    sharedUniforms.uPixelRatio.value = gl.getPixelRatio()
    sharedUniforms.uPointScale.value =
      (size.height * gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))

    const v = tmp.current
    rig.station = v.first ? scroll.station : damp(rig.station, scroll.station, 5, Math.min(delta, 0.25))
    rig.pointer.x = damp(rig.pointer.x, scroll.pointer.x, 3, dt)
    rig.pointer.y = damp(rig.pointer.y, scroll.pointer.y, 3, dt)

    const aspect = size.width / Math.max(1, size.height)
    const layout: Layout = aspect < 0.85 ? 'portrait' : aspect < 1.25 ? 'tablet' : 'desktop'
    rig.portrait = layout === 'portrait'

    const s = clamp(rig.station, 0, LAST)
    const i = Math.min(Math.floor(s), LAST - 1)
    const t = s - i
    const e = easeInOutCubic(t)

    stationPose(i, layout, v.posA, v.tgtA)
    stationPose(i + 1, layout, v.posB, v.tgtB)
    v.pos.lerpVectors(v.posA, v.posB, e)
    v.tgt.lerpVectors(v.tgtA, v.tgtB, e)

    // Flight arc between stations.
    const arc = Math.sin(Math.PI * t)
    v.pos.y += arc * 3
    v.pos.x += arc * (i % 2 === 0 ? 2.5 : -2.5)

    // Opening fly-in from deep space.
    const intro = 1 - easeOutCubic(clamp(scroll.intro))
    if (intro > 0) v.pos.add(introOffset.set(-2 * intro, 4 * intro, 26 * intro))

    // Pointer parallax.
    v.pos.x += rig.pointer.x * 0.7
    v.pos.y += rig.pointer.y * 0.4

    camera.position.copy(v.pos)
    camera.lookAt(v.tgt)
    camera.rotateZ(arc * 0.07 * (i % 2 === 0 ? -1 : 1) - rig.pointer.x * 0.012)

    const [ax, ay] = framing(i, layout)
    const [bx, by] = framing(i + 1, layout)
    const fx = lerp(ax, bx, e)
    const fy = lerp(ay, by, e)
    camera.setViewOffset(size.width, size.height, -fx * size.width, fy * size.height, size.width, size.height)
    camera.updateProjectionMatrix()

    if (v.first) {
      v.prev.copy(v.pos)
      v.first = false
    }
    rig.velocity.subVectors(v.pos, v.prev).divideScalar(Math.max(dt, 1e-3))
    v.prev.copy(v.pos)
    rig.speed = damp(rig.speed, Math.min(rig.velocity.length(), 120), 6, dt)
  }, -2)

  return null
}
