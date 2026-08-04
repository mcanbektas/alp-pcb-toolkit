import { forwardRef } from 'react'
import Schematic, { ResistorV, Node, Ground, Terminal, CurrentArrow } from '../../../components/Schematic'
import { fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import { TOOL_RC } from './model'

// Yerleşim kuralı: her yazı kutusu ile çizim elemanı arasında en az 3 px, iki
// yazı kutusu arasında en az 2 px açıklık kalır. Kutu ölçüleri theme.css'ten
// gelir: .sch-label 11 px, .sch-value 10 px, tek aralıklı yazıda karakter
// genişliği ≈ 0.62·fs, kutu = [y − 0.78·fs , y + 0.22·fs]. Yerleşim, biçimlenen
// değerlerin en uzun hâline göre ölçüldü: fmtRes/fmtVolt/fmtEng(…,3) en fazla
// "1.00e+3 mΩ" = 10 karakter ≈ 62 px.

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

// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const TimingSchematic = forwardRef(function TimingSchematic({ r, form, text }, ref) {
  const tool = r.ok ? r.tool : form.tool

  return (
    <Schematic
      ref={ref}
      viewBox="0 0 260 132"
      title={text.title}
      caption={text.caption[tool]}
    >
      <TimingCircuit r={r} isRc={tool === TOOL_RC} />
    </Schematic>
  )
})

export default TimingSchematic
