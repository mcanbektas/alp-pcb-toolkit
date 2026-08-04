import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'
import { MODE_CAN } from './model'

// İki uçlu diferansiyel veri yolu: sol ve sağ düğümde terminasyon direnci.
// CAN modunda ortada opsiyonel bir stub dalı; RS-485 modunda sol düğümde
// pull-up/pull-down bias dirençleri. Ölçüler orantılı değildir.
//
// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
// `mode` ayrıca (r'den değil) verilir: hesap geçersizken bile kullanıcının
// seçtiği modu göstermeye devam eder (ReturnPathStitchingVia'daki `live`
// düşüşü deseniyle aynı gerekçe).
const BusSchematic = forwardRef(function BusSchematic({ r, mode, text }, ref) {
  const live = r.ok
  const isCan = mode === MODE_CAN
  const hasSplit = isCan && live && !!r.split
  const hasStub = isCan && live && !!r.stub
  const hasBias = !isCan && live && !!r.bias

  const busY = 70
  const leftX = 40
  const rightX = 300
  const stubX = (leftX + rightX) / 2

  const caption = isCan ? text.captionCan(hasSplit, hasStub) : text.captionRs485

  const termination = (x, align) => (
    hasSplit
      ? (
        <g key={x}>
          <line className="sch-copper" x1={x} y1={busY - 14} x2={x} y2={busY - 2} />
          <rect className="sch-part" x={x - 10} y={busY - 24} width={20} height={10} />
          <line className="sch-copper" x1={x} y1={busY + 14} x2={x} y2={busY + 2} />
          <rect className="sch-part" x={x - 10} y={busY + 14} width={20} height={10} />
          <line className="sch-copper" x1={x} y1={busY - 14} x2={x} y2={busY + 14} />
        </g>
      )
      : (
        <g key={x}>
          <rect className="sch-part" x={align === 'left' ? x : x - 24} y={busY - 20} width={24} height={10} />
        </g>
      )
  )

  return (
    <Schematic
      ref={ref}
      viewBox="0 0 340 160"
      title={text.title}
      caption={caption}
    >
      {/* Diferansiyel çift: A (üst) ve B (alt) hatları */}
      <line className="sch-copper" x1={leftX} y1={busY - 4} x2={rightX} y2={busY - 4} />
      <line className="sch-copper" x1={leftX} y1={busY + 4} x2={rightX} y2={busY + 4} />

      {/* Uç düğümler ve etiketleri */}
      <text className="sch-label" x={leftX} y={busY - 30} textAnchor="middle">{text.nodeA}</text>
      <text className="sch-label" x={rightX} y={busY - 30} textAnchor="middle">{text.nodeB}</text>
      {termination(leftX, 'left')}
      {termination(rightX, 'right')}

      {/* CAN: opsiyonel stub */}
      {hasStub && (
        <>
          <line className="sch-copper sch-dash" x1={stubX} y1={busY + 4} x2={stubX} y2={busY + 40} />
          <text className="sch-label" x={stubX + 8} y={busY + 44}>{text.stub}</text>
        </>
      )}

      {/* RS-485: pull-up / pull-down bias */}
      {!isCan && (
        <>
          <line className="sch-copper" x1={leftX + 40} y1={busY - 4} x2={leftX + 40} y2={busY - 40} />
          <rect className="sch-part" x={leftX + 30} y={busY - 50} width={20} height={10} />
          <text className="sch-label" x={leftX + 40} y={busY - 56} textAnchor="middle">{text.pullUp}</text>
          <text className="sch-value" x={leftX + 40} y={busY - 64} textAnchor="middle">{text.vcc}</text>

          <line className="sch-copper" x1={leftX + 40} y1={busY + 4} x2={leftX + 40} y2={busY + 40} />
          <rect className="sch-part" x={leftX + 30} y={busY + 40} width={20} height={10} />
          <text className="sch-label" x={leftX + 40} y={busY + 64} textAnchor="middle">{text.pullDown}</text>
          <text className="sch-value" x={leftX + 40} y={busY + 72} textAnchor="middle">{text.gnd}</text>
          {hasBias && (
            <circle className="sch-dim" cx={leftX + 40} cy={busY} r={3} />
          )}
        </>
      )}
    </Schematic>
  )
})

export default BusSchematic
