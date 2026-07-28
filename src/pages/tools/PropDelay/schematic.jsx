import Schematic, { Terminal } from '../../../components/Schematic'
import { fmt, fmtEng } from '../../../lib/num'

// Hat üzerinde dalga: sinüsün periyodu λg'nin hat uzunluğuna oranını gösterir.
// Bir tam periyot = bir dalga boyu.
export default function WaveSchematic({ r }) {
  const x0 = 24
  const x1 = 236
  const span = x1 - x0
  const mid = 62

  // Hat kaç dalga boyu uzunluğunda — çizimde en fazla 4 periyot gösterilir
  const cycles = r.ok ? Math.min(4, Math.max(0.08, r.fraction)) : 0.5
  const amp = 18

  const path = []
  const steps = 120
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = x0 + span * t
    const y = mid - amp * Math.sin(2 * Math.PI * cycles * t)
    path.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
  }

  return (
    <Schematic
      viewBox="0 0 260 148"
      title="Hat üzerinde dalga"
      caption={r.ok && r.fraction > 4
        ? 'Hat dört dalga boyundan uzun — çizimde ilk dört periyot gösteriliyor'
        : 'Bir tam periyot bir dalga boyudur'}
    >
      {/* Dalga */}
      <path className="chart-line tone-1" d={path.join('')} />

      {/* Hat ve referans düzlem */}
      <rect className="sch-copper" x={x0} y={92} width={span} height={7} />
      <rect className="sch-dielectric" x={x0} y={99} width={span} height={14} />
      <rect className="sch-copper" x={x0} y={113} width={span} height={5} />

      <Terminal x={x0} y={95} r={3} />
      <Terminal x={x1} y={95} r={3} />

      {/* Uzunluk ölçüsü */}
      <g className="sch-dim">
        <line x1={x0} x2={x1} y1={128} y2={128} />
        <line x1={x0} x2={x0} y1={124} y2={132} />
        <line x1={x1} x2={x1} y1={124} y2={132} />
      </g>

      {r.ok && (
        <>
          <text className="sch-value" x={x0} y={20}>
            λg = {fmtEng(r.lambdaG, 'm', 3)}
          </text>
          <text className="sch-value" x={x1} y={20} textAnchor="end">
            {fmt(r.degrees, 4)}°
          </text>
          {/* Ölçü çizgisinin altına yazılır; çizgiyle ve alt bakır şeritle
              kesişmemesi için en uzun metinde de 3 px'ten fazla açıklık kalır */}
          <text className="sch-value" x={130} y={140} textAnchor="middle">
            L = {fmtEng(r.length, 'm', 3)} · {fmtEng(r.delay, 's', 3)}
          </text>
        </>
      )}
    </Schematic>
  )
}
