import { WORLD_MASK, WORLD_MASK_COLS, WORLD_MASK_ROWS } from '../data/worldMask'

let bits: Uint8Array | null = null

function decode(): Uint8Array {
  if (bits) return bits
  const out = new Uint8Array(WORLD_MASK_COLS * WORLD_MASK_ROWS)
  for (let r = 0; r < WORLD_MASK_ROWS; r++) {
    const row = WORLD_MASK[r]
    for (let c = 0; c < WORLD_MASK_COLS; c++) {
      const nibble = parseInt(row[c >> 2], 16)
      out[r * WORLD_MASK_COLS + c] = (nibble >> (3 - (c & 3))) & 1
    }
  }
  bits = out
  return out
}

/** True when the given coordinate falls on land (1° resolution). */
export function isLand(lat: number, lon: number): boolean {
  const mask = decode()
  const r = Math.min(WORLD_MASK_ROWS - 1, Math.max(0, Math.floor(90 - lat)))
  const c = (((Math.floor(lon + 180) % 360) + 360) % 360) | 0
  return mask[r * WORLD_MASK_COLS + c] === 1
}

export interface GeoPoint {
  lat: number
  lon: number
}

/**
 * Evenly distributed land points using a Fibonacci sphere.
 * Returned as a flat [lat, lon, lat, lon, ...] array.
 */
export function fibonacciLandPoints(samples: number, minLat = -62): Float32Array {
  const out: number[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2
    const theta = golden * i
    const lat = (Math.asin(y) * 180) / Math.PI
    let lon = ((theta * 180) / Math.PI) % 360
    if (lon > 180) lon -= 360
    if (lat < minLat) continue
    if (isLand(lat, lon)) out.push(lat, lon)
  }
  return new Float32Array(out)
}
