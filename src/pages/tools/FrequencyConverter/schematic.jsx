import Schematic from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'

// Periyodik kare dalga: iki ardışık yükselen kenar arasındaki süre T'dir.
// Şema ölçekli değildir — hangi ölçünün T, hangisinin f olduğunu gösterir.

const HI = 46
const LO = 92
const X0 = 20 // ilk yükselen kenar
const HALF = 28 // yarım çevrim genişliği (piksel)
const CYCLES = 4
const DIM_Y = 112 // periyot ölçü çizgisi
const GAP = 8 // "T" etiketi için ölçü çizgisinde açılan boşluğun yarısı

function wavePath() {
  const parts = [`M12 ${LO}`, `L${X0} ${LO}`]
  for (let i = 0; i < CYCLES; i++) {
    const x = X0 + i * 2 * HALF
    parts.push(`L${x} ${HI}`, `L${x + HALF} ${HI}`, `L${x + HALF} ${LO}`, `L${x + 2 * HALF} ${LO}`)
  }
  return parts.join(' ')
}

export default function FrequencySchematic({ r }) {
  const live = r.ok
  const x1 = X0 + 2 * HALF // ikinci yükselen kenar
  const mid = (X0 + x1) / 2 // periyot ölçüsünün ortası

  return (
    <Schematic
      viewBox="-8 0 268 140"
      title="Periyodik sinyal — periyot ve frekans"
      caption="Bir tam çevrim T sürer; birim zamandaki çevrim sayısı f = 1/T"
    >
      {/* Dalga */}
      <path className="sch-wire" d={wavePath()} />

      {/* İki yükselen kenarı işaretleyen kesikli çizgiler */}
      <line className="sch-wire sch-dash" x1={X0} x2={X0} y1={HI - 8} y2={DIM_Y} />
      <line className="sch-wire sch-dash" x1={x1} x2={x1} y1={HI - 8} y2={DIM_Y} />

      {/* Periyot ölçüsü — ölçü çizgisi "T" etiketinin durduğu yerde kesilir,
          etiket boşluğa oturur ve çizgiyle kesişmez */}
      <g className="sch-dim">
        <line x1={X0} x2={mid - GAP} y1={DIM_Y} y2={DIM_Y} />
        <line x1={mid + GAP} x2={x1} y1={DIM_Y} y2={DIM_Y} />
        <line x1={X0} x2={X0} y1={DIM_Y - 4} y2={DIM_Y + 4} />
        <line x1={x1} x2={x1} y1={DIM_Y - 4} y2={DIM_Y + 4} />
      </g>
      <text className="sch-label" x={mid} y={DIM_Y + 3} textAnchor="middle">T</text>

      {live && (
        <>
          <text className="sch-value" x={mid} y={130} textAnchor="middle">
            {fmtEng(r.period, 's', 3)}
          </text>
          <text className="sch-value" x={252} y={30} textAnchor="end">
            f = {fmtEng(r.frequency, 'Hz', 3)}
          </text>
          <text className="sch-value" x={252} y={130} textAnchor="end">
            ω = {fmtEng(r.omega, 'rad/s', 3)}
          </text>
        </>
      )}

      {/* Seviye adları — dalganın soluna, sağa dayalı yazılır ki rakam
          alt/üst seviye çizgisinin üstüne binmesin */}
      <text className="sch-label dim" x={6} y={HI + 4} textAnchor="end">1</text>
      <text className="sch-label dim" x={6} y={LO + 4} textAnchor="end">0</text>
    </Schematic>
  )
}
