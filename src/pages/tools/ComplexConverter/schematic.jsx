import Schematic from '../../../components/Schematic'
import { fmt, fmtOhm } from '../../../lib/num'

// Kompleks düzlem: yatay eksen gerçel bileşen (R), dikey eksen sanal bileşen (jX).
// Vektör her zaman sabit uzunlukta çizilir — şema oranı değil, hangi ölçünün ne
// olduğunu ve vektörün hangi çeyrekte durduğunu gösterir. Endüktif reaktans
// (X > 0) yukarı, kapasitif (X < 0) aşağı düşer. Renk yazılmaz; sınıflar theme.css'ten.
export default function ComplexSchematic({ r }) {
  const live = r.ok

  const ox = 128 // orijin
  const oy = 74
  const len = 44 // vektör uzunluğu (piksel)
  const arc = 24 // faz yayı yarıçapı

  // Geçerli girdi yokken 30°'lik örnek bir vektör gösterilir
  const phase = live ? r.phase : Math.PI / 6
  const cos = Math.cos(phase)
  const sin = Math.sin(phase)

  const px = ox + len * cos // uç nokta
  const py = oy - len * sin // SVG'de y aşağı büyür; +X yukarı çizilir

  // Faz yayı: gerçel eksenden vektöre. Ekranda açı saat yönünün tersine
  // büyüdüğü için pozitif fazda sweep-flag 0, negatifte 1 olur.
  const arcStart = `${ox + arc},${oy}`
  const arcEnd = `${ox + arc * cos},${oy - arc * sin}`
  const sweepFlag = sin >= 0 ? 0 : 1
  const arcPath = `M ${arcStart} A ${arc} ${arc} 0 0 ${sweepFlag} ${arcEnd}`

  // Yay etiketi açının ortasına konur
  const halfCos = Math.cos(phase / 2)
  const halfSin = Math.sin(phase / 2)

  // Etiketler vektörün eksene bakan yüzüne değil, dış yüzüne kaydırılır
  const side = sin >= 0 ? 1 : -1

  const caption = live
    ? r.X > 0
      ? 'Vektör gerçel eksenin üstünde — endüktif bölge'
      : r.X < 0
        ? 'Vektör gerçel eksenin altında — kapasitif bölge'
        : 'Vektör gerçel eksen üzerinde — saf direnç'
    : 'Kompleks düzlemde Z = R + jX'

  return (
    <Schematic
      viewBox="0 0 260 148"
      title="Kompleks düzlemde Z vektörü"
      caption={caption}
    >
      {/* Eksenler */}
      <g className="sch-wire">
        <line x1={16} x2={244} y1={oy} y2={oy} />
        <line x1={ox} x2={ox} y1={14} y2={134} />
      </g>
      <text className="sch-label dim" x={240} y={oy - 6} textAnchor="end">+R</text>
      <text className="sch-label dim" x={ox + 6} y={20}>+jX</text>
      <text className="sch-label dim" x={ox + 6} y={132}>−jX</text>

      {/* Bileşen izdüşümleri */}
      <line className="sch-wire sch-dash" x1={px} x2={px} y1={py} y2={oy} />
      <line className="sch-wire sch-dash" x1={px} x2={ox} y1={py} y2={py} />

      {/* Z vektörü */}
      <line className="sch-arrow" x1={ox} y1={oy} x2={px} y2={py} />
      <polygon
        className="sch-arrow-head"
        points={`${px},${py} ${px - 9 * cos + 4 * sin},${py + 9 * sin + 4 * cos} ${px - 9 * cos - 4 * sin},${py + 9 * sin - 4 * cos}`}
      />
      <circle className="sch-node" cx={px} cy={py} r={3} />

      {/* Faz yayı */}
      <path className="sch-dim" d={arcPath} fill="none" />
      <text
        className="sch-label"
        x={ox + (arc + 12) * halfCos}
        y={oy - (arc + 12) * halfSin + 4}
        textAnchor="middle"
      >
        φ
      </text>

      {/* Büyüklük etiketi — ucun ötesinde, eksenden uzağa kaydırılmış */}
      <text
        className="sch-label"
        x={ox + (len + 10) * cos - 10 * sin * side}
        y={oy - (len + 10) * sin - 10 * cos * side + 4}
        textAnchor="middle"
      >
        |Z|
      </text>

      {/* Gerçel bileşen etiketi — vektör yukarıdaysa eksenin altına yazılır */}
      <text
        className="sch-label"
        x={ox + (len / 2) * cos}
        y={sin >= 0 ? oy + 16 : oy - 8}
        textAnchor="middle"
      >
        R
      </text>

      {/* Sanal bileşen etiketi */}
      <text
        className="sch-label"
        x={ox + (cos >= 0 ? -8 : 8)}
        y={oy - (len / 2) * sin + 4}
        textAnchor={cos >= 0 ? 'end' : 'start'}
      >
        jX
      </text>

      {live && (
        <>
          <text className="sch-value" x={16} y={20}>{fmtOhm(r.magnitude)} ∠ {fmt(r.phaseDeg, 4)}°</text>
          <text className="sch-value" x={16} y={144}>R = {fmtOhm(r.R)}</text>
          <text className="sch-value" x={244} y={144} textAnchor="end">X = {fmtOhm(r.X)}</text>
        </>
      )}
    </Schematic>
  )
}
