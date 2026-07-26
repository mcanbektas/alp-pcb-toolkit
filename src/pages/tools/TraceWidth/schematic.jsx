import Schematic, { CurrentArrow } from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'

// Yol kesiti: dielektrik üzerinde dikdörtgen bakır kesit.
// Ölçüler orantılı değildir — kalınlık genişliğin yanında görünmez kalırdı;
// şema yalnızca hangi boyutun ne olduğunu gösterir.
export default function TraceSchematic({ r }) {
  const live = r.ok
  const inner = live && r.layer === 'internal'
  const W = live ? (r.mode === 'syn' ? r.Wrec_m : r.W_m) : null

  return (
    <Schematic
      viewBox="0 0 260 150"
      title="Yol kesiti"
      caption={inner ? 'İç katman — dielektrik içinde gömülü' : 'Dış katman — üstü açık'}
    >
      {/* Dielektrik gövde */}
      <rect className="sch-dielectric" x={20} y={58} width={220} height={54} rx={2} />

      {/* İç katmanda üstte de dielektrik vardır */}
      {inner && <rect className="sch-dielectric" x={20} y={30} width={220} height={28} rx={2} />}

      {/* Bakır kesit */}
      <rect className="sch-copper" x={92} y={44} width={76} height={14} />

      {/* Genişlik ölçüsü */}
      <g className="sch-dim">
        <line x1={92} x2={168} y1={128} y2={128} />
        <line x1={92} x2={92} y1={122} y2={134} />
        <line x1={168} x2={168} y1={122} y2={134} />
      </g>
      <text className="sch-label" x={130} y={144} textAnchor="middle">W</text>
      {live && (
        <text className="sch-value" x={130} y={122} textAnchor="middle">{fmtEng(W, 'm', 3)}</text>
      )}

      {/* Kalınlık ölçüsü */}
      <g className="sch-dim">
        <line x1={180} x2={180} y1={44} y2={58} />
        <line x1={174} x2={186} y1={44} y2={44} />
        <line x1={174} x2={186} y1={58} y2={58} />
      </g>
      <text className="sch-label" x={190} y={49}>t</text>
      {live && <text className="sch-value" x={190} y={62}>{fmtEng(r.t_m, 'm', 3)}</text>}

      {/* Akım kesitten geçer — ok sayfa düzlemine dik yerine yol boyunca çizilir */}
      <CurrentArrow x={72} y={51} dir="right" len={22} label={live ? 'I' : null} labelSide="left" />

      <text className="sch-label dim" x={20} y={22}>{inner ? 'iç katman' : 'dış katman'}</text>
    </Schematic>
  )
}
