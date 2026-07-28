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
      viewBox="0 0 260 156"
      title="Yol kesiti"
      caption={inner ? 'İç katman — dielektrik içinde gömülü' : 'Dış katman — üstü açık'}
    >
      {/* Dielektrik gövde */}
      <rect className="sch-dielectric" x={20} y={58} width={220} height={54} rx={2} />

      {/* İç katmanda üstte de dielektrik vardır */}
      {inner && <rect className="sch-dielectric" x={20} y={30} width={220} height={28} rx={2} />}

      {/* Bakır kesit */}
      <rect className="sch-copper" x={92} y={44} width={76} height={14} />

      {/* Genişlik ölçüsü — ölçü çizgisi aşağı indi: değer eski yerinde
          dielektrik alt kenarına 2.2 px kalıyordu, etiket ile değer artık
          çizginin iki yanında duruyor. */}
      <g className="sch-dim">
        <line x1={92} x2={168} y1={134} y2={134} />
        <line x1={92} x2={92} y1={128} y2={140} />
        <line x1={168} x2={168} y1={128} y2={140} />
      </g>
      <text className="sch-label" x={130} y={128} textAnchor="middle">W</text>
      {live && (
        <text className="sch-value" x={130} y={146} textAnchor="middle">{fmtEng(W, 'm', 3)}</text>
      )}

      {/* Kalınlık ölçüsü — etiket ve değer ölçü çizgisinin sağındaki şeritte
          ortalanır. Değer eskiden y=62'de dielektriğin üst kenarını kesiyordu,
          iç katmanda da üstteki dielektriğin içine giriyordu. */}
      <g className="sch-dim">
        <line x1={180} x2={180} y1={44} y2={58} />
        <line x1={174} x2={186} y1={44} y2={44} />
        <line x1={174} x2={186} y1={58} y2={58} />
      </g>
      <text className="sch-label" x={210} y={49} textAnchor="middle">t</text>
      {live && (
        <text className="sch-value" x={210} y={72} textAnchor="middle">{fmtEng(r.t_m, 'm', 3)}</text>
      )}

      {/* Akım kesitten geçer — ok sayfa düzlemine dik yerine yol boyunca çizilir */}
      <CurrentArrow x={72} y={51} dir="right" len={22} label={live ? 'I' : null} labelSide="left" />

      <text className="sch-label dim" x={20} y={22}>{inner ? 'iç katman' : 'dış katman'}</text>
    </Schematic>
  )
}
