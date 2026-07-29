import { forwardRef } from 'react'
import Schematic, { ResistorV, Node, Ground, Terminal, CurrentArrow } from '../../../components/Schematic'
import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import { TOOL_RC, TOOL_CRYSTAL } from './model'

// Yerleşim kuralı: her yazı kutusu ile çizim elemanı arasında en az 3 px, iki
// yazı kutusu arasında en az 2 px açıklık kalır. Kutu ölçüleri theme.css'ten
// gelir: .sch-label 11 px, .sch-value 10 px, tek aralıklı yazıda karakter
// genişliği ≈ 0.62·fs, kutu = [y − 0.78·fs , y + 0.22·fs]. Yerleşim, biçimlenen
// değerlerin en uzun hâline göre ölçüldü: fmtRes/fmtVolt/fmtEng(…,3) en fazla
// "1.00e+3 mΩ" = 10 karakter ≈ 62 px, fmtEng(…,'Hz',4) = 12 karakter ≈ 74 px,
// "C_L = " + fmt(…,4) + " pF" = 17 karakter ≈ 105 px.

// Seri direnç + kondansatör/bobin, toprağa dönen kol
function TimingCircuit({ r, isRc }) {
  return (
    <>
      <g className="sch-wire">
        <line x1={30} x2={30} y1={36} y2={70} />
        <line x1={30} x2={70} y1={36} y2={36} />
        <line x1={92} x2={140} y1={36} y2={36} />
        <line x1={140} x2={140} y1={36} y2={58} />
        <line x1={140} x2={140} y1={92} y2={116} />
        <line x1={30} x2={140} y1={116} y2={116} />
        {/* Çıkış tapı */}
        <line x1={140} x2={214} y1={70} y2={70} />
      </g>

      {/* Direnç yatay */}
      <rect className="sch-part" x={70} y={26} width={22} height={20} rx={2} />
      <text className="sch-label" x={72} y={18}>R</text>
      {/* Direnç değeri 64'ten 56'ya alındı: en uzun hâlinde (62 px) 64–126
          aralığını kaplıyor ve RC seçildiğinde kondansatörün 126'da başlayan
          üst plakasının üstüne biniyordu. 56'da plakaya 7 px kalır. */}
      {r.ok && <text className="sch-value" x={56} y={62}>{fmtRes(r.R, 3)}</text>}

      {/* Kondansatör veya bobin */}
      {isRc ? (
        <g className="sch-part">
          <line x1={126} y1={58} x2={154} y2={58} />
          <line x1={126} y1={70} x2={154} y2={70} />
        </g>
      ) : (
        <path className="sch-part" fill="none" d="M140 58 q-14 8 0 16 q-14 8 0 16" />
      )}
      <text className="sch-label" x={160} y={56}>{isRc ? 'C' : 'L'}</text>
      {r.ok && (
        <text className="sch-value" x={160} y={92}>
          {isRc ? fmtEng(r.C, 'F', 3) : fmtEng(r.L, 'H', 3)}
        </text>
      )}

      <Node x={140} y={70} />
      <Terminal x={30} y={36} />
      <Terminal x={214} y={70} />
      <Ground x={85} y={116} />

      {/* V_s etiketi terminalin üstüne değil, üst soluna yazılır */}
      <text className="sch-label" x={20} y={24}>V_s</text>
      {r.ok && <text className="sch-value" x={14} y={100}>{fmtVolt(r.Vs)}</text>}
      {/* Ok, üstündeki iletkenden 6 px ayrı durur; kısaltıldı ki etiketi ok
          başının sağına düşsün */}
      <CurrentArrow x={112} y={30} dir="right" len={12} label={r.ok ? `τ = ${fmtEng(r.tau, 's', 3)}` : 'τ'} />
    </>
  )
}

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
const TimingSchematic = forwardRef(function TimingSchematic({ r, form, text }, ref) {
  const tool = r.ok ? r.tool : form.tool
  const isCrystal = tool === TOOL_CRYSTAL

  return (
    <Schematic
      ref={ref}
      viewBox={`0 0 260 ${isCrystal ? 162 : 132}`}
      title={text.title}
      caption={text.caption[tool]}
    >
      {isCrystal ? <CrystalCircuit r={r} /> : <TimingCircuit r={r} isRc={tool === TOOL_RC} />}
    </Schematic>
  )
})

export default TimingSchematic
