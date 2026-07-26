import Schematic from '../../../components/Schematic'
import { fmt, fmtEng } from '../../../lib/num'

// Trapez kesit — aşındırma oranı şemaya orantılı yansır.
// Kalınlık gerçekte genişliğin yanında görünmez kalır; şema oran değil,
// hangi ölçünün ne olduğunu gösterir.
export default function CopperSchematic({ r }) {
  const live = r.ok
  const etch = live ? Math.min(0.6, r.etch / 100) : 0
  const bottomHalf = 62
  const topHalf = bottomHalf * (1 - etch)
  const cx = 130
  const top = 44
  const bottom = 86

  const platingH = live && r.plating > 0 ? Math.max(4, 14 * r.platingShare) : 0

  return (
    <Schematic
      viewBox="0 0 260 140"
      title="Bakır kesiti"
      caption={live && r.plating > 0
        ? 'Bitmiş kesit — folyo üstüne kaplama eklenir'
        : 'Bakır kesiti — aşındırma üst genişliği daraltır'}
    >
      {/* Dielektrik taban */}
      <rect className="sch-dielectric" x={20} y={bottom} width={220} height={26} rx={2} />

      {/* Folyo gövdesi (trapez) */}
      <polygon
        className="sch-copper-fill"
        points={`${cx - topHalf},${top + platingH} ${cx + topHalf},${top + platingH} ${cx + bottomHalf},${bottom} ${cx - bottomHalf},${bottom}`}
      />

      {/* Kaplama katmanı */}
      {platingH > 0 && (
        <>
          <polygon
            className="sch-copper"
            points={`${cx - topHalf},${top} ${cx + topHalf},${top} ${cx + topHalf},${top + platingH} ${cx - topHalf},${top + platingH}`}
          />
          <text className="sch-label dim" x={cx + topHalf + 8} y={top + 8}>kaplama</text>
        </>
      )}

      {/* Alt genişlik ölçüsü */}
      <g className="sch-dim">
        <line x1={cx - bottomHalf} x2={cx + bottomHalf} y1={bottom + 32} y2={bottom + 32} />
        <line x1={cx - bottomHalf} x2={cx - bottomHalf} y1={bottom + 26} y2={bottom + 38} />
        <line x1={cx + bottomHalf} x2={cx + bottomHalf} y1={bottom + 26} y2={bottom + 38} />
      </g>
      <text className="sch-label" x={cx} y={bottom + 28} textAnchor="middle">W_alt</text>
      {live && (
        <text className="sch-value" x={cx} y={bottom + 48} textAnchor="middle">
          {fmtEng(r.trap.Wbottom, 'm', 3)}
        </text>
      )}

      {/* Üst genişlik */}
      <text className="sch-label" x={cx} y={top - 6} textAnchor="middle">W_üst</text>
      {live && (
        <text className="sch-value" x={cx - topHalf - 8} y={top + 20} textAnchor="end">
          {fmtEng(r.trap.Wtop, 'm', 3)}
        </text>
      )}

      {/* Kalınlık ölçüsü */}
      <g className="sch-dim">
        <line x1={218} x2={218} y1={top} y2={bottom} />
        <line x1={212} x2={224} y1={top} y2={top} />
        <line x1={212} x2={224} y1={bottom} y2={bottom} />
      </g>
      <text className="sch-label" x={228} y={62}>t</text>
      {live && <text className="sch-value" x={228} y={76}>{fmt(r.units.finished.um, 3)} µm</text>}
    </Schematic>
  )
}
