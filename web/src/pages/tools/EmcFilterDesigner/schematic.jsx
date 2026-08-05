import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'
import { TOPOLOGY_LC, TOPOLOGY_PI, TOPOLOGY_CM } from './model'

const fmtH = (x) => fmtEng(x, 'H', 3)
const fmtF = (x) => fmtEng(x, 'F', 3)

const LEFT_X = 24
const RIGHT_X = 296
const TOP_Y = 56
const BOT_Y = 128

// Bir "şönt kol" (kapasitör ya da damping): iki rayı birleştiren dikey çizgi
// + üzerinde kutu (parça) + üstünde/altında etiket ve (varsa) değer. `dashed`
// damping kolunu ana yoldan ayırt eder — bu yol her zaman opsiyoneldir.
function ShuntBranch({
  x, label, value, dashed, midY = (TOP_Y + BOT_Y) / 2, topY = TOP_Y, botY = BOT_Y,
}) {
  return (
    <g>
      <line className={dashed ? 'sch-wire sch-dash' : 'sch-wire'} x1={x} x2={x} y1={topY} y2={botY} />
      <rect
        className={dashed ? 'sch-part sch-dash' : 'sch-part'}
        x={x - 10} y={midY - 9} width={20} height={18} rx={2}
      />
      {/* Etiket ve değer kolun DIŞINDA: iki rayı birleştiren dikey tel
          topY–botY arasını baştan sona kaplıyor, aradaki her yazı telin
          üstüne biniyordu. Etiket üst rayın üstüne, değer alt rayın altına. */}
      <text className="sch-label" x={x} y={topY - 14} textAnchor="middle">{label}</text>
      {value != null && (
        <text className="sch-value" x={x} y={botY + 18} textAnchor="middle">{value}</text>
      )}
      <circle className="sch-node" cx={x} cy={topY} r={2.5} />
      <circle className="sch-node" cx={x} cy={botY} r={2.5} />
    </g>
  )
}

function SeriesPart({
  x, width, label, value, y = TOP_Y,
}) {
  return (
    <g>
      <rect className="sch-part" x={x} y={y - 9} width={width} height={18} rx={2} />
      <text className="sch-label" x={x + width / 2} y={y - 14} textAnchor="middle">{label}</text>
      {value != null && (
        <text className="sch-value" x={x + width / 2} y={y + 24} textAnchor="middle">{value}</text>
      )}
    </g>
  )
}

const EmcFilterSchematic = forwardRef(function EmcFilterSchematic({ r, text }, ref) {
  const live = r.ok
  const topology = live ? r.topology : TOPOLOGY_LC
  const net = live ? r.network : null
  const hasCandidate = live && r.candidateRows.length > 0

  return (
    <Schematic ref={ref} viewBox="0 0 320 190" title={text.title} caption={text.caption(topology)}>
      {/* Kaynak/yük satırı 24'e alındı: kol etiketleri artık üst rayın üstünde
          (TOP_Y − 14 = 42) ve 30'daki satırla kutuları örtüşüyordu. */}
      <text className="sch-label" x={LEFT_X} y={24}>{text.source}</text>
      <text className="sch-label" x={RIGHT_X} y={24} textAnchor="end">{text.load}</text>

      {topology === TOPOLOGY_CM ? (
        <>
          {/* İki hat aynı çekirdek üzerinde — sarımlar yan yana çizilir. */}
          <line className="sch-wire" x1={LEFT_X} x2={130} y1={TOP_Y} y2={TOP_Y} />
          <line className="sch-wire" x1={170} x2={RIGHT_X} y1={TOP_Y} y2={TOP_Y} />
          <line className="sch-wire" x1={LEFT_X} x2={130} y1={BOT_Y} y2={BOT_Y} />
          <line className="sch-wire" x1={170} x2={RIGHT_X} y1={BOT_Y} y2={BOT_Y} />
          <rect className="sch-part" x={130} y={TOP_Y - 9} width={40} height={18} rx={2} />
          <rect className="sch-part" x={130} y={BOT_Y - 9} width={40} height={18} rx={2} />
          <text className="sch-label" x={150} y={TOP_Y - 14} textAnchor="middle">{text.winding}</text>
          <text className="sch-label" x={150} y={BOT_Y + 24} textAnchor="middle">{text.winding}</text>
          {live && (
            <text className="sch-value" x={150} y={(TOP_Y + BOT_Y) / 2} textAnchor="middle">
              {fmtH(net.lLeak)} / {fmtEng(net.dcr, 'Ω', 3)}
            </text>
          )}
          <ShuntBranch x={230} label="C_LL" value={live ? fmtF(net.cLL) : null} />
          {hasCandidate && (
            <ShuntBranch x={276} label={text.damping} dashed />
          )}
        </>
      ) : (
        <>
          <line className="sch-wire" x1={LEFT_X} x2={RIGHT_X} y1={TOP_Y} y2={TOP_Y} />
          <line className="sch-wire" x1={LEFT_X} x2={RIGHT_X} y1={BOT_Y} y2={BOT_Y} />

          {topology === TOPOLOGY_PI && (
            <ShuntBranch x={92} label="C1" value={live ? fmtF(net.C1) : null} />
          )}

          <SeriesPart
            x={topology === TOPOLOGY_PI ? 130 : 108}
            width={56}
            label="L"
            value={live ? fmtH(net.L) : null}
          />

          <ShuntBranch
            x={topology === TOPOLOGY_PI ? 220 : 210}
            label={topology === TOPOLOGY_PI ? 'C2' : 'C'}
            value={live ? fmtF(topology === TOPOLOGY_PI ? net.C2 : net.C) : null}
          />

          {hasCandidate && (
            <ShuntBranch x={topology === TOPOLOGY_PI ? 258 : 250} label={text.damping} dashed />
          )}
        </>
      )}
    </Schematic>
  )
})

export default EmcFilterSchematic
