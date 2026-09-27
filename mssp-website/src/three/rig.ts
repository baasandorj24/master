import * as THREE from 'three'

/** Per-frame camera rig state shared across the 3D scenes. */
export const rig = {
  /** Smoothed station value the camera is currently at. */
  station: 0,
  /** Camera velocity (world units / second), used by the warp streaks. */
  velocity: new THREE.Vector3(),
  speed: 0,
  /** Damped pointer (-1..1). */
  pointer: new THREE.Vector2(),
  /** Is the viewport portrait / narrow. */
  portrait: false,
}
