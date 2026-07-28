import Schematic, { Terminal } from '../../../components/Schematic'
import { fmt, fmtEng } from '../../../lib/num'

// P ve N hatları. Gecikmesi küçük olan hat serpantinli çizilir — uzunluk
// eklenecek hat odur. Serpantin ölçekli değildir; yalnızca "bu hat uzatılıyor"
// bilgisini taşır.

const X0 = 26
const X1 = 234
const Y_P = 44
const Y_N = 92

function tracePath(y, serpentine) {
  if (!serpentine) return `M${X0} ${y} L${X1} ${y}`

  const amp = 13
  const step = 12
  const parts = [`M${X0} ${y}`, `L96 ${y}`]
  let x = 96
  for (let i = 0; i < 3; i++) {
    parts.push(
      `L${x} ${y - amp}`,
      `L${x + step} ${y - amp}`,
      `L${x + step} ${y}`,
      `L${x + 2 * step} ${y}`,
    )
    x += 2 * step
  }
  parts.push(`L${X1} ${y}`)
  return parts.join(' ')
}

export default function SkewSchematic({ r, text }) {
  // Girdi geçersizken de bir şey gösterilir: N hattı serpantinli varsayılır
  const serpP = r.ok ? r.addTo === 'P' : false
  const serpN = r.ok ? r.addTo === 'N' : true

  return (
    <Schematic
      viewBox="0 0 260 158"
      title={text.title}
      caption={r.ok && r.addTo === null
        ? text.captionEqual
        : text.captionDefault}
    >
      {/* Hat adları */}
      <text className="sch-label" x={8} y={Y_P + 4}>P</text>
      <text className="sch-label" x={8} y={Y_N + 4}>N</text>

      {/* Hatlar */}
      <path className="sch-wire" d={tracePath(Y_P, serpP)} />
      <path className="sch-wire" d={tracePath(Y_N, serpN)} />

      {/* Sürücü ve alıcı uçları */}
      <Terminal x={X0} y={Y_P} r={3} />
      <Terminal x={X1} y={Y_P} r={3} />
      <Terminal x={X0} y={Y_N} r={3} />
      <Terminal x={X1} y={Y_N} r={3} />

      {/* Referans düzlem şeridi — hatların altında */}
      <rect className="sch-dielectric" x={X0} y={104} width={X1 - X0} height={6} />

      {/* Uzunluk ölçüsü — εeff,N satırının altına iner, uç çizgileri o yazıya
          binmesin */}
      <g className="sch-dim">
        <line x1={X0} x2={X1} y1={134} y2={134} />
        <line x1={X0} x2={X0} y1={130} y2={138} />
        <line x1={X1} x2={X1} y1={130} y2={138} />
      </g>

      {r.ok && (
        <>
          <text className="sch-value" x={X0} y={20}>
            εeff,P = {fmt(r.eps.epsEff, 4)}
          </text>
          {/* skew, iki hattın arasındaki boş banda (y 45–78) yazılır. Üst
              satırda εeff,P ile yan yana durduğunda toplam genişlik 208 px'i
              aşabiliyordu: εeff geniş biçimlendiğinde (örn. "1.234e+4") iki
              yazı üst üste biniyordu. Ayrı satırlarda her ikisi de tam
              genişliği kullanabilir. */}
          <text className="sch-value" x={X1} y={(Y_P + Y_N) / 2 - 4} textAnchor="end">
            skew = {fmtEng(r.skew, 's', 3)}
          </text>
          {/* Referans şeridin (y 104–110) altında, ölçü çizgisinin üstünde */}
          <text className="sch-value" x={X0} y={Y_N + 30}>
            {r.differentLayer
              ? `εeff,N = ${fmt(r.epsEffN, 4)}`
              : text.sameLayerEps}
          </text>
          <text className="sch-value" x={130} y={150} textAnchor="middle">
            ΔL = {fmtEng(r.deltaL, 'm', 3)}
            {r.addTo ? text.addSuffix(r.addTo, fmtEng(r.addLength, 'm', 3)) : ''}
          </text>
        </>
      )}
    </Schematic>
  )
}
