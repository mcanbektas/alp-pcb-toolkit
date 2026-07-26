import Schematic, { Node } from '../../../components/Schematic'
import { fmtEng, fmtRes } from '../../../lib/num'

// Güç dağıtım ağının blok görünümü: VRM → düzlem çifti → kapasitör bankası →
// yük. Hedef empedans yükün besleme düğümünde tanımlıdır, o düğüm işaretlidir.
export default function PdnSchematic({ r }) {
  const top = 48
  const bot = 122
  const capXs = [160, 192]

  return (
    <Schematic
      viewBox="0 0 260 176"
      title="Güç dağıtım ağı blok şeması"
      caption="VRM → düzlem çifti → kapasitör bankası → yük; hedef empedans yükün besleme düğümünde"
    >
      {/* Besleme ve dönüş rayları */}
      <g className="sch-wire">
        <line x1={32} x2={226} y1={top} y2={top} />
        <line x1={32} x2={226} y1={bot} y2={bot} />
        <line x1={32} x2={32} y1={top} y2={64} />
        <line x1={32} x2={32} y1={106} y2={bot} />
        <line x1={226} x2={226} y1={top} y2={64} />
        <line x1={226} x2={226} y1={106} y2={bot} />
      </g>

      {/* VRM ve yük blokları */}
      <rect className="sch-part" x={12} y={64} width={40} height={42} rx={2} />
      <rect className="sch-part" x={206} y={64} width={40} height={42} rx={2} />
      <text className="sch-label" x={32} y={89} textAnchor="middle">VRM</text>
      <text className="sch-label" x={226} y={89} textAnchor="middle">YÜK</text>

      {/* Düzlem çifti — örtüşen bakır alan bir kapasitör oluşturur */}
      <rect className="sch-copper" x={72} y={top - 4} width={58} height={6} />
      <rect className="sch-copper" x={72} y={bot - 2} width={58} height={6} />
      <g className="sch-wire sch-dash">
        <line x1={101} x2={101} y1={top + 2} y2={80} />
        <line x1={101} x2={101} y1={88} y2={bot - 2} />
      </g>
      <g className="sch-wire">
        <line x1={89} x2={113} y1={80} y2={80} />
        <line x1={89} x2={113} y1={88} y2={88} />
      </g>
      <text className="sch-label" x={101} y={104} textAnchor="middle">C_düzlem</text>

      {/* Kapasitör bankası */}
      {capXs.map((x) => (
        <g key={x}>
          <g className="sch-wire">
            <line x1={x} x2={x} y1={top} y2={80} />
            <line x1={x - 11} x2={x + 11} y1={80} y2={80} />
            <line x1={x - 11} x2={x + 11} y1={88} y2={88} />
            <line x1={x} x2={x} y1={88} y2={bot} />
          </g>
          <Node x={x} y={top} r={2.5} />
          <Node x={x} y={bot} r={2.5} />
        </g>
      ))}
      <text className="sch-label" x={176} y={106} textAnchor="middle">kapasitörler</text>

      {/* Hedef empedansın tanımlı olduğu düğüm */}
      <Node x={226} y={top} />
      <text className="sch-label" x={226} y={38} textAnchor="middle">Z_hedef</text>

      {/* Blok açıklamaları */}
      <text className="sch-value" x={34} y={42}>V_ray</text>
      <text className="sch-value" x={32} y={140} textAnchor="middle">R + jωL</text>
      <text className="sch-value" x={101} y={140} textAnchor="middle">ε₀·εr·A/d</text>
      <text className="sch-value" x={176} y={140} textAnchor="middle">ESR, ESL</text>
      <text className="sch-value" x={226} y={140} textAnchor="middle">ΔI</text>

      {r.ok && (
        <>
          <text className="sch-value" x={12} y={158}>
            Z_hedef = {fmtRes(r.Ztarget, 4)}
          </text>
          {r.curve && (
            <text className="sch-value" x={12} y={170}>
              |Z_PDN| @ {fmtEng(r.curve.fOp, 'Hz', 3)} = {fmtRes(r.curve.z.mag, 4)}
            </text>
          )}
        </>
      )}
    </Schematic>
  )
}
