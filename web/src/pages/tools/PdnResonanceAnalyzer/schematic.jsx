import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'

// PDN ağı: VRM, kondansatör grupları ve plane kolu; hat (üst) ile referans
// (alt) arasında paralel bağlanır (REV2 §10.1 "VRM + kondansatör grupları +
// plane kolunu birlikte ... çözer"). Ölçüler orantılı değildir — gerçek bir
// yerleşim değil, kavramsal bir ağ şemasıdır.
//
// Yalnızca ETKİN kollar çizilir (ReturnPathStitchingVia'nın kondansatör
// glifini `hasCapacitor` kapısıyla çizmesiyle aynı gerekçe) — kapalı bir kol
// solgun/hayalet biçimde göstermek stil kuralına (yalnız tema sınıfları,
// literal renk/inline stil yok) yeni bir görsel durum açardı.
//
// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const MAX_SHOWN = 4

const PdnResonanceSchematic = forwardRef(function PdnResonanceSchematic({ r, text }, ref) {
  const live = r.ok
  const hasVrm = live && r.hasVrm
  const hasPlane = live && r.hasPlane
  const groups = live ? r.capGroups.slice(0, MAX_SHOWN) : [{ label: null }, { label: null }]
  const hiddenCount = live ? Math.max(0, r.capGroups.length - MAX_SHOWN) : 0

  const railY = 30
  const gndY = 134
  const left = 20
  const right = 280

  const slots = []
  if (hasVrm) slots.push({ kind: 'vrm' })
  groups.forEach((g, i) => slots.push({ kind: 'cap', group: g, index: i }))
  if (hasPlane) slots.push({ kind: 'plane' })
  if (slots.length === 0) slots.push({ kind: 'cap', group: { label: null }, index: 0 })

  const n = slots.length
  const span = right - left
  // Kutu etikete göre genişler ama komşu kola değmez: dar kutuda uzun etiket
  // (plane, MLCC) kutunun kenar çizgisini kesiyordu.
  const boxW = (label) => Math.min(
    Math.max(30, String(label).length * 7 + 10),
    span / (n + 1) - 8,
  )
  const xs = slots.map((_, i) => left + (span * (i + 1)) / (n + 1))

  return (
    <Schematic ref={ref} viewBox="0 0 300 164" title={text.title} caption={text.caption}>
      {/* Hat ve referans düzlemi */}
      <rect className="sch-copper" x={left} y={railY - 2} width={right - left} height={4} />
      <rect className="sch-copper" x={left} y={gndY - 2} width={right - left} height={4} />
      {/* Hat etiketi SAĞ uçtadır: ölçüm noktası yazısı (iki dilde de 18–22
          karakter) sol üst köşeyi tümüyle dolduruyor, ortalanmış hâlde hem
          viewBox'ın soluna hem üstüne taşıyordu. Yazı artık ölçü çizgisinin
          sağından başlar, hat etiketi karşı uca alındı. */}
      <text className="sch-label" x={right} y={railY - 10} textAnchor="end">{text.rail}</text>

      {/* Z(f) ölçüm noktası — sol uçta, ilk koldan önce */}
      <g className="sch-dim">
        <line x1={left + 4} x2={left + 4} y1={railY} y2={railY - 20} />
      </g>
      <text className="sch-value" x={left + 10} y={railY - 12}>{text.probe}</text>

      {slots.map((slot, i) => {
        const x = xs[i]
        const label = slot.kind === 'vrm'
          ? text.vrm
          : slot.kind === 'plane'
            ? text.plane
            : (slot.group?.label || `C${slot.index + 1}`)
        return (
          <g key={`${slot.kind}-${slot.index ?? 0}`}>
            <rect className="sch-copper" x={x - 1} y={railY} width={2} height={16} />
            <rect className="sch-part" x={x - boxW(label) / 2} y={railY + 16} width={boxW(label)} height={20} rx={2} />
            <rect className="sch-copper" x={x - 1} y={railY + 36} width={2} height={gndY - railY - 36} />
            {/* Etiket parça KUTUSUNUN İÇİNDE: rayla kutu arasındaki 16 px'lik
                boşluğu dikey bakır çubuk dolduruyor, oraya yazılan etiket
                çubuğun üstüne biniyordu. */}
            <text className="sch-label" x={x} y={railY + 30} textAnchor="middle">{label}</text>
          </g>
        )
      })}

      {hiddenCount > 0 && (
        <text className="sch-value" x={right - 4} y={gndY + 16} textAnchor="end">
          {text.moreGroups(hiddenCount)}
        </text>
      )}
    </Schematic>
  )
})

export default PdnResonanceSchematic
