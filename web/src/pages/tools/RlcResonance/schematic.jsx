import { forwardRef } from 'react'
import Schematic, { Terminal } from '../../../components/Schematic'
import { fmtRes, fmtEng } from '../../../lib/num'

// Yerleşim kuralı: her yazı kutusu ile çizim elemanı arasında en az 3 px, iki
// yazı kutusu arasında en az 2 px açıklık kalır. Kutu ölçüleri theme.css'ten
// gelir: .sch-label 11 px, .sch-value 10 px, tek aralıklı yazıda karakter
// genişliği ≈ 0.62·fs, kutu = [y − 0.78·fs , y + 0.22·fs].

// .sch-value karakter genişliği: 0.62 × 10 px
const VALUE_CW = 6.2

// Seri RLC kolu
function RlcCircuit({ r }) {
  // Değer satırı sağdan sola paketlenir. Tercih edilen yerler sembollerin
  // hizası: R direncin ortası (55), L bobinin başı (93), C plakanın başı (166).
  // Üç değer birden 12 karaktere çıktığında (3 × 74 px) bu hizalar birbirine
  // giriyordu; kutular yalnızca gerektiği kadar sola kaydırılır, komşular
  // arasında en az 3 px kalır ve hiçbiri viewBox dışına çıkmaz.
  const sR = r.ok ? fmtRes(r.R, 3) : ''
  const sL = r.ok ? fmtEng(r.L, 'H', 3) : ''
  const sC = r.ok ? fmtEng(r.C, 'F', 3) : ''
  const wv = (s) => s.length * VALUE_CW
  const xC = Math.min(166, 258 - wv(sC))
  const xL = Math.min(93, xC - 3 - wv(sL))
  const xR = Math.max(2, Math.min(55 - wv(sR) / 2, xL - 3 - wv(sR)))
  return (
    <>
      <g className="sch-wire">
        <line x1={14} x2={44} y1={70} y2={70} />
        <line x1={66} x2={96} y1={70} y2={70} />
        <line x1={140} x2={166} y1={70} y2={70} />
        <line x1={190} x2={246} y1={70} y2={70} />
      </g>

      {/* R */}
      <rect className="sch-part" x={44} y={60} width={22} height={20} rx={2} />
      <text className="sch-label" x={50} y={52}>R</text>

      {/* L — üç yay */}
      <path className="sch-part" fill="none" d="M96 70 q11 -16 22 0 q11 -16 22 0" />
      <text className="sch-label" x={112} y={48}>L</text>

      {/* C — iki plaka */}
      <g className="sch-part">
        <line x1={166} y1={56} x2={166} y2={84} />
        <line x1={178} y1={56} x2={178} y2={84} />
      </g>
      <line className="sch-wire" x1={178} x2={190} y1={70} y2={70} />
      <text className="sch-label" x={166} y={48}>C</text>

      <Terminal x={14} y={70} />
      <Terminal x={246} y={70} />

      {/* Değer satırı kolun 20 px altında durur (tele 19 px). L değeri 96'dan
          93'e alındı: 11 karakterlik hâlde (68 px) L ile C kutuları arasında
          1,8 px kalıyordu, iki yazı için gereken 2 px'in altında; 93'te 4,8 px
          kalır. f₀ satırı değer satırının 12 px altında, ortalı. */}
      {r.ok && (
        <>
          <text className="sch-value" x={xR} y={98}>{sR}</text>
          <text className="sch-value" x={xL} y={98}>{sL}</text>
          <text className="sch-value" x={xC} y={98}>{sC}</text>
          <text className="sch-value" x={130} y={120} textAnchor="middle">
            f₀ = {fmtEng(r.f0, 'Hz', 4)}
          </text>
        </>
      )}
    </>
  )
}

// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const CircuitSchematic = forwardRef(function CircuitSchematic({ r, text }, ref) {
  // viewBox sabit: bu ekranda tek düzen var, ölçek genişlikten gelir
  // (.schematic svg width:100%; height:auto).
  return (
    <Schematic
      ref={ref}
      viewBox="0 0 260 140"
      title={text.title}
      caption={text.caption}
    >
      <RlcCircuit r={r} />
    </Schematic>
  )
})

export default CircuitSchematic
