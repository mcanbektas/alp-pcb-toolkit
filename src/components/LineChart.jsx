// Parametrik grafik — bağımlılıksız SVG çizgi grafiği.
//
// Tüm araç ekranları bunu kullanır. Tek ölçek kuralı geçerlidir: bir grafikte
// tek bir y ekseni bulunur, ikinci bir ölçek eklenmez. Farklı büyüklükteki iki
// nicelik gösterilecekse iki ayrı grafik çizilir.
//
// Renkler yalnızca theme.css değişkenlerinden gelir (var(--series-N)).
//
// Okunabilirlik kuralı: eğrinin üzerine düşen hiçbir yazı çıplak bırakılmaz.
// Seri adı, çalışma noktası ve referans çizgisi etiketleri opak bir kutu
// (.chart-tip-box) üzerine yazılır ve birbirleriyle çakışmayacak şekilde
// yerleştirilir; eksen tikleri sığmıyorsa seyreltilir.

import { useMemo, useRef, useState } from 'react'

// Renk JSX'e yazılmaz: eleman `tone-N` sınıfını alır, gerçek değer
// theme.css içindeki --series-N değişkeninden gelir.
//
// İkincil kodlama: kimlik hiçbir zaman yalnız renge bırakılmaz. Nötr seri
// tanımı gereği kromasız olduğu için her seri ayrı bir çizgi deseni de alır.
const DASHES = [null, '7 4', '2 3', '10 3 2 3']

// Seri sırasından ton sınıfı. Sıra --series-N ile birebir eşleşir.
export const toneClass = (i) => `tone-${(i % 4) + 1}`

const W = 760
const H = 320

// Kenar boşlukları sabit değil: sol boşluk y tik yazılarının genişliğinden türetilir,
// yoksa uzun sayılar eksenin soluna taşıp kırpılır.
const M_TOP = 20
const M_RIGHT = 18
const M_BOTTOM = 38
const M_LEFT_MIN = 46
const M_LEFT_MAX = 130

// Yazı ölçüleri. Tüm grafik yazıları tek aralıklı (mono) olduğu için genişlik
// karakter sayısından güvenle kestirilebilir; ölçüm için DOM'a gitmek gerekmez.
// Katsayı gerçek ilerlemenin (0.60 em) biraz üstünde tutulur ki kestirim dar kalmasın.
const CH = 0.62
const FONT_TICK = 10
const FONT_LABEL = 11
const textW = (s, size) => String(s).length * size * CH

// Yüzen etiket kutusu ölçüleri (seri adı, çalışma noktası, referans çizgisi).
const PILL_H = 16
const PILL_PAD = 5
const PILL_GAP = 3

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

// Tik yazıları birbirine girmesin: her tikin kapladığı genişlik/yükseklik
// bilinerek, komşular çakışacaksa dizinin her k'ıncı elemanı bırakılır.
// İlk ve son tik korunur — eksenin sınırlarını onlar anlatır.
function thinTicks(ticks, place, size) {
  if (ticks.length < 2) return ticks
  for (let step = 1; step <= ticks.length; step++) {
    const kept = ticks.filter((_, i) => i % step === 0)
    let ok = true
    for (let i = 1; i < kept.length; i++) {
      const a = place(kept[i - 1])
      const b = place(kept[i])
      if (Math.abs(b.at - a.at) < (a.size + b.size) / 2 + 6) { ok = false; break }
    }
    if (ok) return kept
  }
  return [ticks[0], ticks[ticks.length - 1]]
}

