import Schematic, { CurrentArrow } from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'

// Via kesiti: kart içinden geçen kaplanmış delik, üstte ve altta pad,
// pad çevresinde antipad boşluğu. Ölçüler orantılı değildir.
export default function ViaSchematic({ r }) {
  const live = r.ok
  const cx = 130
  const top = 34
  const bottom = 110
  const holeHalf = 16
  const wallW = 6
  const padHalf = 30
  const antiHalf = 46

  return (
    <Schematic
      viewBox="0 0 260 160"
      title="Via kesiti"
      caption="Kaplanmış delik kesiti — akım yalnızca duvar bakırından geçer"
    >
      {/* Kart gövdesi, delik boşluğu iki parça olarak çizilir */}
      <rect className="sch-dielectric" x={20} y={top} width={cx - holeHalf - wallW - 20} height={bottom - top} />
      <rect
        className="sch-dielectric"
        x={cx + holeHalf + wallW}
        y={top}
        width={240 - (cx + holeHalf + wallW)}
        height={bottom - top}
      />

      {/* Antipad boşluğu — iç katman bakırının çekildiği bölge */}
      <g className="sch-dim">
        <line x1={cx - antiHalf} x2={cx - antiHalf} y1={top} y2={bottom} />
        <line x1={cx + antiHalf} x2={cx + antiHalf} y1={top} y2={bottom} />
      </g>

      {/* Barrel duvarları */}
      <rect className="sch-copper" x={cx - holeHalf - wallW} y={top} width={wallW} height={bottom - top} />
      <rect className="sch-copper" x={cx + holeHalf} y={top} width={wallW} height={bottom - top} />

      {/* Padler */}
      <rect className="sch-copper" x={cx - padHalf} y={top - 6} width={padHalf * 2} height={6} />
      <rect className="sch-copper" x={cx - padHalf} y={bottom} width={padHalf * 2} height={6} />

      {/* Akım yönü — duvarlardan aşağı */}
      <CurrentArrow x={cx - holeHalf - wallW / 2} y={bottom - 8} dir="down" len={26} label={null} />
      <CurrentArrow x={cx + holeHalf + wallW / 2} y={bottom - 8} dir="down" len={26} label={null} />

      {/* Delik çapı ölçüsü */}
      <g className="sch-dim">
        <line x1={cx - holeHalf} x2={cx + holeHalf} y1={72} y2={72} />
        <line x1={cx - holeHalf} x2={cx - holeHalf} y1={66} y2={78} />
        <line x1={cx + holeHalf} x2={cx + holeHalf} y1={66} y2={78} />
      </g>
      <text className="sch-label" x={cx} y={66} textAnchor="middle">D_f</text>
      {live && <text className="sch-value" x={cx} y={88} textAnchor="middle">{fmtEng(r.Df, 'm', 3)}</text>}

      {/* Kaplama kalınlığı */}
      <text className="sch-label" x={cx - holeHalf - wallW - 4} y={30} textAnchor="end">t_p</text>
      {live && (
        <text className="sch-value" x={cx - holeHalf - wallW - 4} y={130} textAnchor="end">
          {fmtEng(r.tp, 'm', 3)}
        </text>
      )}

      {/* Kart kalınlığı */}
      <g className="sch-dim">
        <line x1={214} x2={214} y1={top} y2={bottom} />
        <line x1={208} x2={220} y1={top} y2={top} />
        <line x1={208} x2={220} y1={bottom} y2={bottom} />
      </g>
      <text className="sch-label" x={224} y={72}>H</text>
      {live && <text className="sch-value" x={224} y={86}>{fmtEng(r.H, 'm', 3)}</text>}

      {/* Pad ve antipad etiketleri */}
      <text className="sch-label dim" x={cx - padHalf} y={24}>pad</text>
      <text className="sch-label dim" x={cx + antiHalf + 4} y={24}>antipad</text>

      {live && (
        <text className="sch-value" x={cx} y={152} textAnchor="middle">
          barrel kesiti {fmtEng(r.area, 'm²', 3)}
        </text>
      )}
    </Schematic>
  )
}
