import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'
import { fmt } from '../../../lib/num'
import { AWG_MIN, AWG_MAX } from './model'

// Telin kesiti: içteki dolu daire çıplak iletken, dıştaki halka izolasyondur.
// Daire yarıçapı numaraya göre ölçeklenir — oran değil, hangi ölçünün ne
// olduğunu ve izolasyonun hesaba girmediğini gösterir.
//
// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const AwgSchematic = forwardRef(function AwgSchematic({ r, text }, ref) {
  const live = r.ok
  const clamped = live ? Math.min(AWG_MAX, Math.max(AWG_MIN, r.awgExact)) : 20
  // İnce telde küçük, kalın telde büyük daire
  const t = (AWG_MAX - clamped) / (AWG_MAX - AWG_MIN)
  const rad = 13 + 29 * t
  const insul = rad + 11

  const cx = 88
  const cy = 74

  // Ölçü çizgisi soldan sabit bir uca kadar uzatılır: "d" etiketi kuyruğun
  // ucunda, en kalın telde bile kesitin ve ölçü çizgisinin dışında kalır.
  const dimTail = 30

  return (
    <Schematic
      ref={ref}
      viewBox="0 0 260 150"
      title={text.title}
      caption={text.caption}
    >
      {/* İzolasyon kılıfı */}
      <circle className="sch-dielectric" cx={cx} cy={cy} r={insul} />

      {/* Çıplak iletken */}
      <circle className="sch-copper-fill" cx={cx} cy={cy} r={rad} />

      {/* Çap ölçüsü — ölçünün sınırlarını iki tırnak gösterir, çizgi etiket
          için sola taşar; böylece yazı kesitin üstüne binmez. */}
      <g className="sch-dim">
        <line x1={dimTail} x2={cx + rad} y1={cy} y2={cy} />
        <line x1={cx - rad} x2={cx - rad} y1={cy - 6} y2={cy + 6} />
        <line x1={cx + rad} x2={cx + rad} y1={cy - 6} y2={cy + 6} />
      </g>
      <text className="sch-label" x={dimTail - 4} y={cy + 3} textAnchor="end">d</text>

      {/* İzolasyona giden kesikli gösterge — kılıf etikete yaklaşınca çizilmez */}
      {cy - insul > 30 && (
        <line className="sch-wire sch-dash" x1={cx} y1={cy - insul} x2={cx} y2={21} />
      )}
      <text className="sch-label dim" x={cx} y={14} textAnchor="middle">{text.insulation}</text>

      {live && (
        <>
          {/* En uzun satır ("A = 0.009999 mm²") çerçeveye sığsın diye sütun
              soldan başlar; kesitin sağ kenarıyla arası yine de açıktır. */}
          <text className="sch-value" x={154} y={58}>
            d = {fmt(r.dUnits.mm, 4)} mm
          </text>
          <text className="sch-value" x={154} y={78}>
            {fmt(r.dUnits.mil, 4)} mil
          </text>
          <text className="sch-value" x={154} y={98}>
            A = {fmt(r.aUnits.mm2, 4)} mm²
          </text>
          <text className="sch-value" x={154} y={118}>
            {fmt(r.aUnits.mil2, 6)} mil²
          </text>
        </>
      )}
    </Schematic>
  )
})

export default AwgSchematic
