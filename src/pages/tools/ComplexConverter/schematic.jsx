import Schematic from '../../../components/Schematic'
import { fmt, fmtOhm } from '../../../lib/num'

// Kompleks düzlem: yatay eksen gerçel bileşen (R), dikey eksen sanal bileşen (jX).
// Vektör her zaman sabit uzunlukta çizilir — şema oranı değil, hangi ölçünün ne
// olduğunu ve vektörün hangi çeyrekte durduğunu gösterir. Endüktif reaktans
// (X > 0) yukarı, kapasitif (X < 0) aşağı düşer. Renk yazılmaz; sınıflar theme.css'ten.
//
// Yerleşim kuralı: vektör 360° döndüğü için etiketlerin sabit yerleri yoktur.
// Her etiket, kendi kutusu ile çizim elemanları arasında en az 3 px, başka bir
// yazı kutusu ile en az 2 px açıklık kalacak biçimde konumlanır. Kutu ölçüleri
// theme.css'ten gelir: .sch-label 11 px, .sch-value 10 px, tek aralıklı yazıda
// karakter genişliği ≈ 0.62·fs, kutu = [y − 0.78·fs , y + 0.22·fs].
export default function ComplexSchematic({ r }) {
  const live = r.ok

  const ox = 128 // orijin
  const oy = 78
  const len = 44 // vektör uzunluğu (piksel)
  const arc = 24 // faz yayı yarıçapı
  const axHalf = 47 // dikey eksenin yarı boyu — uç düğümü tam kapsar

  // .sch-label kutusu: tek karakterin yarı genişliği ve temel çizgiden ortaya kayma
  const halfChar = (0.62 * 11) / 2
  const above = 0.78 * 11
  const below = 0.22 * 11
  const mid = 3 // kutu ortası temel çizginin ~3 px üstündedir

  // Geçerli girdi yokken 30°'lik örnek bir vektör gösterilir
  const phase = live ? r.phase : Math.PI / 6
  const cos = Math.cos(phase)
  const sin = Math.sin(phase)
  const absDeg = Math.abs((phase * 180) / Math.PI)

  const px = ox + len * cos // uç nokta
  const py = oy - len * sin // SVG'de y aşağı büyür; +X yukarı çizilir

  // Faz yayı: gerçel eksenden vektöre. Ekranda açı saat yönünün tersine
  // büyüdüğü için pozitif fazda sweep-flag 0, negatifte 1 olur.
  const arcStart = `${ox + arc},${oy}`
  const arcEnd = `${ox + arc * cos},${oy - arc * sin}`
  const sweepFlag = sin >= 0 ? 0 : 1
  const arcPath = `M ${arcStart} A ${arc} ${arc} 0 0 ${sweepFlag} ${arcEnd}`

  // Etiketler vektörün eksene bakan yüzüne değil, dış yüzüne kaydırılır
  const side = sin >= 0 ? 1 : -1
  const turn = phase >= 0 ? 1 : -1 // açının açılma yönü

  // --- φ etiketi ---
  // Geniş açıda açıortay üzerinde, yayın dışında durur. Yarıçap üç koşulun en
  // büyüğüdür: yaydan uzaklık (≥ 35), gerçel eksen ile vektörden dik uzaklık
  // (10.5 px) ve dikey izdüşüm çizgisinin ötesi. Ok ucunun çevresindeki yasak
  // banda düşerse bandın dışına itilir. Açı 20°'nin altındayken kama yazıyı
  // alamayacak kadar incedir: etiket yay ucundan vektörün dış yüzüne kaydırılır,
  // altından geçen yatay izdüşüm çizgisi ise iki parça olarak çizilir.
  let phiX
  let phiY
  if (absDeg >= 20) {
    const th = turn * Math.min(Math.abs(phase) / 2, Math.PI / 4)
    let rr = Math.max(35, 10.5 / Math.sin(Math.abs(phase) / 2))
    if (cos > 0) rr = Math.max(rr, (len * cos + 8) / Math.cos(th))
    const span = Math.abs(phase) - Math.abs(th) // etiket ile vektör arasındaki açı
    const disc = 12.6 * 12.6 - (len * Math.sin(span)) ** 2
    if (disc > 0) {
      const lo = len * Math.cos(span) - Math.sqrt(disc)
      const hi = len * Math.cos(span) + Math.sqrt(disc)
      if (rr > lo && rr < hi) rr = hi
    }
    phiX = ox + rr * Math.cos(th)
    phiY = oy - rr * Math.sin(th)
  } else {
    phiX = ox + arc * cos - 16 * turn * sin
    phiY = oy - arc * sin - 16 * turn * cos
  }

  // Yatay izdüşüm çizgisi φ etiketinin kutusundan geçiyorsa iki parça çizilir
  const hx0 = Math.min(ox, px)
  const hx1 = Math.max(ox, px)
  const cut0 = Math.max(hx0, phiX - halfChar - 5)
  const cut1 = Math.min(hx1, phiX + halfChar + 5)
  const splitH =
    py >= phiY + mid - above - 5 && py <= phiY + mid + below + 5 && cut1 > cut0

  // --- |Z| etiketi ---
  // Ucun ötesinde, vektörün dış yüzüne kaydırılmış. Vektör eksene yaklaşınca
  // etiket eksen çizgisinin üstüne düşerdi; bu yüzden eksen bantlarından itilir.
  let zx = ox + (len + 8) * cos - 16 * sin * side
  let zy = oy - (len + 8) * sin - 16 * cos * side
  if (Math.abs(zx - ox) < 23) zx = ox - 23
  if (Math.abs(zy - oy) < 11) zy = oy - 11 * (cos * side >= 0 ? 1 : -1)

  // --- R etiketi ---
  // Gerçel bileşen parçasının ortasında, vektörün ters yüzünde. Vektör dikeye
  // yaklaşınca parça kısalır; etiket dikey eksene binmesin diye en az 10 px kaçar.
  const rx = ox + Math.max(Math.abs((len / 2) * cos), 10) * (cos < 0 ? -1 : 1)
  const ry = oy + 13 * side + mid

  // --- jX etiketi ---
  // Sanal bileşen parçasının yanında. Vektör sola bakarken (cos < 0) etiket
  // eksenin sağına geçer ve faz yayının süpürdüğü bölgeyi aşacak kadar uzaklaşır.
  const jOff = Math.max(Math.abs((len / 2) * sin), cos < 0 ? 38 : 14)
  const jx = ox + (cos >= 0 ? -8 : 8)
  const jy = oy - jOff * side + mid

  const caption = live
    ? r.X > 0
      ? 'Vektör gerçel eksenin üstünde — endüktif bölge'
      : r.X < 0
        ? 'Vektör gerçel eksenin altında — kapasitif bölge'
        : 'Vektör gerçel eksen üzerinde — saf direnç'
    : 'Kompleks düzlemde Z = R + jX'

  return (
    <Schematic
      viewBox="0 0 260 156"
      title="Kompleks düzlemde Z vektörü"
      caption={caption}
    >
      {/* Eksenler */}
      <g className="sch-wire">
        <line x1={16} x2={244} y1={oy} y2={oy} />
        <line x1={ox} x2={ox} y1={oy - axHalf} y2={oy + axHalf} />
      </g>
      <text className="sch-label dim" x={240} y={oy - 10} textAnchor="end">+R</text>
      <text className="sch-label dim" x={ox} y={24} textAnchor="middle">+jX</text>
      <text className="sch-label dim" x={ox} y={138} textAnchor="middle">−jX</text>

      {/* Bileşen izdüşümleri */}
      <line className="sch-wire sch-dash" x1={px} x2={px} y1={py} y2={oy} />
      {splitH ? (
        <>
          {cut0 > hx0 && (
            <line className="sch-wire sch-dash" x1={hx0} x2={cut0} y1={py} y2={py} />
          )}
          {hx1 > cut1 && (
            <line className="sch-wire sch-dash" x1={cut1} x2={hx1} y1={py} y2={py} />
          )}
        </>
      ) : (
        <line className="sch-wire sch-dash" x1={px} x2={ox} y1={py} y2={py} />
      )}

      {/* Z vektörü */}
      <line className="sch-arrow" x1={ox} y1={oy} x2={px} y2={py} />
      <polygon
        className="sch-arrow-head"
        points={`${px},${py} ${px - 9 * cos + 4 * sin},${py + 9 * sin + 4 * cos} ${px - 9 * cos - 4 * sin},${py + 9 * sin - 4 * cos}`}
      />
      <circle className="sch-node" cx={px} cy={py} r={3} />

      {/* Faz yayı */}
      <path className="sch-dim" d={arcPath} fill="none" />
      <text className="sch-label" x={phiX} y={phiY + mid} textAnchor="middle">φ</text>

      {/* Büyüklük etiketi */}
      <text className="sch-label" x={zx} y={zy + mid} textAnchor="middle">|Z|</text>

      {/* Gerçel bileşen etiketi */}
      <text className="sch-label" x={rx} y={ry} textAnchor="middle">R</text>

      {/* Sanal bileşen etiketi */}
      <text className="sch-label" x={jx} y={jy} textAnchor={cos >= 0 ? 'end' : 'start'}>jX</text>

      {live && (
        <>
          <text className="sch-value" x={16} y={10}>{fmtOhm(r.magnitude)} ∠ {fmt(r.phaseDeg, 4)}°</text>
          <text className="sch-value" x={16} y={151}>R = {fmtOhm(r.R)}</text>
          <text className="sch-value" x={244} y={151} textAnchor="end">X = {fmtOhm(r.X)}</text>
        </>
      )}
    </Schematic>
  )
}
