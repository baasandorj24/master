/**
 * World-space layout of the cyber-defence ecosystem the camera flies through.
 * Each station hosts the 3D scene for one page section.
 */
export type Vec3 = [number, number, number]

export interface StationDef {
  id: string
  /** World position of the station's focal object. */
  position: Vec3
  /** Camera position relative to `position`. */
  offset: Vec3
  /** Look-at point relative to `position`. */
  target: Vec3
  /** Camera drift across the section's hold progress (applied from -0.5 to +0.5). */
  drift?: Vec3
  /** Look-at drift across hold progress. */
  lookDrift?: Vec3
  /** Desktop framing: horizontal screen shift of the focal object (fraction of width). */
  screenX: number
  /** Portrait framing overrides. */
  mobile?: { screenY?: number; distance?: number }
}

export const STATIONS: StationDef[] = [
  {
    id: 'hero',
    position: [0, 0, 0],
    offset: [0, 0.35, 10.8],
    target: [0, 0, 0],
    screenX: 0.245,
    mobile: { screenY: -0.2, distance: 1.75 },
  },
  {
    id: 'attack-surface',
    position: [18, -5, -44],
    offset: [0, 4, 12.6],
    target: [0, 0.1, 0],
    drift: [-2.2, 0.8, -1.2],
    screenX: -0.215,
    mobile: { screenY: 0.02, distance: 1.75 },
  },
  {
    id: 'detection',
    position: [-16, -10, -88],
    offset: [0, 0.7, 12.6],
    target: [0.3, 0, 0],
    drift: [1.8, 0.5, -1.4],
    screenX: 0.215,
    mobile: { screenY: 0.02, distance: 1.8 },
  },
  {
    id: 'soc',
    position: [14, -17, -132],
    offset: [0, 4.4, 12.4],
    target: [0, 1.1, 0],
    drift: [-2.4, 0.6, -1.6],
    screenX: -0.235,
    mobile: { screenY: 0.02, distance: 1.7 },
  },
  {
    id: 'threat-hunting',
    position: [-12, -24, -176],
    offset: [0, 1.6, 11.2],
    target: [0, 0, 0],
    drift: [5.4, 0.8, -0.6],
    lookDrift: [5.2, 0.4, 0],
    screenX: 0.15,
    mobile: { screenY: 0.1, distance: 1.55 },
  },
  {
    id: 'services',
    position: [10, -30, -220],
    offset: [0, 1.2, 13],
    target: [0, 0, 0],
    drift: [0, -0.6, -1.5],
    screenX: 0,
    mobile: { distance: 1.3 },
  },
  {
    id: 'results',
    position: [-6, -36, -264],
    offset: [0, 1.6, 12.5],
    target: [0, 0.2, 0],
    drift: [0, 0.6, -1],
    screenX: 0,
    mobile: { distance: 1.3 },
  },
  {
    id: 'outro',
    position: [0, -44, -308],
    offset: [0, 1.2, 15],
    target: [0, -1.2, 0],
    drift: [0, 1.4, -2.5],
    screenX: 0,
    mobile: { distance: 1.25 },
  },
]
