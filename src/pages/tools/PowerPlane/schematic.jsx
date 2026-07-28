import Schematic, { Terminal, CurrentArrow } from '../../../components/Schematic'
import { fmtEng, fmtAmp } from '../../../lib/num'
import { TOOL_PLANE } from './model'

// Boyunlu bakır poligon — akım darboğazdan geçer
function PlaneShape({ r, text }) {
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

  // Yazılar iki serbest şeritte toplanır; hiçbiri bakır dolgunun ya da omuz
  // köşegenlerinin üstüne binmez. Şeritler poligonun dışında sabit durur,
  // boyun daralıp genişlerken yer değiştirmez:
  //   üst şerit  → boyun etiketi (13) + boyun/akım değerleri (29)
  //   alt şerit  → ortalama genişlik (117) + yol uzunluğu (133)
  // Ölçü çizgileri şeride kadar uzatılır ki değer hangi ölçüye ait olduğu
  // belli olsun (etiket poligondan uzaklaştığı için gerekli).
  const labelY = 13
  const topValueY = 29
  const bottomValueY = 117
  const lengthY = 133
  const neckLeaderTop = 37 // üst şeritteki değerin altında başlar, boyuna iner
  const avgLeaderBottom = 103.5 // poligonun altından alt şeride doğru uzar

  return (
    <>
      <path
        className="sch-copper-fill"
        d={`M20 ${top} L100 ${top} L124 ${nTop} L146 ${nTop} L170 ${top} L240 ${top}
            L240 ${bottom} L170 ${bottom} L146 ${nBottom} L124 ${nBottom} L100 ${bottom} L20 ${bottom} Z`}
      />

      {/* Boyun ölçüsü + üst şeride uzanan yardımcı çizgi */}
      <g className="sch-dim">
        <line x1={135} x2={135} y1={nTop} y2={nBottom} />
        <line x1={129} x2={141} y1={nTop} y2={nTop} />
        <line x1={129} x2={141} y1={nBottom} y2={nBottom} />
        <line x1={135} x2={135} y1={neckLeaderTop} y2={nTop} />
      </g>
      <text className="sch-label" x={135} y={labelY} textAnchor="middle">{text.neck}</text>
      {r.ok && (
        <text className="sch-value" x={135} y={topValueY} textAnchor="middle">
          {fmtEng(r.neck.W, 'm', 3)}
        </text>
      )}

      {/* Ortalama genişlik ölçüsü + alt şeride uzanan yardımcı çizgi */}
      <g className="sch-dim">
        <line x1={56} x2={56} y1={top} y2={bottom} />
        <line x1={50} x2={62} y1={top} y2={top} />
        <line x1={50} x2={62} y1={bottom} y2={bottom} />
        <line x1={56} x2={56} y1={bottom} y2={avgLeaderBottom} />
      </g>
      {r.ok && (
        <text className="sch-value" x={56} y={bottomValueY} textAnchor="middle">
          {fmtEng(r.average.W, 'm', 3)}
        </text>
      )}

      {/* Akım oku düzlemin içinde kalır, değeri üst şeride yazılır: bileşenin
          kendi etiket yeri okun başını ve poligonun sağ kenarını kesiyordu. */}
      <CurrentArrow x={210} y={midY} dir="right" len={22} label={null} />
      <text className="sch-value" x={210} y={topValueY} textAnchor="middle">
        {r.ok ? fmtAmp(r.I, 3) : 'I'}
      </text>
      <Terminal x={20} y={midY} />
      <Terminal x={240} y={midY} />
      {r.ok && (
        <text className="sch-value" x={130} y={lengthY} textAnchor="middle">
          L = {fmtEng(r.average.L, 'm', 3)}
        </text>
      )}
    </>
  )
}

// Paralel yollar — kalınlıkları genişlik oranına göre çizilir
function ParallelShape({ r, text }) {
  const branches = r.ok ? r.branches.slice(0, 6) : [{ W: 1 }, { W: 1 }]
  const maxW = Math.max(...branches.map((b) => b.W))
  const gap = 100 / Math.max(branches.length, 2)
  const axisY = 70 // besleme ekseni
  // Kol yığını besleme ekseninde ortalanır: sabit üst kenarda tek kollu
  // durumda bara boyu sıfıra iniyor ve y=70'teki besleme telleri kolun
  // dışında kalıyordu. Ortalanınca her kol sayısında bara telle buluşur.
  const top = axisY - (gap * (branches.length - 1)) / 2

  return (
    <>
      {/* Kollar 200'de bitiyor, kol akımları 226'dan başlayan serbest sütuna
          yazılıyor: bakırın, sağ baranın ve terminalin üstünde yazı kalmıyor.
          viewBox 296 genişliğinde — en uzun akım değeri bile taşmıyor. */}
      <g className="sch-wire">
        <line x1={30} x2={30} y1={top} y2={top + gap * (branches.length - 1)} />
        <line x1={200} x2={200} y1={top} y2={top + gap * (branches.length - 1)} />
        <line x1={14} x2={30} y1={axisY} y2={axisY} />
        <line x1={200} x2={216} y1={axisY} y2={axisY} />
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

      <Terminal x={14} y={axisY} />
      <Terminal x={216} y={axisY} />
      {r.ok && (
        <text className="sch-value" x={130} y={140} textAnchor="middle">
          {text.branchSummary(r.branches.length, fmtEng(r.Req, 'Ω', 3))}
        </text>
      )}
    </>
  )
}

export default function PlaneSchematic({ r, form, text }) {
  const tool = r.ok ? r.tool : form.tool
  const isPlane = tool === TOOL_PLANE

  return (
    <Schematic
      viewBox={`0 0 ${isPlane ? 260 : 296} ${isPlane ? 140 : 152}`}
      title={isPlane ? text.titlePlane : text.titleParallel}
      caption={isPlane ? text.captionPlane : text.captionParallel}
    >
      {isPlane ? <PlaneShape r={r} text={text} /> : <ParallelShape r={r} text={text} />}
    </Schematic>
  )
}
