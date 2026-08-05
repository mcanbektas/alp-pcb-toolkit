import { forwardRef } from 'react'
import Schematic, { Node, Ground, Terminal } from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'

const fmtH = (x) => fmtEng(x, 'H', 3)
const fmtF = (x) => fmtEng(x, 'F', 3)

// Buck power stage şeması: Vin → HS anahtarı → switch node → L → Vout, LS
// kolu (asenkron: diode, senkron: LS MOSFET) switch node'dan GND'ye, Cout
// çıkışta. Input capacitance bu araçta bir büyüklük olarak taşınmadığı için
// (REV2 §13.7 formülü yalnız I_out ve D kullanır, kapasitans değeri hiçbir
// formülde geçmiyor) şemada da bir değer basılmaz — yalnız topolojik
// tamlık için yapısal olarak çizilir (VoltageDivider'daki R_L → ∞ dimmed
// çizim deseniyle aynı gerekçe: gerçek bir bileşen ama bu ekranda ölçülü
// değil). Ölçüler orantılı değildir.
//
// TUVAL GENİŞLİĞİ 292 px: C_out / V_out etiketleri ve değerleri sağ kolonda
// x = 228'den başlıyor; 9 karakterlik uç değer (fmtEng sınır durumu) 284'e
// kadar uzanıyor ve 250 px'lik tuvalden taşıyordu.
//
// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const BuckSchematic = forwardRef(function BuckSchematic({ r, text }, ref) {
  const live = r.ok
  const isSync = live && r.isSync

  const vinX = 20
  const swX = 110
  const lX1 = 130
  const lX2 = 172
  const outX = 214
  const topY = 30
  const hsY1 = 44
  const hsY2 = 76
  const swY = 92
  const lsY2 = 132
  const gndY = 158
  const cY1 = 118
  const cY2 = 132

  return (
    <Schematic
      ref={ref}
      viewBox="0 0 292 190"
      title={text.title}
      caption={isSync ? text.captionSync : text.captionAsync}
    >
      {/* Vin kaynağı ve giriş rayı */}
      <Terminal x={vinX} y={14} />
      <text className="sch-label" x={vinX + 8} y={12}>V_in</text>
      {live && <text className="sch-value" x={vinX + 8} y={26}>{fmtEng(r.vInNom, 'V', 3)}</text>}
      <g className="sch-wire">
        <line x1={vinX} y1={14} x2={vinX} y2={topY} />
        <line x1={vinX} y1={topY} x2={swX} y2={topY} />
        <line x1={swX} y1={topY} x2={swX} y2={hsY1} />
      </g>

      {/* HS anahtarı: kanal çubuğu + D/S uçları (MosfetGateDriver deseniyle aynı) */}
      <rect className="sch-copper" x={swX - 2} y={hsY1} width={4} height={hsY2 - hsY1} />
      <line className="sch-copper" x1={swX - 14} x2={swX} y1={hsY1 + 4} y2={hsY1 + 4} />
      <line className="sch-copper" x1={swX - 14} x2={swX - 14} y1={hsY1 - 6} y2={hsY1 + 4} />
      <line className="sch-copper" x1={swX - 14} x2={swX} y1={hsY2 - 4} y2={hsY2 - 4} />
      <text className="sch-label" x={swX + 6} y={(hsY1 + hsY2) / 2 + 3}>{text.hs}</text>

      {/* Switch node */}
      <line className="sch-wire" x1={swX} y1={hsY2} x2={swX} y2={swY} />
      <Node x={swX} y={swY} />
      <text className="sch-label dim" x={swX - 6} y={swY + 16} textAnchor="end">{text.switchNode}</text>

      {/* LS kolu: asenkron → diode (katot switch node'a bakar), senkron → LS MOSFET */}
      <line className="sch-wire" x1={swX} y1={swY} x2={swX} y2={swY + 8} />
      {isSync ? (
        <>
          <rect className="sch-copper" x={swX - 2} y={swY + 8} width={4} height={lsY2 - (swY + 8)} />
          <line className="sch-copper" x1={swX - 14} x2={swX} y1={swY + 12} y2={swY + 12} />
          <line className="sch-copper" x1={swX - 14} x2={swX - 14} y1={swY + 2} y2={swY + 12} />
          <line className="sch-copper" x1={swX - 14} x2={swX} y1={lsY2 - 4} y2={lsY2 - 4} />
          <text className="sch-label" x={swX + 6} y={(swY + 8 + lsY2) / 2 + 3}>{text.ls}</text>
        </>
      ) : (
        <>
          <path className="sch-copper" d={`M${swX - 7} ${swY + 22} L${swX + 7} ${swY + 22} L${swX} ${swY + 8} Z`} />
          <line className="sch-copper" x1={swX - 7} x2={swX + 7} y1={swY + 22} y2={swY + 22} />
          <line className="sch-wire" x1={swX} y1={swY + 22} x2={swX} y2={lsY2} />
          <text className="sch-label" x={swX + 8} y={swY + 20}>{text.diode}</text>
        </>
      )}
      <line className="sch-wire" x1={swX} y1={lsY2} x2={swX} y2={gndY - 8} />
      <Ground x={swX} y={gndY - 8} />

      {/* Switch node'dan indüktöre */}
      <line className="sch-wire" x1={swX} y1={swY} x2={lX1} y2={swY} />
      <rect className="sch-part" x={lX1} y={swY - 7} width={lX2 - lX1} height={14} rx={3} />
      <text className="sch-label" x={(lX1 + lX2) / 2} y={swY - 12} textAnchor="middle">{text.inductorLabel}</text>
      {live && (
        <text className="sch-value" x={(lX1 + lX2) / 2} y={swY + 22} textAnchor="middle">
          {fmtH(r.inductor.used)}
        </text>
      )}

      {/* Çıkış düğümü, Cout ve Vout terminali */}
      <line className="sch-wire" x1={lX2} y1={swY} x2={outX} y2={swY} />
      <Node x={outX} y={swY} />
      <line className="sch-wire" x1={outX} y1={swY} x2={outX} y2={cY1} />
      <line className="sch-wire" x1={outX - 10} x2={outX + 10} y1={cY1} y2={cY1} />
      <line className="sch-wire" x1={outX - 10} x2={outX + 10} y1={cY2} y2={cY2} />
      <line className="sch-wire" x1={outX} y1={cY2} x2={outX} y2={gndY - 8} />
      <Ground x={outX} y={gndY - 8} />
      <text className="sch-label dim" x={outX + 14} y={(cY1 + cY2) / 2 + 3}>C_out</text>
      {live && r.outputRipple && (
        <text className="sch-value" x={outX + 14} y={(cY1 + cY2) / 2 + 15}>
          {fmtF(r.engineArgs.cOut)}
        </text>
      )}

      <line className="sch-wire" x1={outX} y1={swY} x2={outX + 26} y2={swY} />
      <Terminal x={outX + 26} y={swY} />
      <text className="sch-label" x={outX + 26} y={swY - 10} textAnchor="middle">V_out</text>
      {live && <text className="sch-value" x={outX + 26} y={swY + 20} textAnchor="middle">{fmtEng(r.vOut, 'V', 3)}</text>}
    </Schematic>
  )
})

export default BuckSchematic
