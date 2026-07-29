import { forwardRef } from 'react'
import Schematic, { ResistorV, Node, Ground, Terminal, CurrentArrow } from '../../../components/Schematic'
import { fmtRes, fmtVolt, fmtAmp } from '../../../lib/num'

// Gerilim bölücü devre şeması. Değerler girildikçe şema üzerinde güncellenir;
// yük direnci girilmemişse o kol çizilmez ve açık uç olarak işaretlenir.
//
// Yerleşim kuralı: her yazı kutusu ile çizim elemanı arasında en az 3 px, iki
// yazı kutusu arasında en az 2 px açıklık kalır. Kutu ölçüleri theme.css'ten
// gelir: .sch-label 11 px, .sch-value 10 px, tek aralıklı yazıda karakter
// genişliği ≈ 0.62·fs, kutu = [y − 0.78·fs , y + 0.22·fs]. En kötü hâl
// fmtRes/fmtVolt/fmtAmp'in en uzun çıktısıdır: "1.00e+3 mΩ" = 10 karakter ≈ 62 px.
//
// Ölçüm sonucu iki yerleşim düzeltildi:
//  • R1/R2 etiket + değer sütunu dirençlerin soluna alındı (textAnchor="end",
//    x = 54). Sağda R2 ile yük kolu arasında yalnızca 57 px boşluk var; 62 px'lik
//    en kötü değer oraya sığmıyor, R2 değeri R_L dikdörtgeninin üstüne biniyordu.
//  • I_div oku R1'in sağına geçti: sol sütun artık yazıya ayrıldı, ayrıca okun
//    sola yazılan etiketi viewBox'ın sol kenarını 3 px aşıyordu. viewBox sola
//    16 px açık kalıyor, en soldaki yazı kutusu x = −8'de biter.
//  • Yük akımı oku 24 px'e uzatıldı; 18 px'te etiket kutusu ok başına dikeyde
//    0,8 px kalıyordu, şimdi 3,8 px (toplam açıklık 4,8 px).
// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const DividerSchematic = forwardRef(function DividerSchematic({ r, text }, ref) {
  const live = r.ok
  const hasLoad = live && r.RL !== null

  return (
    <Schematic
      ref={ref}
      viewBox="-16 0 276 236"
      title={text.title}
      caption={hasLoad ? text.captionLoaded : text.captionUnloaded}
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

      {/* Akım yönü: kaynaktan toprağa, R1 üzerinden aşağı. Ok R1'in sağında
          durur; sol sütun R1/R2 yazılarına ayrıldı */}
      <CurrentArrow
        x={110} y={90} dir="down" len={24}
        label={live ? fmtAmp(r.base.Idiv, 3) : 'I_div'}
      />
      {/* Yük akımı oku R_L'nin altına alındı; eski yeri çıkış terminalinin
          ve V_out etiketlerinin üstüne biniyordu */}
      {hasLoad && (
        <CurrentArrow
          x={176} y={202} dir="down" len={24}
          label={fmtAmp(r.base.loaded.IL, 3)}
        />
      )}

      <text className="sch-label" x={54} y={72} textAnchor="end">R1</text>
      <text className="sch-label" x={54} y={150} textAnchor="end">R2</text>
      {hasLoad
        ? <text className="sch-label" x={174} y={150}>R_L</text>
        : <text className="sch-label dim" x={174} y={150}>R_L → ∞</text>}
      <text className="sch-label" x={84} y={22}>V_in</text>
      <text className="sch-label" x={196} y={112}>V_out</text>

      {live && (
        <>
          <text className="sch-value" x={54} y={86} textAnchor="end">{fmtRes(r.R1, 3)}</text>
          <text className="sch-value" x={54} y={164} textAnchor="end">{fmtRes(r.R2, 3)}</text>
          {hasLoad && <text className="sch-value" x={174} y={164}>{fmtRes(r.RL, 3)}</text>}
          <text className="sch-value" x={84} y={36}>{fmtVolt(r.Vin)}</text>
          <text className="sch-value" x={196} y={126}>{fmtVolt(r.Vout)}</text>
        </>
      )}
    </Schematic>
  )
})

export default DividerSchematic