// Yüzen etiketleri çakışmadan yerleştirir. Her etiket önce istediği yere
// konur; kutu daha önce yerleşmiş bir kutuyla kesişiyorsa 18 px'lik adımlarla
// önce yukarı, sonra aşağı denenir. Hiçbiri sığmazsa istenen yerde bırakılır —
// eksik etiket, üst üste binmiş etiketten daha kötüdür.
function layoutLabels(items, bounds) {
  const placed = []
  const out = []
  const hits = (box) => placed.some((p) => (
    box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0
  ))

  for (const it of items) {
    const w = textW(it.text, FONT_LABEL) + PILL_PAD * 2
    const half = it.anchor === 'middle' ? w / 2 : it.anchor === 'end' ? w : 0
    let x0 = it.x - half
    // Kutu çizim alanının dışına taşmasın
    x0 = Math.min(Math.max(x0, bounds.x0 + 2), bounds.x1 - w - 2)

    let y = it.y
    let box = null
    const offsets = [0]
    for (let k = 1; k <= 5; k++) offsets.push(-k * (PILL_H + PILL_GAP), k * (PILL_H + PILL_GAP))
    for (const dy of offsets) {
      const cy = Math.min(Math.max(it.y + dy, bounds.y0 + PILL_H), bounds.y1 - 2)
      const cand = { x0, x1: x0 + w, y0: cy - PILL_H, y1: cy }
      if (!hits(cand)) { y = cy; box = cand; break }
    }
    if (!box) {
      const cy = Math.min(Math.max(it.y, bounds.y0 + PILL_H), bounds.y1 - 2)
      box = { x0, x1: x0 + w, y0: cy - PILL_H, y1: cy }
      y = cy
    }
    placed.push(box)
    out.push({ ...it, boxX: x0, boxY: box.y0, boxW: w, textX: x0 + PILL_PAD, textY: y - 5 })
  }
  return out
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
    // Çalışma noktası her iki eksende de kapsanır; yoksa imleç grafiğin dışına düşer.
    if (marker && Number.isFinite(marker.y)) ys.push(marker.y)
    if (marker && Number.isFinite(marker.x)) xs.push(marker.x)

    const xe = extent(xs)
    const ye = extent(ys)
    if (!xe || !ye) return null

    const [y0, y1] = padRange(ye)
    const yTicksAll = linearTicks(y0, y1)

    // Sol boşluk en uzun y tik yazısına göre açılır
    const yw = Math.max(...yTicksAll.map((t) => textW(formatY(t), FONT_TICK)))
    const mLeft = Math.min(Math.max(M_LEFT_MIN, Math.ceil(yw) + 14), M_LEFT_MAX)
    const plotW = W - mLeft - M_RIGHT
    const plotH = H - M_TOP - M_BOTTOM

    const sx = makeScale(xScale, xe[0], xe[1], plotW, false)
    const sy = makeScale('linear', y0, y1, plotH, true)
    const px = (v) => mLeft + sx(v)
    const py = (v) => M_TOP + sy(v)

    const xTicksAll = xScale === 'log' ? logTicks(xe[0], xe[1]) : linearTicks(xe[0], xe[1])
    const xTicks = thinTicks(xTicksAll, (t) => ({ at: px(t), size: textW(formatX(t), FONT_TICK) }), FONT_TICK)
    const yTicks = thinTicks(yTicksAll, (t) => ({ at: py(t), size: FONT_TICK + 4 }), FONT_TICK)

    return { live, sx, sy, px, py, mLeft, plotW, plotH, xTicks, yTicks }
  }, [series, band, refLines, marker, xScale, formatX, formatY])

  if (!model) {
    return (
      <figure className="chart-figure">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={empty}>
          <text className="chart-empty" x={W / 2} y={H / 2} textAnchor="middle">{empty}</text>
        </svg>
      </figure>
    )
  }

  const { live, sx, px, py, mLeft, plotW, plotH, xTicks, yTicks } = model
  const bounds = { x0: mLeft, x1: W - M_RIGHT, y0: M_TOP, y1: M_TOP + plotH }

  // İmleç: x'e en yakın örnek noktanın indeksini bulur
  function onMove(e) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const xPix = ((e.clientX - rect.left) / rect.width) * W - mLeft
    if (xPix < 0 || xPix > plotW) { setHover(null); return }

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

  // Yüzen etiketler tek bir yerleşimden geçer: önce çalışma noktası (en önemli
  // bilgi), sonra referans çizgileri, en sonra seri adları. Sıra çakışmada
  // kimin yerinde kalacağını belirler.
  const wanted = []
  if (marker && Number.isFinite(marker.x) && Number.isFinite(marker.y) && marker.label) {
    wanted.push({ kind: 'marker', text: marker.label, x: px(marker.x), y: py(marker.y) - 10, anchor: 'middle' })
  }
  for (const r of refLines) {
    if (!Number.isFinite(r.y) || !r.label) continue
    wanted.push({ kind: 'ref', key: r.key ?? r.label, text: r.label, x: W - M_RIGHT - 2, y: py(r.y) - 4, anchor: 'end' })
  }
  const seriesEnds = live.map((s, i) => {
    const last = [...s.points].reverse().find((p) => Number.isFinite(p[1]) && Number.isFinite(p[0]))
    return last ? { s, i, last } : null
  }).filter(Boolean)
  for (const { s, i, last } of seriesEnds) {
    wanted.push({ kind: 'series', key: s.key, tone: s.tone ?? toneClass(i), text: s.name, x: px(last[0]) - 4, y: py(last[1]) - 10, anchor: 'end' })
  }
  const labels = layoutLabels(wanted, bounds)

  // İpucu kutusu grafiğin dışına taşmasın
  const tipW = 168
  const tipH = 22 + hoverRows.length * 15
  const tipX = hoverX != null
    ? Math.min(Math.max(px(hoverX) + 12, mLeft), W - M_RIGHT - tipW)
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
          <line key={`gy${t}`} className="chart-grid" x1={mLeft} x2={W - M_RIGHT} y1={py(t)} y2={py(t)} />
        ))}
        {xTicks.map((t) => (
          <line key={`gx${t}`} className="chart-grid" x1={px(t)} x2={px(t)} y1={M_TOP} y2={M_TOP + plotH} />
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

        {/* Referans çizgileri — yazıları aşağıdaki ortak yerleşimden geçer */}
        {refLines.filter((r) => Number.isFinite(r.y)).map((r) => (
          <line
            key={`ref${r.key ?? r.label}`}
            className="chart-ref"
            x1={mLeft} x2={W - M_RIGHT} y1={py(r.y)} y2={py(r.y)}
          />
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

        {/* Seri ucundaki nokta — etiket kutusu ayrı katmanda çizilir */}
        {seriesEnds.map(({ s, i, last }) => (
          <circle
            key={`dot${s.key}`}
            className={`chart-dot ${s.tone ?? toneClass(i)}`}
            cx={px(last[0])}
            cy={py(last[1])}
            r={3.5}
          />
        ))}

        {/* Çalışma noktası */}
        {marker && Number.isFinite(marker.x) && Number.isFinite(marker.y) && (
          <g>
            <circle className="chart-marker-ring" cx={px(marker.x)} cy={py(marker.y)} r={5.5} />
            <circle className="chart-marker" cx={px(marker.x)} cy={py(marker.y)} r={4} />
          </g>
        )}

        {/* Eksenler */}
        <line className="chart-axis" x1={mLeft} x2={mLeft} y1={M_TOP} y2={M_TOP + plotH} />
        <line className="chart-axis" x1={mLeft} x2={W - M_RIGHT} y1={M_TOP + plotH} y2={M_TOP + plotH} />

        {yTicks.map((t) => (
          <text key={`ty${t}`} className="chart-tick" x={mLeft - 8} y={py(t) + 3.5} textAnchor="end">
            {formatY(t)}
          </text>
        ))}
        {/* Uçtaki tik yazıları çizim alanının dışına taşarsa kırpılır; bu yüzden
            ilk ve son tik gerektiğinde ortalanmak yerine içeri yaslanır. */}
        {xTicks.map((t) => {
          const w = textW(formatX(t), FONT_TICK)
          const at = px(t)
          const anchor = at - w / 2 < 2 ? 'start' : at + w / 2 > W - 2 ? 'end' : 'middle'
          const x = anchor === 'start' ? 2 : anchor === 'end' ? W - 2 : at
          return (
            <text key={`tx${t}`} className="chart-tick" x={x} y={M_TOP + plotH + 15} textAnchor={anchor}>
              {formatX(t)}
            </text>
          )
        })}

        <text className="chart-axis-label" x={W - M_RIGHT} y={H - 5} textAnchor="end">{xLabel}</text>
        <text className="chart-axis-label" x={4} y={M_TOP - 7}>{yLabel}</text>

        {/* Yüzen etiketler — hepsi opak kutu üzerine, çakışmasız */}
        {labels.map((l) => (
          <g key={`${l.kind}-${l.key ?? l.text}`}>
            <rect className="chart-tip-box" x={l.boxX} y={l.boxY} width={l.boxW} height={PILL_H} rx={3} />
            {l.kind === 'series' && (
              <circle className={`chart-dot ${l.tone}`} cx={l.boxX - 5} cy={l.boxY + PILL_H / 2} r={3} />
            )}
            <text
              className={l.kind === 'series' ? 'chart-tip-text' : 'chart-tip-text dim'}
              x={l.textX}
              y={l.textY}
            >
              {l.text}
            </text>
          </g>
        ))}

        {/* İmleç ve ipucu */}
        {hoverX != null && (
          <g>
            <line className="chart-crosshair" x1={px(hoverX)} x2={px(hoverX)} y1={M_TOP} y2={M_TOP + plotH} />
            {hoverRows.map((row) => (
              <g key={`hp${row.name}`}>
                <circle className="chart-marker-ring" cx={px(hoverX)} cy={py(row.y)} r={5} />
                <circle className={`chart-dot ${row.tone}`} cx={px(hoverX)} cy={py(row.y)} r={3.5} />
              </g>
            ))}
            <rect className="chart-tip-box" x={tipX} y={M_TOP + 6} width={tipW} height={tipH} rx={4} />
            <text className="chart-tip-text dim" x={tipX + 9} y={M_TOP + 22}>
              {xLabel.replace(/\s*\(.*\)$/, '')}: {formatX(hoverX)}
            </text>
            {hoverRows.map((row, i) => (
              <g key={`ht${row.name}`}>
                <circle className={`chart-dot ${row.tone}`} cx={tipX + 13} cy={M_TOP + 33 + i * 15} r={3.5} />
                <text className="chart-tip-text" x={tipX + 22} y={M_TOP + 37 + i * 15}>
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
