import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'

// Kelvin (dört uçlu) bağlantı: akım yolu (kalın iz) shunt'ın DIŞ padlerinden
// geçer; sense hatları (ince iz) shunt'ın İÇ padlerine ayrı olarak bağlanır.
// Kelvin YOKKEN sense hatları akım padinin kendisinden çıkar — ortak bakır
// (pad + iz) akım düşümü ölçüme karışır. Ölçüler orantılı değildir.
//
// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const ShuntKelvinSchematic = forwardRef(function ShuntKelvinSchematic({ r, text }, ref) {
  const live = r.ok
  const kelvin = live ? r.kelvin : true

  const y = 60
  const leftX = 30
  const rightX = 310
  const shuntL = 150
  const shuntR = 190
  const innerL = 160
  const innerR = 180
  const ampY = 120
  const ampX = (innerL + innerR) / 2

  return (
    <Schematic
      ref={ref}
      viewBox="0 0 340 150"
      title={text.title}
      caption={kelvin ? text.captionKelvin : text.captionShared}
    >
      {/* Akım yolu — kalın iz, shunt'ın dış padlerinden geçer */}
      <rect className="sch-copper" x={leftX} y={y - 3} width={shuntL - leftX} height={6} />
      <rect className="sch-part" x={shuntL} y={y - 8} width={shuntR - shuntL} height={16} />
      <rect className="sch-copper" x={shuntR} y={y - 3} width={rightX - shuntR} height={6} />
      <text className="sch-label" x={(shuntL + shuntR) / 2} y={y - 14} textAnchor="middle">{text.shunt}</text>
      <text className="sch-label" x={leftX + 4} y={y + 20}>{text.currentPath}</text>

      {/* İç padler (Kelvin sense noktaları) */}
      <rect className="sch-copper" x={innerL - 3} y={y - 8} width={6} height={4} />
      <rect className="sch-copper" x={innerR - 3} y={y - 8} width={6} height={4} />

      {/* Sense hatları */}
      {kelvin ? (
        <>
          <line className="sch-copper" x1={innerL} y1={y - 6} x2={ampX - 14} y2={ampY - 10} />
          <line className="sch-copper" x1={innerR} y1={y - 6} x2={ampX + 14} y2={ampY - 10} />
        </>
      ) : (
        <>
          <line className="sch-copper sch-dash" x1={shuntL - 10} y1={y} x2={ampX - 14} y2={ampY - 10} />
          <line className="sch-copper sch-dash" x1={shuntR + 10} y1={y} x2={ampX + 14} y2={ampY - 10} />
        </>
      )}

      {/* İki sense etiketi ortalanınca kutuları çakışıyordu (28 px aralık, her
          biri ~40 px): dışa doğru hizalanır, aralarında amp ucu kalır. */}
      <text className="sch-label" x={ampX - 24} y={ampY - 14} textAnchor="end">{text.sensePlus}</text>
      <text className="sch-label" x={ampX + 24} y={ampY - 14} textAnchor="start">{text.senseMinus}</text>

      {/* Amplifikatör */}
      <path
        className="sch-part"
        d={`M${ampX - 24} ${ampY - 18} L${ampX + 24} ${ampY} L${ampX - 24} ${ampY + 18} Z`}
      />
      {/* Üçgen yazıyı taşıyacak kadar büyütüldü: eski ölçüde (36x20) "amp"
          kutusunun köşeleri konturun dışına taşıyordu. */}
      <text className="sch-label" x={ampX - 8} y={ampY} textAnchor="middle" dominantBaseline="middle">
        {text.amp}
      </text>
    </Schematic>
  )
})

export default ShuntKelvinSchematic
