import Schematic from '../../../components/Schematic'
import { fmt } from '../../../lib/num'
import { MIL_PER_MM } from '../../../lib/convertLength'

// Çift ölçekli cetvel: aynı uzunluk üstte milimetre, altta mil ızgarasıyla
// ölçülür. Şema oran değil, iki ızgaranın yalnızca sıfırda çakıştığını gösterir.

const X0 = 24
const X1 = 216

// Ölçek üzerinde okunabilir bölme adımı (1 · 2 · 5 ailesi)
function niceStep(span, count) {
  if (!(span > 0)) return 1
  const raw = span / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  return (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag
}

function ticksFor(span, count) {
  const step = niceStep(span, count)
  const n = Math.floor(span / step + 1e-9)
  if (!(n >= 1) || n > 40) return [0, span]
  const out = []
  for (let i = 0; i <= n; i++) out.push(i * step)
  // Son bölme uçla çakışmıyorsa uç ayrıca işaretlenir
  if (span - out[out.length - 1] > step * 1e-6) out.push(span)
  return out
}

export default function LengthSchematic({ r }) {
  const live = r.ok
  const spanMm = live ? r.all.mm : 1
  const spanMil = live ? r.all.mil : MIL_PER_MM

  const px = (v, span) => X0 + (span > 0 ? (v / span) * (X1 - X0) : 0)
  const mmTicks = ticksFor(spanMm, 6)
  const milTicks = ticksFor(spanMil, 6)

  return (
    <Schematic
      viewBox="0 0 260 150"
      title="Çift ölçekli uzunluk cetveli"
      caption={live
        ? 'Aynı uzunluk iki ızgarayla ölçülür — bölmeler yalnızca sıfırda çakışır'
        : 'Üstte milimetre, altta mil ızgarası — geçerli girdi ile ölçeklenir'}
    >
      {/* Ölçülen uzunluk */}
      <rect className="sch-copper-fill" x={X0} y={20} width={X1 - X0} height={14} rx={2} />
      {live && (
        <text className="sch-value" x={(X0 + X1) / 2} y={14} textAnchor="middle">
          {fmt(r.all.mm, 4)} mm = {fmt(r.all.mil, 4)} mil
        </text>
      )}

      {/* Uç hizaları */}
      <g className="sch-dash">
        <line x1={X0} x2={X0} y1={34} y2={100} />
        <line x1={X1} x2={X1} y1={34} y2={100} />
      </g>

      {/* Üst ölçek: milimetre */}
      <g className="sch-wire">
        <line x1={X0} x2={X1} y1={62} y2={62} />
      </g>
      <g className="sch-dim">
        {mmTicks.map((v) => (
          <line key={`mm-${v}`} x1={px(v, spanMm)} x2={px(v, spanMm)} y1={62} y2={56} />
        ))}
      </g>
      <text className="sch-label" x={222} y={66}>mm</text>
      <text className="sch-label" x={X0} y={52}>0</text>
      {live && (
        <text className="sch-value" x={X1} y={52} textAnchor="end">{fmt(spanMm, 4)}</text>
      )}

      {/* Alt ölçek: mil */}
      <g className="sch-wire">
        <line x1={X0} x2={X1} y1={100} y2={100} />
      </g>
      <g className="sch-dim">
        {milTicks.map((v) => (
          <line key={`mil-${v}`} x1={px(v, spanMil)} x2={px(v, spanMil)} y1={100} y2={106} />
        ))}
      </g>
      <text className="sch-label" x={222} y={104}>mil</text>
      <text className="sch-label" x={X0} y={120}>0</text>
      {live && (
        <text className="sch-value" x={X1} y={120} textAnchor="end">{fmt(spanMil, 4)}</text>
      )}

      {/* Bölme adımları */}
      <text className="sch-label dim" x={(X0 + X1) / 2} y={136} textAnchor="middle">
        bölme: {fmt(niceStep(spanMm, 6), 3)} mm · {fmt(niceStep(spanMil, 6), 3)} mil
      </text>
    </Schematic>
  )
}
