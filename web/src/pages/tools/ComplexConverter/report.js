// Kompleks sayı dönüştürücü ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.

import { fmt, fmtOhm } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, MODE_RECT, SWEEP_PHASE } from './model'

function inputRows(f, text) {
  return formFields(f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))
}

// "Ters dönüşüm kontrolü" alt tablosu — yalnızca r.check doluyken ekranda
// görünür, aynı koşulla burada da eklenir. Satır etiketleri index.jsx'teki
// gibi çevrilmemiş matematik ifadeleridir (iki dilde de aynı yazılır).
function checkRows(r) {
  if (!r.check) return []
  return [
    { label: 'R = |Z|·cos φ', ...splitFormatted(fmtOhm(r.check.R)) },
    { label: 'X = |Z|·sin φ', ...splitFormatted(fmtOhm(r.check.X)) },
    { label: '|Z| = √(R² + X²)', ...splitFormatted(fmtOhm(r.check.magnitude)) },
    { label: 'φ = atan2(X, R)', value: fmt(r.check.phaseDeg, 5), unit: '°' },
  ]
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır,
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg).
function chartSection(r, s, text) {
  if (!s) return null
  const formatY = (v) => (s.param === SWEEP_PHASE ? `${fmt(v, 3)}°` : fmtOhm(v))
  // Ekrandaki <ChartDataTable every={10}> ile birebir aynı örnekleme: modülüs
  // ıskalasa bile son indeks (eğrinin sağ ucu) her zaman eklenir. Kural
  // LineChart.jsx'teki `sampleIndices`'te tek kopya durur — ekran ile rapor
  // aynı fonksiyonu çağırır, kural iki yerde ayrı ayrı yazılmaz.
  const indices = sampleIndices(s.rows.length, 10)
  return {
    title: text.chart.caption[s.param],
    svg: null,
    table: {
      columns: [text.chart.x, text.chart.series[s.param]],
      rows: indices.map((i) => [fmtOhm(s.rows[i].x), formatY(s.rows[i].y)]),
    },
  }
}

export function buildReportSection({ mode, f, r, s, text }) {
  if (!r.ok) return null

  // Büyük sonuç kutusu: girilen biçim değil, ÜRETİLEN biçim yazılır — index.jsx
  // ile birebir aynı dallanma.
  const big = {
    label: text.bigLabel[r.mode],
    value: r.mode === MODE_RECT
      ? text.polarText(r.magnitude, r.phaseDeg)
      : text.rectText(r.R, r.X),
    unit: null,
    emphasis: true,
  }

  const results = [
    big,
    { label: text.table.real, ...splitFormatted(fmtOhm(r.R)) },
    { label: text.table.imag, value: `${fmtOhm(r.X)} (${text.kindLabel[r.kind]})` },
    { label: text.table.notation, value: text.rectText(r.R, r.X) },
    { label: text.table.magnitude, ...splitFormatted(fmtOhm(r.magnitude)) },
    { label: text.table.phaseDeg, value: fmt(r.phaseDeg, 5), unit: '°' },
    { label: text.table.phaseRad, value: fmt(r.phase, 5), unit: 'rad' },
    { label: text.table.notation, value: text.polarText(r.magnitude, r.phaseDeg) },
    { label: text.table.quadrant, value: text.quadrantLabel[r.quadrant] },
    ...(r.wrapped
      ? [{
        label: text.table.entered,
        value: `${fmt(r.phaseEnteredDeg, 6)}° (${text.table.enteredSub})`,
      }]
      : []),
    ...checkRows(r),
  ]

  return {
    toolName: text.title,
    mode: text.modeLabel[mode],
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: r.X > 0
      ? text.schematic.captionInductive
      : r.X < 0
        ? text.schematic.captionCapacitive
        : text.schematic.captionResistive,
    chart: chartSection(r, s, text),
  }
}
