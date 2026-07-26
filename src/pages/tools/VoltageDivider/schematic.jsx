import Schematic, { ResistorV, Node, Ground, Terminal, CurrentArrow } from '../../../components/Schematic'
import { fmtRes, fmtVolt, fmtAmp } from '../../../lib/num'

// Gerilim bölücü devre şeması. Değerler girildikçe şema üzerinde güncellenir;
// yük direnci girilmemişse o kol çizilmez ve açık uç olarak işaretlenir.
export default function DividerSchematic({ r }) {
  const live = r.ok
  const hasLoad = live && r.RL !== null

  return (
    <Schematic
      viewBox="0 0 260 236"
      title="Gerilim bölücü devre şeması"
      caption={hasLoad ? 'Yüklü gerilim bölücü' : 'Yüksüz gerilim bölücü — R_L girilirse şemaya eklenir'}
    >
      <g className="sch-wire">
        <line x1={70} x2={70} y1={26} y2={54} />
        <line x1={70} x2={70} y1={98} y2={132} />
        <line x1={70} x2={70} y1={176} y2={206} />
        <line x1={70} x2={168} y1={115} y2={115} />
        {hasLoad && <line x1={140} x2={140} y1={115} y2={132} />}
        {hasLoad && <line x1={140} x2={140} y1={176} y2={206} />}
        {hasLoad && <line x1={70} x2={140} y1={206} y2={206} />}
      </g>

      <ResistorV x={59} y={54} w={22} h={44} />
      <ResistorV x={59} y={132} w={22} h={44} />
      {hasLoad && <ResistorV x={129} y={132} w={22} h={44} />}

      <Node x={70} y={115} />
      {hasLoad && <Node x={140} y={115} />}
      <Terminal x={70} y={26} />
      <Terminal x={182} y={115} />
      <Ground x={70} y={206} />

      {/* Akım yönü: kaynaktan toprağa, R1 üzerinden aşağı */}
      <CurrentArrow
        x={44} y={90} dir="down" len={20}
        label={live ? fmtAmp(r.base.Idiv, 3) : 'I_div'}
        labelSide="left"
      />
      {hasLoad && (
        <CurrentArrow
          x={166} y={128} dir="down" len={16}
          label={fmtAmp(r.base.loaded.IL, 3)}
        />
      )}

      <text className="sch-label" x={88} y={72}>R1</text>
      <text className="sch-label" x={88} y={150}>R2</text>
      {hasLoad
        ? <text className="sch-label" x={158} y={150}>R_L</text>
        : <text className="sch-label dim" x={158} y={150}>R_L → ∞</text>}
      <text className="sch-label" x={84} y={22}>V_in</text>
      <text className="sch-label" x={196} y={112}>V_out</text>

      {live && (
        <>
          <text className="sch-value" x={88} y={86}>{fmtRes(r.R1, 3)}</text>
          <text className="sch-value" x={88} y={164}>{fmtRes(r.R2, 3)}</text>
          {hasLoad && <text className="sch-value" x={158} y={164}>{fmtRes(r.RL, 3)}</text>}
          <text className="sch-value" x={84} y={36}>{fmtVolt(r.Vin)}</text>
          <text className="sch-value" x={196} y={126}>{fmtVolt(r.Vout)}</text>
        </>
      )}
    </Schematic>
  )
}
