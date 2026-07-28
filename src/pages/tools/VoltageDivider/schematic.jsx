import Schematic, { ResistorV, Node, Ground, Terminal, CurrentArrow } from '../../../components/Schematic'
import { fmtRes, fmtVolt, fmtAmp } from '../../../lib/num'

// Gerilim bölücü devre şeması. Değerler girildikçe şema üzerinde güncellenir;
// yük direnci girilmemişse o kol çizilmez ve açık uç olarak işaretlenir.
//
// Yerleşim kuralı: her yazı kutusu ile çizim elemanı arasında en az 3 px, iki
// yazı kutusu arasında en az 2 px açıklık kalır. Kutu ölçüleri theme.css'ten
// gelir: .sch-label 11 px, .sch-value 10 px, tek aralıklı yazıda karakter
// genişliği ≈ 0.62·fs, kutu = [y − 0.78·fs , y + 0.22·fs]. En kötü hâl
// (fmtRes/fmtVolt/fmtAmp'in en uzun çıktısı, ~8 karakter) ölçülerek yerleşti:
// yük kolu R2 değerinin sağına yer açacak kadar sağa alındı, akım oku etiketi
// sola taştığı için viewBox sola 16 px genişletildi.
export default function DividerSchematic({ r }) {
  const live = r.ok
  const hasLoad = live && r.RL !== null

  return (
    <Schematic
      viewBox="-16 0 276 236"
      title="Gerilim bölücü devre şeması"
      caption={hasLoad ? 'Yüklü gerilim bölücü' : 'Yüksüz gerilim bölücü — R_L girilirse şemaya eklenir'}
    >
      <g className="sch-wire">
        <line x1={70} x2={70} y1={26} y2={54} />
        <line x1={70} x2={70} y1={98} y2={132} />
        <line x1={70} x2={70} y1={176} y2={206} />
        <line x1={70} x2={168} y1={115} y2={115} />
        {hasLoad && <line x1={156} x2={156} y1={115} y2={132} />}
        {hasLoad && <line x1={156} x2={156} y1={176} y2={206} />}
        {hasLoad && <line x1={70} x2={156} y1={206} y2={206} />}
      </g>

      <ResistorV x={59} y={54} w={22} h={44} />
      <ResistorV x={59} y={132} w={22} h={44} />
      {hasLoad && <ResistorV x={145} y={132} w={22} h={44} />}

      <Node x={70} y={115} />
      {hasLoad && <Node x={156} y={115} />}
      <Terminal x={70} y={26} />
      <Terminal x={182} y={115} />
      <Ground x={70} y={206} />

      {/* Akım yönü: kaynaktan toprağa, R1 üzerinden aşağı */}
      <CurrentArrow
        x={50} y={90} dir="down" len={20}
        label={live ? fmtAmp(r.base.Idiv, 3) : 'I_div'}
        labelSide="left"
      />
      {/* Yük akımı oku R_L'nin altına alındı; eski yeri çıkış terminalinin
          ve V_out etiketlerinin üstüne biniyordu */}
      {hasLoad && (
        <CurrentArrow
          x={176} y={202} dir="down" len={18}
          label={fmtAmp(r.base.loaded.IL, 3)}
        />
      )}

      <text className="sch-label" x={88} y={72}>R1</text>
      <text className="sch-label" x={88} y={150}>R2</text>
      {hasLoad
        ? <text className="sch-label" x={174} y={150}>R_L</text>
        : <text className="sch-label dim" x={174} y={150}>R_L → ∞</text>}
      <text className="sch-label" x={84} y={22}>V_in</text>
      <text className="sch-label" x={196} y={112}>V_out</text>

      {live && (
        <>
          <text className="sch-value" x={88} y={86}>{fmtRes(r.R1, 3)}</text>
          <text className="sch-value" x={88} y={164}>{fmtRes(r.R2, 3)}</text>
          {hasLoad && <text className="sch-value" x={174} y={164}>{fmtRes(r.RL, 3)}</text>}
          <text className="sch-value" x={84} y={36}>{fmtVolt(r.Vin)}</text>
          <text className="sch-value" x={196} y={126}>{fmtVolt(r.Vout)}</text>
        </>
      )}
    </Schematic>
  )
}
