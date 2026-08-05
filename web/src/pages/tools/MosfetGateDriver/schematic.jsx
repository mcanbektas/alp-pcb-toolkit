import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'
import { fmtRes } from '../../../lib/num'

// Ayrık turn-on / turn-off gate direnci ağı: sürücü çıkışı iki paralel dala
// ayrılır (turn-on diyot + R_ext,on ; turn-off diyot + R_ext,off), gate
// düğümünde birleşir. MOSFET basitleştirilmiş sembolle (dikey gate hattı +
// kanal çubuğu + D/S uçları) çizilir. Ölçüler orantılı değildir.
//
// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const GateDriverSchematic = forwardRef(function GateDriverSchematic({ r, text }, ref) {
  const live = r.ok

  const driverX = 30
  const driverY = 70
  const driverW = 50
  const driverH = 44
  const outX = driverX + driverW
  const outY = driverY + driverH / 2
  const splitX = outX + 24
  const mergeX = splitX + 70
  const gateY1 = outY - 26
  const gateY2 = outY + 26
  const mosfetX = mergeX + 30

  return (
    <Schematic
      ref={ref}
      viewBox="0 0 320 200"
      title={text.title}
      caption={text.caption}
    >
      {/* Sürücü kutusu */}
      <rect className="sch-part" x={driverX} y={driverY} width={driverW} height={driverH} rx={3} />
      <text className="sch-label" x={driverX + driverW / 2} y={driverY + driverH / 2} textAnchor="middle" dominantBaseline="middle">
        {text.driver}
      </text>

      {/* Çıkıştan ayrım noktasına */}
      <line className="sch-copper" x1={outX} y1={outY} x2={splitX} y2={outY} />

      {/* Turn-on dalı (üst) */}
      <path className="sch-copper" d={`M${splitX} ${outY} L${splitX} ${gateY1} L${splitX + 20} ${gateY1}`} />
      <rect className="sch-part" x={splitX + 20} y={gateY1 - 6} width={30} height={12} />
      <text className="sch-label" x={splitX + 35} y={gateY1 - 10} textAnchor="middle">{text.on}</text>
      {live && (
        <text className="sch-value" x={splitX + 35} y={gateY1 + 20} textAnchor="middle">
          {fmtRes(r.rExtOnInput)}
        </text>
      )}
      <path className="sch-copper" d={`M${splitX + 50} ${gateY1} L${mergeX} ${gateY1} L${mergeX} ${outY}`} />

      {/* Turn-off dalı (alt) */}
      <path className="sch-copper" d={`M${splitX} ${outY} L${splitX} ${gateY2} L${splitX + 20} ${gateY2}`} />
      <rect className="sch-part" x={splitX + 20} y={gateY2 - 6} width={30} height={12} />
      <text className="sch-label" x={splitX + 35} y={gateY2 + 20} textAnchor="middle">{text.off}</text>
      {live && (
        <text className="sch-value" x={splitX + 35} y={gateY2 + 35} textAnchor="middle">
          {fmtRes(r.rExtOffInput)}
        </text>
      )}
      <path className="sch-copper" d={`M${splitX + 50} ${gateY2} L${mergeX} ${gateY2} L${mergeX} ${outY}`} />

      {/* Gate düğümünden MOSFET'e */}
      <line className="sch-copper" x1={mergeX} y1={outY} x2={mosfetX} y2={outY} />
      <text className="sch-label" x={(mergeX + mosfetX) / 2} y={outY - 8} textAnchor="middle">{text.gate}</text>

      {/* MOSFET basit sembolü: kanal çubuğu + D/S uçları */}
      <rect className="sch-copper" x={mosfetX} y={outY - 24} width={4} height={48} />
      <line className="sch-copper" x1={mosfetX + 4} y1={outY - 18} x2={mosfetX + 24} y2={outY - 18} />
      <line className="sch-copper" x1={mosfetX + 24} y1={outY - 18} x2={mosfetX + 24} y2={driverY - 10} />
      <line className="sch-copper" x1={mosfetX + 4} y1={outY + 18} x2={mosfetX + 24} y2={outY + 18} />
      <line className="sch-copper" x1={mosfetX + 24} y1={outY + 18} x2={mosfetX + 24} y2={driverY + driverH + 10} />
      <text className="sch-label" x={mosfetX + 30} y={driverY - 10} textAnchor="start">{text.drain}</text>
      <text className="sch-label" x={mosfetX + 30} y={driverY + driverH + 10} textAnchor="start">{text.source}</text>
      <text className="sch-label" x={mosfetX + 4} y={outY + 40} textAnchor="middle">{text.mosfet}</text>
    </Schematic>
  )
})

export default GateDriverSchematic
