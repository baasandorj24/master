import type { SocModuleId } from '../../lib/store'

/**
 * Procedural dashboard painters for the SOC's floating holo-screens. Each one
 * draws a live-looking visualisation onto a 2D canvas used as a texture.
 */
export const DASH_W = 512
export const DASH_H = 312

type Painter = (ctx: CanvasRenderingContext2D, t: number, color: string, active: boolean) => void

const FONT = '"JetBrains Mono", ui-monospace, monospace'

function frame(ctx: CanvasRenderingContext2D, title: string, value: string, color: string, active: boolean) {
  ctx.clearRect(0, 0, DASH_W, DASH_H)
  const g = ctx.createLinearGradient(0, 0, DASH_W, DASH_H)
  g.addColorStop(0, 'rgba(12, 24, 52, 0.92)')
  g.addColorStop(1, 'rgba(4, 8, 20, 0.92)')
  ctx.fillStyle = g
  roundRect(ctx, 2, 2, DASH_W - 4, DASH_H - 4, 18)
  ctx.fill()

  ctx.strokeStyle = 'rgba(120, 170, 255, 0.07)'
  ctx.lineWidth = 1
  for (let x = 24; x < DASH_W; x += 32) line(ctx, x, 60, x, DASH_H - 16)
  for (let y = 60; y < DASH_H; y += 32) line(ctx, 16, y, DASH_W - 16, y)

  ctx.strokeStyle = color
  ctx.globalAlpha = active ? 1 : 0.55
  ctx.lineWidth = active ? 3 : 2
  roundRect(ctx, 2, 2, DASH_W - 4, DASH_H - 4, 18)
  ctx.stroke()
  ctx.globalAlpha = 1

  ctx.fillStyle = color
  ctx.font = `600 22px ${FONT}`
  ctx.fillText(title, 24, 40)
  ctx.fillStyle = 'rgba(230, 240, 255, 0.85)'
  ctx.font = `500 18px ${FONT}`
  const w = ctx.measureText(value).width
  ctx.fillText(value, DASH_W - 24 - w, 40)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(DASH_W - 36 - w, 34, 5, 0, Math.PI * 2)
  ctx.fill()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

const siem: Painter = (ctx, t, color, active) => {
  frame(ctx, 'SIEM · EVENTS/SEC', `${(2.2 + Math.sin(t * 0.7) * 0.2).toFixed(2)}M`, color, active)
  const top = 70
  const bottom = DASH_H - 30
  ctx.beginPath()
  for (let i = 0; i <= 64; i++) {
    const x = 24 + (i / 64) * (DASH_W - 48)
    const v =
      0.5 +
      Math.sin(i * 0.35 + t * 2) * 0.18 +
      Math.sin(i * 0.9 - t * 1.3) * 0.1 +
      (i % 17 === Math.floor(t * 3) % 17 ? 0.25 : 0)
    const y = bottom - v * (bottom - top)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.lineTo(DASH_W - 24, bottom)
  ctx.lineTo(24, bottom)
  ctx.closePath()
  const g = ctx.createLinearGradient(0, top, 0, bottom)
  g.addColorStop(0, color + '66')
  g.addColorStop(1, color + '00')
  ctx.fillStyle = g
  ctx.fill()
}

const xdr: Painter = (ctx, t, color, active) => {
  frame(ctx, 'XDR · DETECTIONS', '1 story', color, active)
  const rows = ['ENDPOINT', 'IDENTITY', 'CLOUD', 'EMAIL', 'NETWORK']
  rows.forEach((label, i) => {
    const y = 84 + i * 42
    ctx.fillStyle = 'rgba(200, 215, 240, 0.75)'
    ctx.font = `500 15px ${FONT}`
    ctx.fillText(label, 24, y + 14)
    const w = (0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.2 + i * 1.4))) * 300
    ctx.fillStyle = 'rgba(120, 170, 255, 0.12)'
    ctx.fillRect(170, y, 300, 18)
    const g = ctx.createLinearGradient(170, 0, 170 + w, 0)
    g.addColorStop(0, color + '55')
    g.addColorStop(1, color)
    ctx.fillStyle = g
    ctx.fillRect(170, y, w, 18)
  })
}

