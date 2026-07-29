import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'

// Üstten görünüm: merkez pad, çevresindeki plane açıklığı ve açıklığı kesen
// spokeler. Spoke sayısı ve genişliği girilen değerlere göre parametriktir.
//
// Yazıların tamamı `text` prop'undan gelir; renkler tema sınıflarından.
//
// ÖLÇEK — pad çapı sabit bir çizim yarıçapına oturur, açıklık ve spoke
// genişlikleri aynı çarpanla çizilir. Pad çapı girilmemişse spoke uzunluğu ve
// genişliğinden türetilen temsili bir çap kullanılır ve ölçü etiketi basılmaz.
const PAD_PX = 46

const ThermalReliefSchematic = forwardRef(function ThermalReliefSchematic(
  { r, text, fmtLen },
  ref,
) {
  const live = r.ok
  const cx = 108
  const cy = 108

  const padDiameter = live ? r.results.padDiameter : null
  const hasPad = padDiameter !== null && padDiameter > 0
  // Ölçek yalnızca pad çapı varken gerçek orantıyı taşır.
  const s = hasPad ? PAD_PX / (padDiameter / 2) : 1

  const rPad = PAD_PX
  const gap = live && r.results.thermalGap !== null ? r.results.thermalGap : null
  const rClear = hasPad && gap !== null
    ? rPad + gap * s
    : rPad + 22

  const count = live ? r.results.spokeCount : 4
  // Çizimde spoke sayısı okunabilir kalsın diye üst sınır uygulanır; ölçü
  // etiketi gerçek sayıyı yazar.
  const drawn = Math.min(count, 16)
  const spokeW = live && hasPad
    ? Math.max(2, r.results.widestInnerWidth * s)
    : 8

  const spokes = Array.from({ length: drawn }, (_, i) => {
    const angle = (2 * Math.PI * i) / drawn - Math.PI / 2
    return {
      x1: cx + Math.cos(angle) * (rPad - 1),
      y1: cy + Math.sin(angle) * (rPad - 1),
      x2: cx + Math.cos(angle) * (rClear + 1),
      y2: cy + Math.sin(angle) * (rClear + 1),
    }
  })

  return (
    <Schematic ref={ref} viewBox="0 0 300 226" title={text.title} caption={text.caption}>
      {/* Plane bakırı — açıklığın dışında kalan alan */}
      <rect className="sch-copper-fill" x={8} y={8} width={200} height={200} />
      <text className="sch-label" x={14} y={22}>{text.plane}</text>

      {/* Plane açıklığı */}
      <circle className="sch-dielectric" cx={cx} cy={cy} r={rClear} />

      {/* Spokeler açıklığı keser */}
      {spokes.map((sp, i) => (
        <line
          key={i}
          className="sch-copper"
          x1={sp.x1}
          y1={sp.y1}
          x2={sp.x2}
          y2={sp.y2}
          strokeWidth={spokeW}
        />
      ))}

      {/* Merkez pad */}
      <circle className="sch-copper" cx={cx} cy={cy} r={rPad} />

      {/* Akım yönü: paddan plane'e doğru bir spoke boyunca */}
      <line className="sch-arrow" x1={cx} y1={cy - rPad} x2={cx} y2={cy - rClear - 8} />
      <text className="sch-value" x={cx + 6} y={cy - rClear - 12}>{text.current}</text>

      {/* Etiket sütunu — çizimin sağında */}
      <text className="sch-label" x={222} y={44}>{text.pad}</text>
      <text className="sch-label" x={222} y={76}>{text.clearance}</text>
      <text className="sch-label" x={222} y={108}>{text.gap}</text>
      <text className="sch-label" x={222} y={140}>{text.width}</text>
      <text className="sch-label" x={222} y={172}>{text.spoke}</text>

      {live && (
        <>
          <text className="sch-value" x={222} y={58}>
            {hasPad ? fmtLen(padDiameter) : '—'}
          </text>
          <text className="sch-value" x={222} y={90}>
            {r.results.clearanceDiameter !== null ? fmtLen(r.results.clearanceDiameter) : '—'}
          </text>
          <text className="sch-value" x={222} y={122}>
            {gap !== null ? fmtLen(gap) : '—'}
          </text>
          <text className="sch-value" x={222} y={154}>
            {fmtLen(r.results.widestInnerWidth)}
          </text>
          <text className="sch-value" x={222} y={186}>{count}</text>
        </>
      )}
    </Schematic>
  )
})

export default ThermalReliefSchematic
