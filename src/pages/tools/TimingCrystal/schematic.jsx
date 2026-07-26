import Schematic, { ResistorV, Node, Ground, Terminal, CurrentArrow } from '../../../components/Schematic'
import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import { TOOL_RC, TOOL_RL, TOOL_CRYSTAL } from './model'

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
      <text className="sch-label" x={72} y={20}>R</text>
      {r.ok && <text className="sch-value" x={64} y={62}>{fmtRes(r.R, 3)}</text>}

      {/* Kondansatör veya bobin */}
      {isRc ? (
        <g className="sch-part">
          <line x1={126} y1={58} x2={154} y2={58} />
          <line x1={126} y1={70} x2={154} y2={70} />
        </g>
      ) : (
        <path className="sch-part" fill="none" d="M140 58 q-14 8 0 16 q-14 8 0 16" />
      )}
      <text className="sch-label" x={158} y={56}>{isRc ? 'C' : 'L'}</text>
      {r.ok && (
        <text className="sch-value" x={158} y={92}>
          {isRc ? fmtEng(r.C, 'F', 3) : fmtEng(r.L, 'H', 3)}
        </text>
      )}

      <Node x={140} y={70} />
      <Terminal x={30} y={36} />
      <Terminal x={214} y={70} />
      <Ground x={85} y={116} />

      <text className="sch-label" x={14} y={30}>V_s</text>
      {r.ok && <text className="sch-value" x={14} y={100}>{fmtVolt(r.Vs)}</text>}
      <CurrentArrow x={112} y={36} dir="right" len={16} label={r.ok ? `τ = ${fmtEng(r.tau, 's', 3)}` : 'τ'} />
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
      <text className="sch-label" x={122} y={20}>XTAL</text>
      {r.ok && r.f && (
        <text className="sch-value" x={112} y={68}>{fmtEng(r.f, 'Hz', 4)}</text>
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

      <text className="sch-label" x={10} y={100}>C1</text>
      <text className="sch-label" x={238} y={100}>C2</text>
      {r.ok && (
        <>
          <text className="sch-value" x={10} y={118}>
            {fmt(r.mode === 'syn' ? r.C : r.C1, 3)} pF
          </text>
          <text className="sch-value" x={238} y={118} textAnchor="end">
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

const CAPTION = {
  [TOOL_RC]: 'RC kolu — çıkış kondansatör üzerinden alınır',
  [TOOL_RL]: 'RL kolu — akım bobin üzerinden yükselir',
  [TOOL_CRYSTAL]: 'Pierce osilatörü — yük kapasitesi iki kapasitörün seri eşdeğeridir',
}

export default function TimingSchematic({ r, form }) {
  const tool = r.ok ? r.tool : form.tool
  const isCrystal = tool === TOOL_CRYSTAL

  return (
    <Schematic
      viewBox={`0 0 260 ${isCrystal ? 162 : 132}`}
      title="Devre şeması"
      caption={CAPTION[tool]}
    >
      {isCrystal ? <CrystalCircuit r={r} /> : <TimingCircuit r={r} isRc={tool === TOOL_RC} />}
    </Schematic>
  )
}
