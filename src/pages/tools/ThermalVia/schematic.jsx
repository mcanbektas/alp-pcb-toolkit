import Schematic from '../../../components/Schematic'
import { fmt, fmtEng } from '../../../lib/num'

// Termal ped altında via dizisi — üstten görünüş.
// Izgara düzeni gerçek yerleşimi değil, via sayısını temsil eder.
export default function ThermalViaSchematic({ r }) {
  const live = r.ok
  const n = live ? Math.min(r.N, 36) : 9
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)

  const padX = 70
  const padY = 26
  const padW = 120
  const padH = 84
  const stepX = padW / (cols + 1)
  const stepY = padH / (rows + 1)
  const radius = Math.max(2.5, Math.min(6, stepX / 3))

  const holes = []
  for (let i = 0; i < n; i++) {
    const c = i % cols
    const rw = Math.floor(i / cols)
    holes.push({
      cx: padX + stepX * (c + 1),
      cy: padY + stepY * (rw + 1),
    })
  }

  return (
    <Schematic
      viewBox="0 0 260 150"
      title="Termal via dizisi"
      caption={live && r.N > 36
        ? `${r.N} via — şemada ilk 36'sı gösteriliyor`
        : 'Termal ped altındaki via dizisi (üstten görünüş)'}
    >
      {/* Bakır ped */}
      <rect className="sch-copper-fill" x={padX} y={padY} width={padW} height={padH} rx={3} />

      {/* Vialar */}
      {holes.map((h, i) => (
        <g key={i}>
          <circle className="sch-copper" cx={h.cx} cy={h.cy} r={radius} />
          <circle className="sch-hole" cx={h.cx} cy={h.cy} r={radius * 0.5} />
        </g>
      ))}

      <text className="sch-label dim" x={padX} y={19}>termal ped</text>

      {live && (
        <>
          <text className="sch-value" x={130} y={126} textAnchor="middle">
            {r.N} via · {r.filled ? 'bakır dolgulu' : 'dolgusuz'}
          </text>
          <text className="sch-value" x={130} y={142} textAnchor="middle">
            R_θ dizi = {fmt(r.Rarray, 4)} °C/W · H = {fmtEng(r.H, 'm', 3)}
          </text>
        </>
      )}
    </Schematic>
  )
}
