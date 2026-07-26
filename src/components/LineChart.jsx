// Parametrik grafik — bağımlılıksız SVG çizgi grafiği.
//
// Tüm araç ekranları bunu kullanır. Tek ölçek kuralı geçerlidir: bir grafikte
// tek bir y ekseni bulunur, ikinci bir ölçek eklenmez. Farklı büyüklükteki iki
// nicelik gösterilecekse iki ayrı grafik çizilir.
//
// Renkler yalnızca theme.css değişkenlerinden gelir (var(--series-N)).

import { useMemo, useRef, useState } from 'react'

// Renk JSX'e yazılmaz: eleman `tone-N` sınıfını alır, gerçek değer
// theme.css içindeki --series-N değişkeninden gelir.
//
// İkincil kodlama: kimlik hiçbir zaman yalnız renge bırakılmaz. Nötr seri
// tanımı gereği kromasız olduğu için her seri ayrı bir çizgi deseni de alır.
const DASHES = [null, '7 4', '2 3', '10 3 2 3']

// Seri sırasından ton sınıfı. Sıra --series-N ile birebir eşleşir.
export const toneClass = (i) => `tone-${(i % 4) + 1}`

const M = { top: 14, right: 18, bottom: 36, left: 62 }
const W = 760
const H = 320
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom

// --- Ölçekler ---

function makeScale(kind, min, max, size, flip) {
  const log = kind === 'log' && min > 0 && max > 0
  const a = log ? Math.log10(min) : min
  const b = log ? Math.log10(max) : max
  const span = b - a || 1
  return (v) => {
    const t = ((log ? Math.log10(v) : v) - a) / span
    return flip ? size - t * size : t * size
  }
}

// Eksen üzerinde "güzel" tik değerleri
function linearTicks(min, max, count = 5) {
  const span = max - min
  if (!(span > 0)) return [min]
  const raw = span / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag
  const out = []
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) {
    out.push(Number(v.toFixed(12)))
  }
  return out
}

function logTicks(min, max) {
  if (!(min > 0) || !(max > min)) return [min]
  const out = []
  const lo = Math.floor(Math.log10(min))
  const hi = Math.ceil(Math.log10(max))
  const decades = hi - lo
  // Dekat sayısı azsa ara tikler de yazılır, çoksa yalnızca dekatlar
  const mantissas = decades <= 3 ? [1, 2, 5] : [1]
  for (let d = lo; d <= hi; d++) {
    for (const m of mantissas) {
      const v = m * Math.pow(10, d)
      if (v >= min && v <= max) out.push(v)
    }
  }
  return out
}

// --- Yardımcılar ---

function extent(values) {
  let lo = Infinity
  let hi = -Infinity
  for (const v of values) {
    if (!Number.isFinite(v)) continue
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  return Number.isFinite(lo) ? [lo, hi] : null
}

function padRange([lo, hi], pad = 0.06) {
  if (lo === hi) {
    const d = Math.abs(lo) * 0.1 || 1
    return [lo - d, hi + d]
  }
  const d = (hi - lo) * pad
  return [lo - d, hi + d]
}

function pathFrom(points, sx, sy) {
  let d = ''
  let pen = false
  for (const [x, y] of points) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) { pen = false; continue }
    d += `${pen ? 'L' : 'M'}${sx(x).toFixed(2)} ${sy(y).toFixed(2)}`
    pen = true
  }
  return d
}

/**
 * @param {object}   props
 * @param {string}   props.xLabel        x ekseni başlığı (birim dahil)
 * @param {string}   props.yLabel        y ekseni başlığı (birim dahil)
 * @param {'log'|'linear'} props.xScale
 * @param {Array}    props.series        [{ key, name, color, points: [[x,y]…] }]
 * @param {object}   [props.band]        { name, color, points: [[x, yLo, yHi]…] }
 * @param {Array}    [props.refLines]    [{ y|x, label, key }]
 * @param {object}   [props.marker]      { x, y, label }
 * @param {Function} [props.formatX]
 * @param {Function} [props.formatY]
 * @param {string}   [props.caption]
 * @param {string}   [props.empty]       veri yokken gösterilecek metin
 */
