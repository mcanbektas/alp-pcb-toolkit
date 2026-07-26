import Schematic from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'
import { STRUCT_STRIPLINE } from './model'

// Kenar bağlı diferansiyel çift kesiti. İki hat aynı katmanda, aralarında S.
export default function DiffPairSchematic({ r, form }) {
  const structure = r.ok ? r.structure : form.structure
  const isStripline = structure === STRUCT_STRIPLINE

  const cx = 130
  const half = 26
  const gap = 26
  const traceY = isStripline ? 72 : 54
  const traceH = isStripline ? 8 : 10

  const leftX = cx - gap / 2 - half * 2
  const rightX = cx + gap / 2

  return (
    <Schematic
      viewBox="0 0 260 148"
      title="Diferansiyel çift kesiti"
      caption={isStripline
        ? 'Edge-coupled stripline — çift iki düzlem arasında'
        : 'Edge-coupled microstrip — çift üst yüzeyde, altta tek düzlem'}
    >
      {isStripline ? (
        <>
          <rect className="sch-copper" x={20} y={34} width={220} height={7} />
          <rect className="sch-dielectric" x={20} y={41} width={220} height={72} />
          <rect className="sch-copper" x={20} y={113} width={220} height={7} />
        </>
      ) : (
        <>
          <rect className="sch-dielectric" x={20} y={64} width={220} height={44} />
          <rect className="sch-copper" x={20} y={108} width={220} height={7} />
        </>
      )}

      {/* İki hat */}
      <rect className="sch-copper" x={leftX} y={traceY} width={half * 2} height={traceH} />
      <rect className="sch-copper" x={rightX} y={traceY} width={half * 2} height={traceH} />

      {/* Genişlik ve aralık ölçüleri */}
      <g className="sch-dim">
        <line x1={leftX} x2={leftX + half * 2} y1={traceY - 10} y2={traceY - 10} />
        <line x1={leftX} x2={leftX} y1={traceY - 15} y2={traceY - 5} />
        <line x1={leftX + half * 2} x2={leftX + half * 2} y1={traceY - 15} y2={traceY - 5} />

        <line x1={leftX + half * 2} x2={rightX} y1={traceY + traceH + 12} y2={traceY + traceH + 12} />
        <line x1={leftX + half * 2} x2={leftX + half * 2} y1={traceY + traceH + 7} y2={traceY + traceH + 17} />
        <line x1={rightX} x2={rightX} y1={traceY + traceH + 7} y2={rightX ? traceY + traceH + 17 : 0} />
      </g>
      <text className="sch-label" x={leftX + half} y={traceY - 15} textAnchor="middle">W</text>
      <text className="sch-label" x={cx} y={traceY + traceH + 26} textAnchor="middle">S</text>

      {/* Referans mesafesi */}
      <g className="sch-dim">
        <line x1={214} x2={214} y1={traceY} y2={isStripline ? 113 : 108} />
        <line x1={208} x2={220} y1={traceY} y2={traceY} />
        <line x1={208} x2={220} y1={isStripline ? 113 : 108} y2={isStripline ? 113 : 108} />
      </g>
      <text className="sch-label" x={224} y={traceY + 18}>H</text>

      {r.ok && (
        <>
          <text className="sch-value" x={leftX + half} y={traceY - 24} textAnchor="middle">
            {fmtEng(r.W, 'm', 3)}
          </text>
          <text className="sch-value" x={cx} y={traceY + traceH + 38} textAnchor="middle">
            {fmtEng(r.S, 'm', 3)}
          </text>
          <text className="sch-value" x={224} y={traceY + 32}>{fmtEng(r.H, 'm', 3)}</text>
          <text className="sch-value" x={24} y={140}>
            Z_diff = {fmtEng(r.Zdiff, 'Ω', 4)}
          </text>
        </>
      )}
    </Schematic>
  )
}
