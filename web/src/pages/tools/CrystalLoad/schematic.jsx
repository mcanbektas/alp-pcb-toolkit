import { forwardRef } from 'react'
import Schematic, { Ground } from '../../../components/Schematic'
import { fmt, fmtEng } from '../../../lib/num'

// Yerleşim kuralı: her yazı kutusu ile çizim elemanı arasında en az 3 px, iki
// yazı kutusu arasında en az 2 px açıklık kalır. Kutu ölçüleri theme.css'ten
// gelir: .sch-label 11 px, .sch-value 10 px, tek aralıklı yazıda karakter
// genişliği ≈ 0.62·fs, kutu = [y − 0.78·fs , y + 0.22·fs].

// Pierce osilatörü: kristal + iki yük kapasitörü
function CrystalCircuit({ r }) {
  return (
    <>
      <g className="sch-wire">
        <line x1={40} x2={40} y1={40} y2={70} />
        <line x1={40} x2={92} y1={40} y2={40} />
        <line x1={168} x2={220} y1={40} y2={40} />
        <line x1={220} x2={220} y1={40} y2={70} />
        <line x1={40} x2={40} y1={70} y2={96} />
        <line x1={220} x2={220} y1={70} y2={96} />
        <line x1={40} x2={220} y1={124} y2={124} />
      </g>

      {/* Kristal gövdesi */}
      <rect className="sch-body" x={112} y={26} width={36} height={28} rx={2} />
      <g className="sch-part">
        <line x1={104} y1={30} x2={104} y2={50} />
        <line x1={156} y1={30} x2={156} y2={50} />
      </g>
      <line className="sch-wire" x1={92} x2={104} y1={40} y2={40} />
      <line className="sch-wire" x1={156} x2={168} y1={40} y2={40} />
      <text className="sch-label" x={130} y={18} textAnchor="middle">XTAL</text>
      {r.ok && r.f && (
        <text className="sch-value" x={130} y={68} textAnchor="middle">{fmtEng(r.f, 'Hz', 4)}</text>
      )}

      {/* C1 ve C2 */}
      <g className="sch-part">
        <line x1={26} y1={96} x2={54} y2={96} />
        <line x1={26} y1={106} x2={54} y2={106} />
        <line x1={206} y1={96} x2={234} y2={96} />
        <line x1={206} y1={106} x2={234} y2={106} />
      </g>
      <line className="sch-wire" x1={40} x2={40} y1={106} y2={124} />
      <line className="sch-wire" x1={220} x2={220} y1={106} y2={124} />

      <text className="sch-label" x={6} y={100}>C1</text>
      <text className="sch-label" x={240} y={100}>C2</text>
      {/* Değerler kapasitörlerin iç yanına alındı: dış yanda plakadan toprağa
          giden iletkenin tam üstüne düşüyorlardı */}
      {r.ok && (
        <>
          <text className="sch-value" x={60} y={114}>
            {fmt(r.mode === 'syn' ? r.C : r.C1, 3)} pF
          </text>
          <text className="sch-value" x={200} y={114} textAnchor="end">
            {fmt(r.mode === 'syn' ? r.C : r.C2, 3)} pF
          </text>
        </>
      )}

      <Ground x={130} y={124} />
      {r.ok && (
        <text className="sch-value" x={130} y={150} textAnchor="middle">
          C_L = {fmt(r.achieved, 4)} pF
        </text>
      )}
    </>
  )
}

// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const CrystalSchematic = forwardRef(function CrystalSchematic({ r, text }, ref) {
  return (
    <Schematic
      ref={ref}
      viewBox="0 0 260 162"
      title={text.title}
      caption={text.caption}
    >
      <CrystalCircuit r={r} />
    </Schematic>
  )
})

export default CrystalSchematic
