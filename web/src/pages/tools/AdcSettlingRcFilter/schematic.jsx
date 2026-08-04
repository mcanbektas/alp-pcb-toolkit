import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'

// ADC giriş eşdeğer devresi: kaynak → seri direnç → (opsiyonel RC filtre) →
// anahtar direnci → sampling kapasitörü (ADC kutusu içinde). Tek hat üzerinde
// soldan sağa, gerilim kaynağı solda, ADC sağda. Ölçüler orantılı değildir;
// gerçek direnç/kapasitans değerleri sonuç tablosunda gösterilir.
//
// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const AdcSettlingSchematic = forwardRef(function AdcSettlingSchematic({ r, text }, ref) {
  const live = r.ok
  const hasFilter = live && r.cutoffFrequency != null

  const y = 60
  const gndY = 130
  const x0 = 16
  const rSourceX = 55
  const rSeriesX = 110
  const filterX = 160
  const rSwitchX = hasFilter ? 210 : 160
  const adcX = rSwitchX + 45
  const adcW = 90
  const csX = adcX + adcW / 2

  const resistor = (cx, label) => (
    <g key={cx}>
      <rect className="sch-part" x={cx - 12} y={y - 6} width={24} height={12} />
      <text className="sch-label" x={cx} y={y - 12} textAnchor="middle">{label}</text>
    </g>
  )

  return (
    <Schematic
      ref={ref}
      viewBox="0 0 340 160"
      title={text.title}
      caption={text.caption}
    >
      {/* Gerilim kaynağı sembolü (basit daire yerine etiketli düğüm) */}
      <circle className="sch-part" cx={x0} cy={y} r={8} />
      <text className="sch-label" x={x0} y={y - 16} textAnchor="middle">{text.source}</text>

      <line className="sch-copper" x1={x0 + 8} y1={y} x2={rSourceX - 12} y2={y} />
      {resistor(rSourceX, 'R_source')}
      <line className="sch-copper" x1={rSourceX + 12} y1={y} x2={rSeriesX - 12} y2={y} />
      {resistor(rSeriesX, text.rSeries)}
      <line
        className="sch-copper"
        x1={rSeriesX + 12} y1={y}
        x2={hasFilter ? filterX - 10 : rSwitchX - 12} y2={y}
      />

      {hasFilter && (
        <>
          <rect className="sch-part" x={filterX - 10} y={y - 6} width={20} height={12} />
          <text className="sch-label" x={filterX} y={y - 12} textAnchor="middle">{text.filter}</text>
          <line className="sch-copper" x1={filterX} y1={y + 6} x2={filterX} y2={gndY - 10} />
          <rect className="sch-part" x={filterX - 10} y={gndY - 10} width={20} height={10} />
          <line className="sch-copper" x1={filterX - 14} y1={gndY} x2={filterX + 14} y2={gndY} />
          <line className="sch-copper" x1={filterX + 10} y1={y} x2={rSwitchX - 12} y2={y} />
        </>
      )}

      {resistor(rSwitchX, text.switchR)}
      <line className="sch-copper" x1={rSwitchX + 12} y1={y} x2={adcX} y2={y} />

      {/* ADC kutusu ve içindeki sampling kapasitörü */}
      <rect className="sch-dielectric" x={adcX} y={y - 30} width={adcW} height={70} />
      <text className="sch-label" x={adcX + adcW / 2} y={y - 36} textAnchor="middle">{text.adc}</text>
      <line className="sch-copper" x1={csX} y1={y + 6} x2={csX} y2={gndY - 10} />
      <rect className="sch-part" x={csX - 10} y={gndY - 10} width={20} height={10} />
      <line className="sch-copper" x1={csX - 14} y1={gndY} x2={csX + 14} y2={gndY} />
      <text className="sch-label" x={csX} y={gndY + 14} textAnchor="middle">{text.cs}</text>
    </Schematic>
  )
})

export default AdcSettlingSchematic
