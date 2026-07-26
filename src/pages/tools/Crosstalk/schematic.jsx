import Schematic, { Terminal } from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'

// Aggressor ve victim hatlarının üstten görünümü.
// Sinyal aggressor üzerinde soldan sağa ilerler: near-end (NE) solda,
// far-end (FE) sağdadır. NEXT victim'in near-end ucunda, FEXT far-end
// ucunda görünür. W ve S ölçüleri 3W geometrik kontrolünün girdileridir.
export default function CrosstalkSchematic({ r }) {
  const x0 = 52
  const x1 = 218
  const span = x1 - x0

  const traceH = 9
  const aggY = 40
  const gap = 27
  const vicY = aggY + traceH + gap // 76

  const aggMid = aggY + traceH / 2
  const vicMid = vicY + traceH / 2

  return (
    <Schematic
      viewBox="0 0 260 160"
      title="Aggressor ve victim hatları — üstten görünüm"
      caption="Sinyal aggressor üzerinde near-end'den far-end'e ilerler; NEXT victim'in near-end, FEXT far-end ucunda görünür"
    >
      {/* Uç adları */}
      <text className="sch-label dim" x={x0} y={18} textAnchor="middle">near-end</text>
      <text className="sch-label dim" x={x1} y={18} textAnchor="middle">far-end</text>

      {/* Yayılma yönü */}
      <g>
        <line className="sch-arrow" x1={112} y1={26} x2={162} y2={26} />
        <polygon className="sch-arrow-head" points="168,26 159,22.5 159,29.5" />
      </g>

      {/* Aggressor hattı */}
      <rect className="sch-copper" x={x0} y={aggY} width={span} height={traceH} />
      <text className="sch-label" x={135} y={37} textAnchor="middle">aggressor</text>
      <Terminal x={x0} y={aggMid} r={3} />
      <Terminal x={x1} y={aggMid} r={3} />

      {/* Victim hattı */}
      <rect className="sch-copper" x={x0} y={vicY} width={span} height={traceH} />
      <text className="sch-label" x={135} y={101} textAnchor="middle">victim</text>
      <Terminal x={x0} y={vicMid} r={3} />
      <Terminal x={x1} y={vicMid} r={3} />

      <text className="sch-value" x={x0} y={101} textAnchor="middle">V_NEXT</text>
      <text className="sch-value" x={x1} y={101} textAnchor="middle">V_FEXT</text>

      {/* W ölçüsü — hat genişliği */}
      <g className="sch-dim">
        <line x1={40} x2={40} y1={aggY} y2={aggY + traceH} />
        <line x1={35} x2={45} y1={aggY} y2={aggY} />
        <line x1={35} x2={45} y1={aggY + traceH} y2={aggY + traceH} />
      </g>
      <text className="sch-label" x={32} y={aggY + traceH} textAnchor="end">W</text>

      {/* S ölçüsü — hatlar arası boşluk */}
      <g className="sch-dim">
        <line x1={78} x2={78} y1={aggY + traceH} y2={vicY} />
        <line x1={73} x2={83} y1={aggY + traceH} y2={aggY + traceH} />
        <line x1={73} x2={83} y1={vicY} y2={vicY} />
      </g>
      <text className="sch-label" x={87} y={aggY + traceH + gap / 2 + 4}>S</text>

      {/* Paralel uzunluk ölçüsü */}
      <g className="sch-dim">
        <line x1={x0} x2={x1} y1={122} y2={122} />
        <line x1={x0} x2={x0} y1={117} y2={127} />
        <line x1={x1} x2={x1} y1={117} y2={127} />
      </g>
      <text className="sch-label" x={135} y={118} textAnchor="middle">paralel uzunluk L</text>

      {r.ok && (
        <>
          <text className="sch-value" x={16} y={140}>
            W = {fmtEng(r.W, 'm', 3)} · S = {fmtEng(r.S, 'm', 3)} · L = {fmtEng(r.coupledLength, 'm', 3)}
          </text>
          <text className="sch-value" x={16} y={154}>
            V_NEXT = {fmtEng(r.Vnext, 'V', 3)} · V_FEXT = {r.fext.available ? fmtEng(r.fext.Vfext, 'V', 3) : 'hesaplanmadı'}
          </text>
        </>
      )}
    </Schematic>
  )
}
