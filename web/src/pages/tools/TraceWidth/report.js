// Trace genişliği ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.

import { fmt, fmtEng, fmtOhm, fmtVolt, fmtWatt } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { LENGTH } from '../../../lib/units'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, MODE_SYNTHESIS, MODE_ANALYSIS } from './model'

const mm = (m) => m / LENGTH.mm

function inputRows(mode, f, text) {
  return formFields(mode, f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))
}

function toleranceRows(r, text) {
  if (!r.tol) return []

  if (r.mode === MODE_SYNTHESIS) {
    return [
      { label: text.tolSyn.width, value: fmt(mm(r.tol.Wwc_m)), unit: 'mm' },
      { label: text.tolSyn.copper, value: fmt(r.tol.twc_um), unit: 'µm' },
      {
        label: text.tolSyn.capacity,
        value: `${fmt(r.tol.ImaxWc)} A — ${r.tol.sufficient ? text.tolSyn.sufficient : text.tolSyn.insufficient}`,
      },
    ]
  }

  return [
    { label: text.tolAna.capacity, value: `${fmt(r.tol.ImaxMin)} · ${fmt(r.Imax)} · ${fmt(r.tol.ImaxMax)} A` },
    { label: text.tolAna.r20, value: `${fmtOhm(r.tol.R20Min)} · ${fmtOhm(r.e.R20)} · ${fmtOhm(r.tol.R20Max)}` },
  ]
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır,
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg).
function chartSection(r, s, text) {
  if (!s) return null
  const otherLayer = r.layer === 'external' ? 'internal' : 'external'
  // Ekrandaki <ChartDataTable every={5} .../> ile aynı örnekleme kuralı
  // (sampleIndices): son nokta her zaman dahil edilir. Düz `i % 5` filtresi
  // 70 noktalı taramada son satırı (69) düşürüyordu — rapor ekranda görünenden
  // bir satır eksik çıkıyordu.
  return {
    title: text.chart.caption,
    svg: null,
    table: {
      columns: [text.chart.x, text.layerSeries[r.layer], text.layerSeries[otherLayer]],
      rows: sampleIndices(s.rows.length, 5)
        .map((i) => [fmt(s.rows[i].x, 3), fmt(s.rows[i].y, 3), fmt(s.rows[i].other, 3)]),
    },
  }
}

export function buildReportSection({ mode, f, r, s, text }) {
  if (!r.ok) return null

  const big = r.mode === MODE_SYNTHESIS
    ? { label: text.bigResultSyn(r.M), value: fmt(mm(r.Wrec_m)), unit: 'mm', emphasis: true }
    : { label: text.bigResultAna(r.dT), value: fmt(r.Imax), unit: 'A', emphasis: true }

  const results = [
    big,
    { label: text.table.area, value: fmt(r.A_mm2), unit: 'mm²' },
    { label: text.table.r20, ...splitFormatted(fmtOhm(r.e.R20)) },
    { label: text.table.rAvg(r.e.Tavg), ...splitFormatted(fmtOhm(r.e.Ravg)) },
    { label: text.table.rMax(r.e.Tmax), ...splitFormatted(fmtOhm(r.e.Rmax)) },
    { label: text.table.vdropAvg, ...splitFormatted(fmtVolt(r.e.VdropAvg)) },
    { label: text.table.vdropMax, ...splitFormatted(fmtVolt(r.e.VdropMax)) },
    { label: text.table.ploss, ...splitFormatted(fmtWatt(r.e.Ploss)) },
    { label: text.table.perLength, ...splitFormatted(fmtEng(r.e.PperLength, 'W/m', 3)) },
    { label: text.table.j, value: fmt(r.e.J), unit: 'A/mm²' },
    { label: text.table.tmax, value: fmt(r.e.Tmax, 3), unit: '°C' },
    ...toleranceRows(r, text),
  ]

  return {
    toolName: text.title,
    mode: mode === MODE_SYNTHESIS ? text.modeSynthesis : text.modeAnalysis,
    inputs: inputRows(mode, f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: r.layer === 'internal' ? text.schematic.captionInner : text.schematic.captionOuter,
    chart: chartSection(r, s, text),
  }
}
