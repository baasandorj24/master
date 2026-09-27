import { useMemo } from 'react'
import { socLocations } from '../../data/content'
import { isLand } from '../../lib/geo'

const W = 1000
const LAT_TOP = 84
const LAT_BOTTOM = -58
const H = (W * (LAT_TOP - LAT_BOTTOM)) / 360
const STEP = 2.4

const project = (lat: number, lon: number): [number, number] => [((lon + 180) / 360) * W, ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * H]

/** Dot-matrix world map with pulsing SOC locations and animated links. */
export function WorldMap({ className = '' }: { className?: string }) {
  const dots = useMemo(() => {
    let d = ''
    for (let lat = LAT_TOP - STEP / 2; lat > LAT_BOTTOM; lat -= STEP) {
      for (let lon = -180 + STEP / 2; lon < 180; lon += STEP) {
        if (isLand(lat, lon)) {
          const [x, y] = project(lat, lon)
          d += `M${x.toFixed(1)} ${y.toFixed(1)}h0`
        }
      }
    }
    return d
  }, [])

  const points = useMemo(() => socLocations.map((l) => ({ ...l, xy: project(l.lat, l.lon) })), [])

  const arcs = useMemo(() => {
    const order = [0, 3, 4, 5, 6, 7, 8, 2, 1, 0]
    const list: string[] = []
    for (let i = 0; i < order.length - 1; i++) {
      const [x1, y1] = points[order[i]].xy
      const [x2, y2] = points[order[i + 1]].xy
      const mx = (x1 + x2) / 2
      const my = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.22 - 12
      list.push(`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`)
    }
    return list
  }, [points])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`Global SOC network: ${socLocations.map((l) => l.city).join(', ')}`}>
      <defs>
        <linearGradient id="map-dots" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#22e3ff" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="#2f7bff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#9b5cff" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="map-arc" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#22e3ff" />
          <stop offset="1" stopColor="#9b5cff" />
        </linearGradient>
        <linearGradient id="map-scan" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#22e3ff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#22e3ff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#22e3ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="map-marker">
          <stop offset="0" stopColor="#bdf6ff" />
          <stop offset="1" stopColor="#22e3ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <path d={dots} stroke="url(#map-dots)" strokeWidth="3.1" strokeLinecap="round" fill="none" />

      <rect y="0" width="120" height={H} fill="url(#map-scan)">
        <animate attributeName="x" from="-140" to={W + 20} dur="7s" repeatCount="indefinite" />
      </rect>

      {arcs.map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke="url(#map-arc)" strokeOpacity="0.22" strokeWidth="1.2" />
          <path
            d={d}
            fill="none"
            stroke="url(#map-arc)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="14 186"
            className="animate-dash"
            style={{ animationDelay: `${-i * 0.45}s` }}
          />
        </g>
      ))}

      {points.map((p) => (
        <g key={p.city} transform={`translate(${p.xy[0]} ${p.xy[1]})`}>
          <circle r="16" fill="url(#map-marker)" opacity="0.35" />
          <circle r="7" fill="none" stroke="#22e3ff" strokeWidth="1.2" className="animate-pulse-ring [transform-box:fill-box] [transform-origin:center]" />
          <circle r="3.4" fill="#bdf6ff" />
          <text x="9" y="-8" className="hidden fill-slate-300 font-mono text-[11px] tracking-wider md:block">
            {p.city.toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  )
}
