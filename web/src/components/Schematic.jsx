// Devre şeması çerçevesi. Her araç kendi SVG içeriğini çocuk olarak verir.
// Renkler theme.css sınıflarından gelir (.sch-wire, .sch-part, .sch-label …),
// SVG içine literal renk yazılmaz.

import { forwardRef } from 'react'

// `ref` yalnızca rapor üretimi için: report.js bu <svg> düğümünün canlı
// `outerHTML`'ini alıp `lib/svgInline.js` ile satır içi renklere çevirir.
// Ekran davranışını etkilemez — dokunmayan ekranlarda ref hiç geçirilmez.
const Schematic = forwardRef(function Schematic({ viewBox, caption, title, children }, ref) {
  return (
    <figure className="schematic">
      <svg ref={ref} viewBox={viewBox} role="img" aria-label={title}>
        <title>{title}</title>
        {children}
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
})

export default Schematic

// Dikey duran IEC direnç sembolü (kutu). x,y sol üst köşe.
export function ResistorV({ x, y, w = 22, h = 44, off = false }) {
  return <rect className={`sch-part${off ? ' off' : ''}`} x={x} y={y} width={w} height={h} rx={2} />
}

// Bağlantı düğümü
export function Node({ x, y, r = 3.5 }) {
  return <circle className="sch-node" cx={x} cy={y} r={r} />
}

// Toprak sembolü, (x, y) üst çizginin ortası
export function Ground({ x, y }) {
  return (
    <g className="sch-wire">
      <line x1={x - 13} x2={x + 13} y1={y} y2={y} />
      <line x1={x - 8} x2={x + 8} y1={y + 5} y2={y + 5} />
      <line x1={x - 3} x2={x + 3} y1={y + 10} y2={y + 10} />
    </g>
  )
}

// Açık uç terminali
export function Terminal({ x, y, r = 4 }) {
  return <circle cx={x} cy={y} r={r} fill="var(--bg)" stroke="var(--accent)" strokeWidth={2} />
}

// Akım yönü oku. dir: 'up' | 'down' | 'left' | 'right'
// (x, y) okun ucu; etiket okun yanına yazılır.
export function CurrentArrow({ x, y, dir = 'down', len = 16, label, labelSide = 'right' }) {
  const vec = {
    up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
  }[dir] ?? [0, 1]

  const tailX = x - vec[0] * len
  const tailY = y - vec[1] * len
  // Ok başı: uçtan geriye doğru iki kanat
  const wing = 4
  const perp = [-vec[1], vec[0]]
  const headA = `${x - vec[0] * 6 + perp[0] * wing},${y - vec[1] * 6 + perp[1] * wing}`
  const headB = `${x - vec[0] * 6 - perp[0] * wing},${y - vec[1] * 6 - perp[1] * wing}`

  const anchor = labelSide === 'left' ? 'end' : 'start'
  const lx = x + (labelSide === 'left' ? -7 : 7) + (vec[0] !== 0 ? -vec[0] * len * 0.5 : 0)
  const ly = tailY + (vec[1] !== 0 ? (len / 2) * vec[1] : -6)

  return (
    <g className="sch-current">
      <line className="sch-arrow" x1={tailX} y1={tailY} x2={x} y2={y} />
      <polygon className="sch-arrow-head" points={`${x},${y} ${headA} ${headB}`} />
      {label && (
        <text className="sch-value" x={lx} y={ly} textAnchor={anchor}>{label}</text>
      )}
    </g>
  )
}
