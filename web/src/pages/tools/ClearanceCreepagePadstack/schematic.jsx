import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'
import { TAB_PADSTACK } from './model'

// İki çizim, sekmeye göre:
//
//  1) Clearance / creepage — iki iletken arasındaki hava yolu (en kısa doğru)
//     ve yalıtkan yüzey boyunca giden yüzey yolu. İkisinin farkı bu ekranın
//     konusu olduğu için aynı kesitte yan yana gösterilir.
//  2) Padstack — üstten görünüm: delik, kaplama, pad, annular ring, antipad ve
//     mask açıklığı iç içe halkalar hâlinde.
//
// Yazıların tamamı `text` prop'undan gelir; SVG içinde çıplak dize yoktur.
// Renkler tema sınıflarından gelir (.sch-copper, .sch-dielectric, …), SVG'ye
// literal renk yazılmaz.
//
// ÖLÇEKLEME — çizim girilen değerlere göre orantılıdır ama saf orantı bazı
// katmanları görünmez yapar (25 µm kaplama, 0.4 mm delik yanında bir piksel
// bile etmez). Bu yüzden her halka için görünürlük tabanı uygulanır; ölçü
// etiketleri her zaman gerçek değeri yazar.
const MIN_RING_PX = 3

function ring(prev, value, scale) {
  if (!Number.isFinite(value) || value <= 0) return prev
  return Math.max(prev + MIN_RING_PX, value * scale)
}

const PadstackView = forwardRef(function PadstackView({ r, text, fmtLen }, ref) {
  const cx = 110
  const cy = 108
  const live = r.ok && r.tab === TAB_PADSTACK

  // En dış çap çizim alanına sığacak biçimde ölçeklenir.
  const outer = live
    ? Math.max(r.results.Dantipad, r.results.Dmask, r.results.Dpad)
    : 1
  const scale = live && outer > 0 ? 78 / outer : 1

  const rHole = live ? Math.max(6, (r.results.Ddrill / 2) * scale) : 18
  const rPlated = live && r.results.tPlating > 0
    ? ring(rHole, r.results.Ddrill / 2 + r.results.tPlating, scale)
    : rHole
  const rPad = live ? ring(rPlated, r.results.Dpad / 2, scale) : 34
  const rMask = live ? ring(rPad, r.results.Dmask / 2, scale) : 42
  const rAnti = live ? ring(rMask, r.results.Dantipad / 2, scale) : 52

  return (
    <Schematic ref={ref} viewBox="0 0 340 216" title={text.padstackTitle} caption={text.caption}>
      {/* Antipad — plane içindeki boşluk */}
      <circle className="sch-dielectric" cx={cx} cy={cy} r={rAnti} />
      {/* Mask açıklığı */}
      <circle className="sch-dielectric sch-dash" cx={cx} cy={cy} r={rMask} />
      {/* Pad bakırı */}
      <circle className="sch-copper" cx={cx} cy={cy} r={rPad} />
      {/* Kaplama halkası */}
      <circle className="sch-copper-fill" cx={cx} cy={cy} r={rPlated} />
      {/* Delik */}
      <circle className="sch-hole" cx={cx} cy={cy} r={rHole} />
      <circle className="sch-dim" cx={cx} cy={cy} r={rHole} fill="none" />

      {/* Yarıçap ölçüleri — hepsi merkezden sağa doğru, üst üste binmesin diye
          farklı yüksekliklerde. */}
      <line className="sch-dim" x1={cx} y1={cy} x2={cx + rAnti} y2={cy} />

      <text className="sch-label" x={cx + rAnti + 6} y={cy - 34}>{text.antipad}</text>
      <text className="sch-label" x={cx + rAnti + 6} y={cy - 16}>{text.mask}</text>
      <text className="sch-label" x={cx + rAnti + 6} y={cy + 2}>{text.pad}</text>
      <text className="sch-label" x={cx + rAnti + 6} y={cy + 20}>{text.plating}</text>
      <text className="sch-label" x={cx + rAnti + 6} y={cy + 38}>{text.hole}</text>

      {live && (
        <>
          {/* Değer sütunu SAĞA yaslı. Etikete sabit bir boşluk eklenerek
              (eskiden +76) konumlandırılırsa uzun etiket değerin üstüne biner —
              "mask açıklığı" 86 birim, boşluk 70'ti. Sağa yaslamak çakışmayı
              geometriyle imkânsız kılar ve çeviri uzadığında yeniden
              ölçmek gerekmez. */}
          <text className="sch-value" x={328} textAnchor="end" y={cy - 34}>{fmtLen(r.results.Dantipad)}</text>
          <text className="sch-value" x={328} textAnchor="end" y={cy - 16}>{fmtLen(r.results.Dmask)}</text>
          <text className="sch-value" x={328} textAnchor="end" y={cy + 2}>{fmtLen(r.results.Dpad)}</text>
          <text className="sch-value" x={328} textAnchor="end" y={cy + 20}>{fmtLen(r.results.tPlating)}</text>
          <text className="sch-value" x={328} textAnchor="end" y={cy + 38}>{fmtLen(r.results.Ddrill)}</text>

          {/* Alt ölçü satırı: etiket solda, değer SAĞA yaslı. Değer sabit bir
              x'e konursa ("annular ring" 60 birimden geniş) etiketin üstüne
              biner — yukarıdaki sütunun aksine burada etiket için ayrılmış dar
              bir sütun yok, satır çizimin tüm genişliğini kullanıyor. Sağa
              yaslamak çakışmayı geometriyle imkânsız kılar, metin uzunluğunu
              tahmin etmeye dayanmaz. */}
          <text className="sch-label" x={12} y={200}>{text.ring}</text>
          <text className="sch-value" x={328} y={200} textAnchor="end">
            {fmtLen(r.results.ringWorst)}
          </text>
        </>
      )}
    </Schematic>
  )
})