export default function LineChart({
  xLabel, yLabel, xScale = 'linear',
  series = [], band = null, refLines = [], marker = null,
  formatX = (v) => String(v), formatY = (v) => String(v),
  caption, empty = 'Grafik için geçerli girdi gerekli.',
}) {
  const svgRef = useRef(null)
  const [hover, setHover] = useState(null)

  const model = useMemo(() => {
    const live = series.filter((s) => s.points?.length)
    if (live.length === 0) return null

    const xs = live.flatMap((s) => s.points.map((p) => p[0]))
    const ys = live.flatMap((s) => s.points.map((p) => p[1]))
    if (band?.points?.length) {
      ys.push(...band.points.flatMap((p) => [p[1], p[2]]))
    }
    for (const r of refLines) if (Number.isFinite(r.y)) ys.push(r.y)
    if (marker && Number.isFinite(marker.y)) ys.push(marker.y)

    const xe = extent(xs)
    const ye = extent(ys)
    if (!xe || !ye) return null

    const [y0, y1] = padRange(ye)
    const sx = makeScale(xScale, xe[0], xe[1], PLOT_W, false)
    const sy = makeScale('linear', y0, y1, PLOT_H, true)

    return {
      live, sx, sy,
      xTicks: xScale === 'log' ? logTicks(xe[0], xe[1]) : linearTicks(xe[0], xe[1]),
      yTicks: linearTicks(y0, y1),
      xDomain: xe,
    }
  }, [series, band, refLines, marker, xScale])

  if (!model) {
    return (
      <figure className="chart-figure">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={empty}>
          <text className="chart-empty" x={W / 2} y={H / 2} textAnchor="middle">{empty}</text>
        </svg>
      </figure>
    )
  }

  const { live, sx, sy, xTicks, yTicks } = model
  const px = (v) => M.left + sx(v)
  const py = (v) => M.top + sy(v)

  // İmleç: x'e en yakın örnek noktanın indeksini bulur
  function onMove(e) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const xPix = ((e.clientX - rect.left) / rect.width) * W - M.left
    if (xPix < 0 || xPix > PLOT_W) { setHover(null); return }

    const ref = live[0].points
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < ref.length; i++) {
      const d = Math.abs(sx(ref[i][0]) - xPix)
      if (d < bestD) { bestD = d; best = i }
    }
    setHover(best)
  }

  const hoverX = hover != null ? live[0].points[hover]?.[0] : null
  const hoverRows = hover != null
    ? live
      .map((s, i) => ({ name: s.name, tone: s.tone ?? toneClass(i), y: s.points[hover]?.[1] }))
      .filter((row) => Number.isFinite(row.y))
    : []

  // İpucu kutusu grafiğin dışına taşmasın
  const tipW = 168
  const tipH = 22 + hoverRows.length * 15
  const tipX = hoverX != null
    ? Math.min(Math.max(px(hoverX) + 12, M.left), W - M.right - tipW)
    : 0

  return (
    <figure className="chart-figure">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={caption || `${yLabel} — ${xLabel}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {/* Izgara */}
        {yTicks.map((t) => (
          <line key={`gy${t}`} className="chart-grid" x1={M.left} x2={W - M.right} y1={py(t)} y2={py(t)} />
        ))}
        {xTicks.map((t) => (
          <line key={`gx${t}`} className="chart-grid" x1={px(t)} x2={px(t)} y1={M.top} y2={M.top + PLOT_H} />
        ))}

        {/* Tolerans bandı — çizgilerin altında kalır */}
        {band?.points?.length > 0 && (
          <path
            className={`chart-band ${band.tone ?? toneClass(0)}`}
            d={
              pathFrom(band.points.map((p) => [p[0], p[2]]), px, py) +
              pathFrom([...band.points].reverse().map((p) => [p[0], p[1]]), px, py).replace('M', 'L') +
              'Z'
            }
          />
        )}

        {/* Referans çizgileri */}
        {refLines.filter((r) => Number.isFinite(r.y)).map((r) => (
          <g key={r.key ?? r.label}>
            <line className="chart-ref" x1={M.left} x2={W - M.right} y1={py(r.y)} y2={py(r.y)} />
            <text className="chart-ref-label" x={W - M.right - 2} y={py(r.y) - 5} textAnchor="end">{r.label}</text>
          </g>
        ))}

        {/* Seriler — ton + desen birlikte taşınır */}
        {live.map((s, i) => (
          <path
            key={s.key}
            className={`chart-line ${s.tone ?? toneClass(i)}`}
            strokeDasharray={DASHES[i % DASHES.length] ?? undefined}
            d={pathFrom(s.points, px, py)}
          />
        ))}

        {/* Doğrudan etiket — seri adı eğrinin ucunda, metin mürekkebiyle.
            Renk körlüğü ayrımı taban bandında olduğu için her zaman yazılır. */}
        {live.map((s, i) => {
          const last = [...s.points].reverse().find((p) => Number.isFinite(p[1]))
          if (!last) return null
          return (
            <g key={`lbl${s.key}`}>
              <circle
                className={`chart-dot ${s.tone ?? toneClass(i)}`}
                cx={px(last[0]) - 7}
                cy={py(last[1]) - 11}
                r={3.5}
              />
              <text className="chart-tip-text" x={px(last[0])} y={py(last[1]) - 8} textAnchor="end">{s.name}</text>
            </g>
          )
        })}

        {/* Çalışma noktası */}
        {marker && Number.isFinite(marker.x) && Number.isFinite(marker.y) && (
          <g>
            <circle className="chart-marker-ring" cx={px(marker.x)} cy={py(marker.y)} r={5.5} />
            <circle className="chart-marker" cx={px(marker.x)} cy={py(marker.y)} r={4} />
            {marker.label && (
              <text className="chart-ref-label" x={px(marker.x)} y={py(marker.y) - 12} textAnchor="middle">
                {marker.label}
              </text>
            )}
          </g>
        )}

        {/* Eksenler */}
        <line className="chart-axis" x1={M.left} x2={M.left} y1={M.top} y2={M.top + PLOT_H} />
        <line className="chart-axis" x1={M.left} x2={W - M.right} y1={M.top + PLOT_H} y2={M.top + PLOT_H} />

        {yTicks.map((t) => (
          <text key={`ty${t}`} className="chart-tick" x={M.left - 8} y={py(t) + 3.5} textAnchor="end">
            {formatY(t)}
          </text>
        ))}
        {xTicks.map((t) => (
          <text key={`tx${t}`} className="chart-tick" x={px(t)} y={M.top + PLOT_H + 15} textAnchor="middle">
            {formatX(t)}
          </text>
        ))}

        <text className="chart-axis-label" x={W - M.right} y={H - 4} textAnchor="end">{xLabel}</text>
        <text className="chart-axis-label" x={4} y={M.top - 4}>{yLabel}</text>

        {/* İmleç ve ipucu */}
        {hoverX != null && (
          <g>
            <line className="chart-crosshair" x1={px(hoverX)} x2={px(hoverX)} y1={M.top} y2={M.top + PLOT_H} />
            {hoverRows.map((row) => (
              <g key={`hp${row.name}`}>
                <circle className="chart-marker-ring" cx={px(hoverX)} cy={py(row.y)} r={5} />
                <circle className={`chart-dot ${row.tone}`} cx={px(hoverX)} cy={py(row.y)} r={3.5} />
              </g>
            ))}
            <rect className="chart-tip-box" x={tipX} y={M.top + 6} width={tipW} height={tipH} rx={4} />
            <text className="chart-tip-text dim" x={tipX + 9} y={M.top + 22}>
              {xLabel.replace(/\s*\(.*\)$/, '')}: {formatX(hoverX)}
            </text>
            {hoverRows.map((row, i) => (
              <g key={`ht${row.name}`}>
                <circle className={`chart-dot ${row.tone}`} cx={tipX + 13} cy={M.top + 33 + i * 15} r={3.5} />
                <text className="chart-tip-text" x={tipX + 22} y={M.top + 37 + i * 15}>
                  {formatY(row.y)}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

// Grafik üstünde kullanılan açıklama satırı. Tek serili grafikte gerekmez —
// başlık zaten seriyi adlandırır.
export function ChartLegend({ items }) {
  return (
    <div className="chart-legend">
      {items.map((it) => (
        <span className="item" key={it.label}>
          <span
            className={[
              'swatch',
              it.tone ?? 'tone-muted',
              it.kind === 'line' ? 'line' : '',
              it.faded ? 'faded' : '',
            ].filter(Boolean).join(' ')}
          />
          {it.label}
        </span>
      ))}
    </div>
  )
}

// Erişilebilirlik: grafiğin sayısal karşılığı her zaman tabloyla da verilir.
// Eğri yüzlerce noktadan oluşabildiği için tablo `every` adımda bir örneklenir.
export function ChartDataTable({ xLabel, series, formatX, formatY, every = 1 }) {
  const live = series.filter((s) => s.points?.length)
  if (live.length === 0) return null

  const ref = live[0].points
  const indices = []
  for (let i = 0; i < ref.length; i += every) indices.push(i)
  // Son nokta her zaman gösterilir — eğrinin sağ ucu asimptotu taşır
  if (indices[indices.length - 1] !== ref.length - 1) indices.push(ref.length - 1)

  return (
    <details className="chart-data">
      <summary>Veri tablosu</summary>
      <div className="scroll">
        <table className="pick-table">
          <thead>
            <tr>
              <th>{xLabel}</th>
              {live.map((s) => <th key={s.key}>{s.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {indices.map((i) => (
              <tr key={i}>
                <td>{formatX(ref[i][0])}</td>
                {live.map((s) => (
                  <td key={s.key}>{Number.isFinite(s.points[i]?.[1]) ? formatY(s.points[i][1]) : '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
