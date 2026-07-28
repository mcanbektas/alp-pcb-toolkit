import Schematic, { Terminal, CurrentArrow } from '../../../components/Schematic'
import { fmtEng, fmtAmp } from '../../../lib/num'
import { TOOL_PLANE } from './model'

// Boyunlu bakır poligon — akım darboğazdan geçer
function PlaneShape({ r }) {
  // Boyun genişliğinin ortalamaya oranı şemaya orantılı yansıtılır,
  // çok ince olduğunda görünür kalması için alt sınır uygulanır.
  const ratio = r.ok ? Math.max(0.12, Math.min(1, r.neck.W / r.average.W)) : 0.35
  const full = 56
  const neck = full * ratio
  const midY = 70

  const top = midY - full / 2
  const bottom = midY + full / 2
  const nTop = midY - neck / 2
  const nBottom = midY + neck / 2

  return (
    <>
      <path
        className="sch-copper-fill"
        d={`M20 ${top} L100 ${top} L124 ${nTop} L146 ${nTop} L170 ${top} L240 ${top}
            L240 ${bottom} L170 ${bottom} L146 ${nBottom} L124 ${nBottom} L100 ${bottom} L20 ${bottom} Z`}
      />

      {/* Boyun ölçüsü */}
      <g className="sch-dim">
        <line x1={135} x2={135} y1={nTop} y2={nBottom} />
        <line x1={129} x2={141} y1={nTop} y2={nTop} />
        <line x1={129} x2={141} y1={nBottom} y2={nBottom} />
      </g>
      {/* Boyun etiketi ve değeri poligonun dışındaki şeritlerde: boyun
          daraldıkça nTop/nBottom içeri kayıyor ve yazılar hem omuz
          köşegenlerinin hem bakır dolgunun üstüne biniyordu. */}
      <text className="sch-label" x={135} y={top - 6} textAnchor="middle">boyun</text>
      {r.ok && (
        <text className="sch-value" x={135} y={bottom + 14} textAnchor="middle">
          {fmtEng(r.neck.W, 'm', 3)}
        </text>
      )}

      {/* Ortalama genişlik ölçüsü */}
      <g className="sch-dim">
        <line x1={56} x2={56} y1={top} y2={bottom} />
        <line x1={50} x2={62} y1={top} y2={top} />
        <line x1={50} x2={62} y1={bottom} y2={bottom} />
      </g>
      {r.ok && (
        <text className="sch-value" x={56} y={bottom + 14} textAnchor="middle">
          {fmtEng(r.average.W, 'm', 3)}
        </text>
      )}

      {/* Akım oku düzlemin içinde kalır, değeri okun üstündeki boş şeride
          yazılır: bileşenin kendi etiket yeri hem poligonun sağ kenarını hem
          sağ terminali hem de okun başını kesiyordu. */}
      <CurrentArrow x={210} y={midY} dir="right" len={22} label={null} />
      <text className="sch-value" x={210} y={top - 6} textAnchor="middle">
        {r.ok ? fmtAmp(r.I, 3) : 'I'}
      </text>
      <Terminal x={20} y={midY} />
      <Terminal x={240} y={midY} />
      {r.ok && (
        <text className="sch-value" x={130} y={126} textAnchor="middle">
          L = {fmtEng(r.average.L, 'm', 3)}
        </text>
      )}
    </>
  )
}

// Paralel yollar — kalınlıkları genişlik oranına göre çizilir
function ParallelShape({ r }) {
  const branches = r.ok ? r.branches.slice(0, 6) : [{ W: 1 }, { W: 1 }]
  const maxW = Math.max(...branches.map((b) => b.W))
  const gap = 100 / Math.max(branches.length, 2)
  const top = 26

  return (
    <>
      {/* Kollar 200'de bitiyor: kol akımları eskiden x=236'da yazılıyor ve
          hem viewBox'ı hem ortadaki çıkış telini/terminali kesiyordu.
          Sağ bara ve terminal içeri alındı, akımlar 226'dan başlayan
          serbest sütuna yazılıyor. */}
      <g className="sch-wire">
        <line x1={30} x2={30} y1={top} y2={top + gap * (branches.length - 1)} />
        <line x1={200} x2={200} y1={top} y2={top + gap * (branches.length - 1)} />
        <line x1={14} x2={30} y1={70} y2={70} />
        <line x1={200} x2={216} y1={70} y2={70} />
      </g>

      {branches.map((b, i) => {
        const y = top + gap * i
        const h = Math.max(3, 12 * (b.W / maxW))
        return (
          <g key={i}>
            <rect className="sch-copper-fill" x={30} y={y - h / 2} width={170} height={h} />
            {r.ok && (
              <text className="sch-value" x={226} y={y + 3}>{fmtAmp(b.I, 3)}</text>
            )}
          </g>
        )
      })}

      <Terminal x={14} y={70} />
      <Terminal x={216} y={70} />
      {r.ok && (
        <text className="sch-value" x={130} y={140} textAnchor="middle">
          {r.branches.length} kol · eşdeğer {fmtEng(r.Req, 'Ω', 3)}
        </text>
      )}
    </>
  )
}

export default function PlaneSchematic({ r, form }) {
  const tool = r.ok ? r.tool : form.tool
  const isPlane = tool === TOOL_PLANE

  return (
    <Schematic
      viewBox={`0 0 ${isPlane ? 260 : 280} ${isPlane ? 140 : 152}`}
      title={isPlane ? 'Güç düzlemi geometrisi' : 'Paralel yollar'}
      caption={isPlane
        ? 'Akım darboğazdan geçer; direncin büyük kısmı orada oluşur'
        : 'Kol kalınlıkları genişlik oranını gösterir'}
    >
      {isPlane ? <PlaneShape r={r} /> : <ParallelShape r={r} />}
    </Schematic>
  )
}