const ClearanceView = forwardRef(function ClearanceView({ r, text, fmtLen }, ref) {
  const live = r.ok && r.tab !== TAB_PADSTACK
  const leftX = 46
  const rightX = 214
  const condY = 74
  const condW = 34
  const condH = 18
  const surfaceY = condY + condH

  // Creepage yolu iletken kenarından yalıtkan yüzeyine iner, yüzeyi kat eder
  // ve karşı iletkene çıkar — clearance ise iki kenar arasındaki doğrudur.
  const leftEdge = leftX + condW
  const rightEdge = rightX
  const creepPath = `M ${leftEdge} ${condY + condH / 2}
    L ${leftEdge} ${surfaceY + 10}
    L ${rightEdge} ${surfaceY + 10}
    L ${rightEdge} ${condY + condH / 2}`

  return (
    <Schematic ref={ref} viewBox="0 0 300 190" title={text.clearanceTitle} caption={text.caption}>
      {/* Yalıtkan gövde */}
      <rect className="sch-dielectric" x={16} y={surfaceY} width={268} height={34} />
      <text className="sch-label" x={20} y={surfaceY + 24}>{text.substrate}</text>

      {/* İki iletken */}
      <rect className="sch-copper" x={leftX} y={condY} width={condW} height={condH} />
      <rect className="sch-copper" x={rightX} y={condY} width={condW} height={condH} />
      <text className="sch-label" x={leftX} y={condY - 8}>{text.conductor}</text>
      <text className="sch-label" x={rightX} y={condY - 8}>{text.conductor}</text>

      {/* Clearance — hava üzerinden en kısa yol */}
      <line className="sch-arrow" x1={leftEdge} y1={condY + condH / 2} x2={rightEdge} y2={condY + condH / 2} />
      <text className="sch-label" x={(leftEdge + rightEdge) / 2} y={condY - 22} textAnchor="middle">
        {text.clearancePath}
      </text>

      {/* Creepage — yüzey boyunca */}
      <path className="sch-dim sch-dash" d={creepPath} fill="none" />
      <text className="sch-label" x={(leftEdge + rightEdge) / 2} y={surfaceY + 26} textAnchor="middle">
        {text.creepagePath}
      </text>

      {live && (
        <>
          <text className="sch-value" x={(leftEdge + rightEdge) / 2} y={condY - 36} textAnchor="middle">
            {r.required === null ? '—' : fmtLen(r.required)}
          </text>
          {r.actual !== null && (
            <text className="sch-value" x={(leftEdge + rightEdge) / 2} y={168} textAnchor="middle">
              {fmtLen(r.actual)}
            </text>
          )}
        </>
      )}
    </Schematic>
  )
})

const ClearanceCreepagePadstackSchematic = forwardRef(
  function ClearanceCreepagePadstackSchematic({ r, tab, text, fmtLen }, ref) {
    // `ref` doğrudan canlı <svg> düğümüne bağlanmalı: rapor üretimi
    // `outerHTML` okur (lib/svgInline.js), araya bir sarmalayıcı girerse
    // serileştirme SVG yerine <div> görür. Aynı anda tek görünüm çizildiği
    // için ref her zaman görünen şemaya oturur.
    const View = tab === TAB_PADSTACK ? PadstackView : ClearanceView
    return <View ref={ref} r={r} text={text} fmtLen={fmtLen} />
  },
)

export default ClearanceCreepagePadstackSchematic
