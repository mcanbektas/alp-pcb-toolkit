import Schematic from '../../../components/Schematic'
import { fmt } from '../../../lib/num'
import { MODE_DELTA } from './model'

// Sıcaklık ölçeği. Şema oran değil, hangi büyüklüğün ne olduğunu gösterir:
// mutlak modda ölçek üzerinde tek bir nokta, fark modunda iki nokta arasındaki
// açıklık işaretlenir. İki büyüklüğün aynı şemada karışmaması bilinçlidir.

const SIG = 6
const X0 = 26
const X1 = 234
const AXIS_Y = 62

export default function TemperatureSchematic({ r }) {
  const live = r.ok
  const delta = live && r.mode === MODE_DELTA

  // Ölçek penceresi (santigrat). Fark modunda başlangıç ve varış noktalarını,
  // mutlak modda çalışma noktasını içine alacak biçimde açılır.
  let lo
  let hi
  let startC = 0
  let endC = 0

  if (delta) {
    startC = r.final ? r.final.ambient.C : 0
    endC = startC + r.delta.dC
    const margin = Math.max(5, Math.abs(r.delta.dC) * 0.35)
    lo = Math.min(startC, endC) - margin
    hi = Math.max(startC, endC) + margin
  } else {
    const C = live ? r.temp.C : 25
    lo = Math.min(-60, C - 20)
    hi = Math.max(160, C + 20)
  }

  const span = hi - lo || 1
  const px = (v) => X0 + ((v - lo) / span) * (X1 - X0)
  const clampLabel = (x) => Math.min(X1 - 24, Math.max(X0 + 24, x))

  const markC = live && !delta ? r.temp.C : 0
  const xMark = clampLabel(px(markC))
  const xStart = px(startC)
  const xEnd = px(endC)

  return (
    <Schematic
      viewBox="0 0 260 150"
      title={delta ? 'Sıcaklık farkı ölçeği' : 'Mutlak sıcaklık ölçeği'}
      caption={delta
        ? 'Fark, ölçek üzerindeki iki nokta arasındaki açıklıktır — başlangıcı nerede olursa olsun aynıdır'
        : 'Mutlak sıcaklık, ölçek üzerinde tek bir noktadır'}
    >
      {/* Ölçek ekseni */}
      <g className="sch-wire">
        <line x1={X0} x2={X1} y1={AXIS_Y} y2={AXIS_Y} />
        <line x1={X0} x2={X0} y1={AXIS_Y - 6} y2={AXIS_Y + 6} />
        <line x1={X1} x2={X1} y1={AXIS_Y - 6} y2={AXIS_Y + 6} />
      </g>

      <text className="sch-label dim" x={X0} y={AXIS_Y + 20} textAnchor="start">
        {fmt(lo, 4)} °C
      </text>
      <text className="sch-label dim" x={X1} y={AXIS_Y + 20} textAnchor="end">
        {fmt(hi, 4)} °C
      </text>

      {delta ? (
        <>
          {/* Fark açıklığı — eksenin üstünde ölçü çizgisi */}
          <g className="sch-dim">
            <line x1={xStart} x2={xEnd} y1={AXIS_Y - 22} y2={AXIS_Y - 22} />
            <line x1={xStart} x2={xStart} y1={AXIS_Y - 28} y2={AXIS_Y - 16} />
            <line x1={xEnd} x2={xEnd} y1={AXIS_Y - 28} y2={AXIS_Y - 16} />
          </g>
          <text className="sch-label" x={(xStart + xEnd) / 2} y={AXIS_Y - 32} textAnchor="middle">
            ΔT
          </text>
          <text className="sch-value" x={130} y={AXIS_Y + 40} textAnchor="middle">
            {fmt(r.delta.dC, SIG)} °C = {fmt(r.delta.dK, SIG)} K = {fmt(r.delta.dF, SIG)} °F
          </text>

          <circle className="sch-node" cx={xStart} cy={AXIS_Y} r={3.5} />
          <circle className="sch-node" cx={xEnd} cy={AXIS_Y} r={3.5} />

          <text className="sch-label" x={clampLabel(xStart)} y={AXIS_Y + 20} textAnchor="middle">
            {r.final ? 'ortam' : 'başlangıç'}
          </text>
          {r.final && (
            <text className="sch-label" x={clampLabel(xEnd)} y={AXIS_Y + 20} textAnchor="middle">
              sonuç
            </text>
          )}
          {r.final && (
            <text className="sch-value" x={130} y={AXIS_Y + 58} textAnchor="middle">
              {fmt(startC, SIG)} °C → {fmt(endC, SIG)} °C
            </text>
          )}
        </>
      ) : (
        <>
          {live && <circle className="sch-node" cx={px(markC)} cy={AXIS_Y} r={3.5} />}
          {live && (
            <>
              <g className="sch-dim">
                <line x1={px(markC)} x2={px(markC)} y1={AXIS_Y - 18} y2={AXIS_Y - 4} />
              </g>
              <text className="sch-label" x={xMark} y={AXIS_Y - 24} textAnchor="middle">T</text>
              <text className="sch-value" x={xMark} y={AXIS_Y + 40} textAnchor="middle">
                {fmt(r.temp.C, SIG)} °C
              </text>
              <text className="sch-value" x={xMark} y={AXIS_Y + 58} textAnchor="middle">
                {fmt(r.temp.F, SIG)} °F
              </text>
              <text className="sch-value" x={xMark} y={AXIS_Y + 76} textAnchor="middle">
                {fmt(r.temp.K, SIG)} K
              </text>
            </>
          )}
        </>
      )}
    </Schematic>
  )
}