const soar: Painter = (ctx, t, color, active) => {
  const step = Math.floor(t * 0.8) % 5
  frame(ctx, 'SOAR · PLAYBOOK', `step ${step + 1}/5`, color, active)
  const steps = ['TRIAGE', 'ENRICH', 'ISOLATE', 'REVOKE', 'NOTIFY']
  const y = 170
  ctx.lineWidth = 3
  steps.forEach((label, i) => {
    const x = 60 + i * 98
    if (i < steps.length - 1) {
      ctx.strokeStyle = i < step ? color : 'rgba(120, 170, 255, 0.25)'
      line(ctx, x + 22, y, x + 76, y)
    }
    ctx.beginPath()
    ctx.arc(x, y, 20, 0, Math.PI * 2)
    ctx.fillStyle = i <= step ? color : 'rgba(20, 34, 70, 1)'
    ctx.fill()
    ctx.strokeStyle = color
    ctx.stroke()
    ctx.fillStyle = 'rgba(210, 225, 245, 0.85)'
    ctx.font = `500 13px ${FONT}`
    const w = ctx.measureText(label).width
    ctx.fillText(label, x - w / 2, y + 48)
  })
  const px = 60 + (step + ((t * 0.8) % 1)) * 98
  ctx.beginPath()
  ctx.arc(Math.min(px, 60 + 4 * 98), y, 7, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.fillStyle = 'rgba(200, 215, 240, 0.7)'
  ctx.font = `500 15px ${FONT}`
  ctx.fillText('ransomware-containment · auto-approved', 24, DASH_H - 34)
}

const ndr: Painter = (ctx, t, color, active) => {
  frame(ctx, 'NDR · EAST-WEST', '118 Gbps', color, active)
  const cx = 150
  const cy = 184
  const r = 100
  ctx.strokeStyle = color + '55'
  ctx.lineWidth = 1.5
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath()
    ctx.arc(cx, cy, (r * i) / 3, 0, Math.PI * 2)
    ctx.stroke()
  }
  const a = t * 1.6
  const g = ctx.createConicGradient ? ctx.createConicGradient(a - 0.9, cx, cy) : null
  if (g) {
    g.addColorStop(0, color + '00')
    g.addColorStop(0.14, color + '88')
    g.addColorStop(0.15, color + '00')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ;[
    [0.6, 0.4],
    [2.1, 0.75],
    [3.9, 0.55],
    [5.2, 0.85],
  ].forEach(([ang, dist], i) => {
    const TAU = Math.PI * 2
    const sinceSweep = (((a - ang) % TAU) + TAU) % TAU
    const fade = Math.max(0, 1 - sinceSweep / 2.5)
    ctx.fillStyle = i === 2 ? `rgba(255, 61, 113, ${0.3 + fade})` : `rgba(230, 245, 255, ${0.25 + fade})`
    ctx.beginPath()
    ctx.arc(cx + Math.cos(ang) * r * dist, cy + Math.sin(ang) * r * dist, 6, 0, Math.PI * 2)
    ctx.fill()
  })
  const lines = ['beacon 198.51.100.7', 'smb SRV-DB-07 → FS-02', 'dns entropy 4.8', 'tls rare JA4']
  ctx.font = `500 14px ${FONT}`
  lines.forEach((l, i) => {
    ctx.fillStyle = i === 0 ? '#ff3d71' : 'rgba(200, 215, 240, 0.75)'
    ctx.fillText(l, 280, 110 + i * 40)
  })
}

const ti: Painter = (ctx, t, color, active) => {
  frame(ctx, 'THREAT INTEL', '3.1M IOCs', color, active)
  const rows = [
    ['sha256', '9f2c…e41a', 'HIGH'],
    ['domain', 'cdn-upd.example', 'MED'],
    ['ip', '203.0.113.42', 'HIGH'],
    ['actor', 'FIN-cluster-7', 'CRIT'],
    ['url', '/invoice/view.php', 'MED'],
    ['hash', 'b77a…0c19', 'LOW'],
  ]
  const offset = Math.floor(t * 1.2)
  ctx.font = `500 15px ${FONT}`
  for (let i = 0; i < 5; i++) {
    const r = rows[(i + offset) % rows.length]
    const y = 90 + i * 40
    ctx.fillStyle = 'rgba(120, 170, 255, 0.08)'
    ctx.fillRect(20, y - 22, DASH_W - 40, 32)
    ctx.fillStyle = 'rgba(160, 180, 210, 0.75)'
    ctx.fillText(r[0], 32, y)
    ctx.fillStyle = 'rgba(230, 240, 255, 0.9)'
    ctx.fillText(r[1], 120, y)
    ctx.fillStyle = r[2] === 'CRIT' || r[2] === 'HIGH' ? '#ff3d71' : r[2] === 'MED' ? '#fbbf24' : color
    ctx.fillText(r[2], DASH_W - 90, y)
  }
}

export const painters: Record<SocModuleId, Painter> = { siem, xdr, soar, ndr, ti }
