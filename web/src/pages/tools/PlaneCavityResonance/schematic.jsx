import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'

// Düzlem çiftinin üstten görünüşü (a × b örtüşen alan, orantılı gösterilir)
// ve kesiti (iki bakır düzlem + aralarındaki dielektrik, kalınlık d). Ölçüler
// orantılı değildir; yalnız b/a oranı üstten görünüşün yüksekliğine yansır.
//
// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const PlaneCavitySchematic = forwardRef(function PlaneCavitySchematic({ r, text }, ref) {
  const live = r.ok

  const rectX = 74
  const rectW = 156
  const rectCy = 50
  // b/a oranı 0.3–3 arasına kırpılır: aşırı ince/uzun bir dikdörtgen şemayı
  // okunaksız yapardı (PowerPlane'deki boyun oranı kırpmasıyla aynı gerekçe).
  const ratio = live ? Math.max(0.3, Math.min(3, r.b / r.a)) : 1
  const rectH = 56 * ratio
  const rectY = rectCy - rectH / 2

  const csX = 74
  const csW = 156
  const barH = 8
  const gapH = 40
  const csTopY = 146
  const csBotY = csTopY + barH + gapH

  return (
    <Schematic
      ref={ref}
      viewBox="0 0 300 226"
      title={text.title}
      caption={text.caption}
    >
      {/* ---------- Üstten görünüş: örtüşen alan a × b ---------- */}
      <rect className="sch-dielectric sch-dash" x={rectX} y={rectY} width={rectW} height={rectH} />

      {/* a ölçüsü (genişlik) */}
      <g className="sch-dim">
        <line x1={rectX} x2={rectX + rectW} y1={10} y2={10} />
        <line x1={rectX} x2={rectX} y1={6} y2={14} />
        <line x1={rectX + rectW} x2={rectX + rectW} y1={6} y2={14} />
      </g>
      <text className="sch-label" x={rectX + rectW / 2} y={24} textAnchor="middle">a</text>
      {live && (
        <text className="sch-value" x={rectX + rectW / 2} y={9} textAnchor="middle">
          {fmtEng(r.a, 'm', 3)}
        </text>
      )}

      {/* b ölçüsü (yükseklik) */}
      <g className="sch-dim">
        <line x1={58} x2={58} y1={rectY} y2={rectY + rectH} />
        <line x1={54} x2={62} y1={rectY} y2={rectY} />
        <line x1={54} x2={62} y1={rectY + rectH} y2={rectY + rectH} />
      </g>
      <text className="sch-label" x={34} y={rectCy + 3} textAnchor="middle">b</text>
      {live && (
        <text className="sch-value" x={40} y={rectY - 4 < 10 ? rectCy - rectH / 2 - 6 : rectY - 4} textAnchor="middle">
          {fmtEng(r.b, 'm', 3)}
        </text>
      )}

      <text className="sch-label dim" x={rectX + rectW - 2} y={rectY + rectH - 4} textAnchor="end">
        {text.topView}
      </text>

      {/* ---------- Kesit: iki bakır düzlem + dielektrik ---------- */}
      <text className="sch-label dim" x={csX} y={csTopY - 8}>{text.crossSection}</text>

      <rect className="sch-copper" x={csX} y={csTopY} width={csW} height={barH} />
      <rect className="sch-dielectric" x={csX} y={csTopY + barH} width={csW} height={gapH} />
      <rect className="sch-copper" x={csX} y={csBotY} width={csW} height={barH} />

      <text className="sch-value" x={csX + csW / 2} y={csTopY + barH + gapH / 2 + 4} textAnchor="middle">
        εr{live ? ` = ${fmtEng(r.epsR, '', 3)}` : ''}
      </text>

      {/* d ölçüsü */}
      <g className="sch-dim">
        <line x1={csX + csW + 16} x2={csX + csW + 16} y1={csTopY} y2={csBotY + barH} />
        <line x1={csX + csW + 12} x2={csX + csW + 20} y1={csTopY} y2={csTopY} />
        <line x1={csX + csW + 12} x2={csX + csW + 20} y1={csBotY + barH} y2={csBotY + barH} />
      </g>
      <text className="sch-label" x={csX + csW + 30} y={csTopY + (barH + gapH + barH) / 2} textAnchor="start">
        d
      </text>
      {live && (
        <text className="sch-value" x={csX + csW + 30} y={csTopY + (barH + gapH + barH) / 2 + 12} textAnchor="start">
          {fmtEng(r.d, 'm', 3)}
        </text>
      )}

      <text className="sch-label" x={csX + csW / 2} y={csBotY + barH + 16} textAnchor="middle">
        {text.pairLabel}
      </text>
      {live && (
        <text className="sch-value" x={csX + csW / 2} y={csBotY + barH + 30} textAnchor="middle">
          C ≈ {fmtEng(r.capacitance, 'F', 3)}
        </text>
      )}
    </Schematic>
  )
})

export default PlaneCavitySchematic
