import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'
import { LAYER_COPPER, DIELECTRIC_TYPES } from '../../../lib/stackup'

// Stack-up kesiti: katmanlar üstten alta, kalınlıklarıyla orantılı bantlar.
//
// ÖLÇEKLEME — saf orantı 35 µm bakırı 1 mm core yanında görünmez yapar. Her
// katman için asgari bir çizim yüksekliği uygulanır; ölçü etiketleri **gerçek
// değeri** gösterir, çizim yüksekliğini değil.
//
// Seçili sinyal katmanı ile referans düzlemi arasındaki H (ya da iç katmanda
// H1/H2) ayrıca işaretlenir.
const MIN_BAND_PX = 5
const MAX_TOTAL_PX = 250
const LABEL_X = 172
const VALUE_X = 246

const bandClass = (layer) => {
  if (layer.type === LAYER_COPPER) return 'sch-copper'
  if (DIELECTRIC_TYPES.includes(layer.type)) return 'sch-dielectric'
  return 'sch-copper-fill'
}

const StackupSchematic = forwardRef(function StackupSchematic(
  { r, text, fmtLen, selectedSignal = null },
  ref,
) {
  const live = r.ok
  const layers = live ? r.engineInput.layers : []

  // Önce ham orantı, sonra asgari yükseklik; toplam sığmıyorsa hepsi birden
  // küçültülür. Böylece kalın katman yine kalın görünür.
  const total = layers.reduce((acc, l) => acc + l.thickness, 0)
  const raw = layers.map((l) => (total > 0 ? (l.thickness / total) * MAX_TOTAL_PX : 0))
  const heights = raw.map((h) => Math.max(MIN_BAND_PX, h))
  const sum = heights.reduce((acc, h) => acc + h, 0)
  const shrink = sum > MAX_TOTAL_PX ? MAX_TOTAL_PX / sum : 1
  const scaled = heights.map((h) => h * shrink)

  const top = 18
  const left = 14
  const width = 140

  const tops = []
  let y = top
  for (const h of scaled) {
    tops.push(y)
    y += h
  }
  const bottom = y

  const signal = live && selectedSignal !== null
    ? r.signals.find((sg) => sg.index === selectedSignal)
    : null

  // H ölçüsü: sinyal bakırının kenarından referans düzlemine.
  const dim = (fromIndex, toIndex) => {
    if (fromIndex === null || toIndex === null) return null
    const a = tops[fromIndex] + scaled[fromIndex] / 2
    const b = tops[toIndex] + scaled[toIndex] / 2
    return { y1: Math.min(a, b), y2: Math.max(a, b) }
  }

  const upperDim = signal?.upper ? dim(signal.index, signal.upper.index) : null
  const lowerDim = signal?.lower ? dim(signal.index, signal.lower.index) : null

  const vbH = Math.max(bottom + 34, 120)

  return (
    <Schematic ref={ref} viewBox={`0 0 300 ${vbH}`} title={text.title} caption={text.caption}>
      {layers.map((l, i) => (
        <g key={`${l.type}-${i}`}>
          <rect
            className={bandClass(l)}
            x={left}
            y={tops[i]}
            width={width}
            height={scaled[i]}
          />
          {/* Katman adı ve kalınlığı bandın sağında; bakırın üstüne yazı düşmez.
              Çok ince bantlarda etiket satırı taşmasın diye yalnızca 9 px ve
              üstü bantlar etiketlenir. */}
          {scaled[i] >= 9 && (
            <>
              <text className="sch-label" x={LABEL_X} y={tops[i] + scaled[i] / 2 + 3}>
                {l.name !== '' ? l.name : text.typeLabel(l.type)}
              </text>
              <text className="sch-value" x={VALUE_X} y={tops[i] + scaled[i] / 2 + 3}>
                {fmtLen(l.thickness)}
              </text>
            </>
          )}
        </g>
      ))}

      {/* Seçili sinyal katmanının referans mesafeleri */}
      {upperDim && (
        <>
          <line className="sch-arrow" x1={left - 6} y1={upperDim.y1} x2={left - 6} y2={upperDim.y2} />
          <text className="sch-value" x={left - 10} y={(upperDim.y1 + upperDim.y2) / 2} textAnchor="end">
            {signal.outer ? text.hLabel : text.h1Label}
          </text>
        </>
      )}
      {lowerDim && (
        <>
          <line className="sch-arrow" x1={left - 6} y1={lowerDim.y1} x2={left - 6} y2={lowerDim.y2} />
          <text className="sch-value" x={left - 10} y={(lowerDim.y1 + lowerDim.y2) / 2} textAnchor="end">
            {signal.outer ? text.hLabel : text.h2Label}
          </text>
        </>
      )}

      {/* Toplam kalınlık ölçüsü */}
      {live && (
        <>
          <line className="sch-dim" x1={left + width + 6} y1={top} x2={left + width + 6} y2={bottom} />
          <text className="sch-label" x={LABEL_X} y={bottom + 18}>{text.total}</text>
          <text className="sch-value" x={VALUE_X} y={bottom + 18}>
            {fmtLen(r.results.finishedTotal)}
          </text>
        </>
      )}
    </Schematic>
  )
})

export default StackupSchematic
