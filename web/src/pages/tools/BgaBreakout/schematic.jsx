import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'

// Üstten görünüm: 2×2 land, aralarından geçen izler ve dört landin merkezine
// oturan dog-bone via. Çizim girilen değerlere göre parametriktir — pitch,
// land çapı, iz genişliği, açıklık ve via pad çapı ölçekle çarpılır.
//
// Yazıların tamamı `text` prop'undan gelir; renkler tema sınıflarından.
//
// ÖLÇEK — pitch çizim biriminde sabit bir uzunluğa oturtulur, kalan her şey
// aynı ölçekle çizilir. Böylece land/pitch ve iz/boşluk oranları gerçek
// oranlarını korur; ekranda görülen daralma gerçek daralmadır.
const PITCH_PX = 96

const BgaSchematic = forwardRef(function BgaSchematic({ r, text, fmtLen }, ref) {
  const live = r.ok
  const cx = 118
  const cy = 104

  // Tek ölçek: pitch sabit piksel uzunluğa oturur, kalan her şey aynı çarpanla
  // çizilir.
  const s = live ? PITCH_PX / r.engineInput.pitch : 1

  const half = PITCH_PX / 2
  const rLand = live ? (r.engineInput.landDiameter / 2) * s : 22
  const rMask = live ? Math.max(rLand, (r.results.maskOpening / 2) * s) : rLand
  const rVia = live && r.engineInput.viaPadDiameter !== null
    ? (r.engineInput.viaPadDiameter / 2) * s
    : 0

  const centres = [
    [cx - half, cy - half], [cx + half, cy - half],
    [cx - half, cy + half], [cx + half, cy + half],
  ]

  // Koridordan geçen izler: land sıraları arasında, eşit aralıklı.
  const traceW = live ? r.engineInput.traceWidth * s : 6
  const n = live ? r.engineInput.traceCount : 1
  const clearance = live ? r.engineInput.traceClearance * s : 6
  const traces = []
  for (let i = 0; i < n; i += 1) {
    // İlk izin merkezi: sol land kenarı + açıklık + yarım iz
    const start = cx - half + rLand + clearance + traceW / 2
    traces.push(start + i * (traceW + clearance))
  }

  return (
    <Schematic ref={ref} viewBox="0 0 330 224" title={text.title} caption={text.caption}>
      {/* Mask açıklıkları — landin altında, daha geniş halka olarak */}
      {centres.map(([x, y]) => (
        <circle key={`m${x}-${y}`} className="sch-dielectric sch-dash" cx={x} cy={y} r={rMask} />
      ))}

      {/* İzler: iki land sırası arasındaki koridordan geçer */}
      {traces.map((x) => (
        <line
          key={`t${x}`}
          className="sch-copper"
          x1={x}
          y1={cy - half - rLand - 14}
          x2={x}
          y2={cy + half + rLand + 14}
          strokeWidth={Math.max(1, traceW)}
        />
      ))}

      {/* Landler */}
      {centres.map(([x, y]) => (
        <circle key={`l${x}-${y}`} className="sch-copper" cx={x} cy={y} r={rLand} />
      ))}

      {/* Dog-bone via — dört landin geometrik merkezinde */}
      {rVia > 0 && (
        <>
          <line className="sch-copper" x1={cx - half} y1={cy - half} x2={cx} y2={cy} strokeWidth={Math.max(1, traceW)} />
          <circle className="sch-copper-fill" cx={cx} cy={cy} r={rVia} />
          <circle className="sch-hole" cx={cx} cy={cy} r={rVia * 0.5} />
        </>
      )}

      {/* Pitch ölçüsü */}
      <line className="sch-dim" x1={cx - half} y1={cy + half + rLand + 22} x2={cx + half} y2={cy + half + rLand + 22} />
      <text className="sch-label" x={cx} y={cy + half + rLand + 36} textAnchor="middle">{text.pitch}</text>
      {live && (
        <text className="sch-value" x={cx} y={cy + half + rLand + 50} textAnchor="middle">
          {fmtLen(r.engineInput.pitch)}
        </text>
      )}

      {/* Etiket sütunu — çizimin sağında, bakırın üstüne düşmez */}
      <text className="sch-label" x={232} y={40}>{text.land}</text>
      <text className="sch-label" x={232} y={72}>{text.gap}</text>
      <text className="sch-label" x={232} y={104}>{text.trace}</text>
      {rVia > 0 && <text className="sch-label" x={232} y={136}>{text.via}</text>}
      <text className="sch-label" x={232} y={168}>{text.mask}</text>

      {live && (
        <>
          <text className="sch-value" x={232} y={54}>{fmtLen(r.engineInput.landDiameter)}</text>
          <text className="sch-value" x={232} y={86}>{fmtLen(r.results.gap)}</text>
          <text className="sch-value" x={232} y={118}>{fmtLen(r.engineInput.traceWidth)}</text>
          {rVia > 0 && (
            <text className="sch-value" x={232} y={150}>{fmtLen(r.engineInput.viaPadDiameter)}</text>
          )}
          <text className="sch-value" x={232} y={182}>{fmtLen(r.results.maskOpening)}</text>
        </>
      )}
    </Schematic>
  )
})

export default BgaSchematic
