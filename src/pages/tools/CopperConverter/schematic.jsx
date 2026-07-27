import Schematic from '../../../components/Schematic'
import { fmt, fmtEng } from '../../../lib/num'

// Trapez kesit — aşındırma oranı şemaya orantılı yansır.
// Kalınlık gerçekte genişliğin yanında görünmez kalır; şema oran değil,
// hangi ölçünün ne olduğunu gösterir.
//
// Yerleşim kuralı: her yazı kendi şeridinde durur, hiçbir etiket çizgiyle
// ya da başka bir yazıyla kesişmez.
//   üst şerit  (y < 44)   → W_üst değeri + etiketi
//   kesit      (46…88)    → trapez, kaplama bandı, solda "kaplama" etiketi
//   sağ sütun  (x > 206)  → kalınlık ölçüsü, etiketi ve değeri
//   alt şerit  (y > 118)  → alt genişlik ölçüsü; etiket ölçü çizgisinin
//                           kesildiği boşlukta durur, değer onun altında
export default function CopperSchematic({ r }) {
  const live = r.ok
  const etch = live ? Math.min(0.6, r.etch / 100) : 0
  const bottomHalf = 62
  const topHalf = bottomHalf * (1 - etch)
  const cx = 128
  const top = 46
  const bottom = 88

  const platingH = live && r.plating > 0 ? Math.max(4, 14 * r.platingShare) : 0

  // Kalınlık ölçüsü sağ sütunda: çizgi, uç çizgileri ve yazı başlangıcı
  const thickX = 206
  const thickLabelX = 212
  // Alt genişlik ölçüsü: çizgi yüksekliği ve etiket için bırakılan boşluk
  const widthY = 126
  const widthGap = 24

  return (
    <Schematic
      viewBox="0 0 280 152"
      title="Bakır kesiti"
      caption={live && r.plating > 0
        ? 'Bitmiş kesit — folyo üstüne kaplama eklenir'
        : 'Bakır kesiti — aşındırma üst genişliği daraltır'}
    >
      {/* Dielektrik taban */}
      <rect className="sch-dielectric" x={cx - 110} y={bottom} width={220} height={26} rx={2} />

      {/* Folyo gövdesi (trapez) */}
      <polygon
        className="sch-copper-fill"
        points={`${cx - topHalf},${top + platingH} ${cx + topHalf},${top + platingH} ${cx + bottomHalf},${bottom} ${cx - bottomHalf},${bottom}`}
      />

      {/* Kaplama katmanı — etiketi bandın solunda, kesitin dışında durur */}
      {platingH > 0 && (
        <>
          <polygon
            className="sch-copper"
            points={`${cx - topHalf},${top} ${cx + topHalf},${top} ${cx + topHalf},${top + platingH} ${cx - topHalf},${top + platingH}`}
          />
          <text
            className="sch-label dim"
            x={cx - topHalf - 10}
            y={top + platingH / 2 + 3}
            textAnchor="end"
          >
            kaplama
          </text>
        </>
      )}

      {/* Üst genişlik — değer ve etiket kesitin üstündeki şeritte */}
      {live && (
        <text className="sch-value" x={cx} y={24} textAnchor="middle">
          {fmtEng(r.trap.Wtop, 'm', 3)}
        </text>
      )}
      <text className="sch-label" x={cx} y={38} textAnchor="middle">W_üst</text>

      {/* Kalınlık ölçüsü — sağ sütun, kesitin ve kaplama etiketinin dışında */}
      <g className="sch-dim">
        <line x1={thickX} x2={thickX} y1={top} y2={bottom} />
        <line x1={thickX - 6} x2={thickX + 6} y1={top} y2={top} />
        <line x1={thickX - 6} x2={thickX + 6} y1={bottom} y2={bottom} />
      </g>
      <text className="sch-label" x={thickLabelX} y={62}>t</text>
      {live && <text className="sch-value" x={thickLabelX} y={76}>{fmt(r.units.finished.um, 3)} µm</text>}

      {/* Alt genişlik ölçüsü — çizgi etiketin geçtiği yerde kesilir */}
      <g className="sch-dim">
        <line x1={cx - bottomHalf} x2={cx - widthGap} y1={widthY} y2={widthY} />
        <line x1={cx + widthGap} x2={cx + bottomHalf} y1={widthY} y2={widthY} />
        <line x1={cx - bottomHalf} x2={cx - bottomHalf} y1={widthY - 6} y2={widthY + 6} />
        <line x1={cx + bottomHalf} x2={cx + bottomHalf} y1={widthY - 6} y2={widthY + 6} />
      </g>
      <text className="sch-label" x={cx} y={widthY + 3} textAnchor="middle">W_alt</text>
      {live && (
        <text className="sch-value" x={cx} y={144} textAnchor="middle">
          {fmtEng(r.trap.Wbottom, 'm', 3)}
        </text>
      )}
    </Schematic>
  )
}
