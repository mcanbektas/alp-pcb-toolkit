// RLC rezonans ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`s`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.

import {
  fmt, fmtEng, fmtRes, fmtPct,
} from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, MODE_SYNTHESIS } from './model'

function inputRows(mode, f, text) {
  return formFields(mode, f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))
}

function rlcResults(r, text) {
  const bigLabel = r.mode === MODE_SYNTHESIS
    ? text.big.synthesisLabel
    : text.big.analysisLabel(fmtEng(r.f, 'Hz', 4))
  const bigValue = r.mode === MODE_SYNTHESIS ? fmtEng(r.C, 'F', 4) : fmtRes(r.magnitude, 4)

  const rows = [
    { label: bigLabel, ...splitFormatted(bigValue), emphasis: true },
    { label: text.table.XL, ...splitFormatted(fmtRes(r.XL, 4)) },
    { label: text.table.XC, ...splitFormatted(fmtRes(r.XC, 4)) },
    { label: text.table.X, ...splitFormatted(fmtRes(r.X, 4)) },
    { label: text.table.magnitude, ...splitFormatted(fmtRes(r.magnitude, 4)) },
    { label: text.table.phase, value: fmt(r.phaseDeg, 4), unit: '°' },
    { label: text.table.f0, ...splitFormatted(fmtEng(r.f0, 'Hz', 5)) },
    { label: text.table.Q, value: fmt(r.Q, 4) },
    { label: text.table.BW, ...splitFormatted(fmtEng(r.BW, 'Hz', 4)) },
  ]
  if (r.mode === MODE_SYNTHESIS) {
    rows.push({
      label: text.table.nearestC,
      value: `${fmt(r.nearestC.value, 4)} pF (${text.pct(fmtPct(r.nearestC.errorPct))})`,
    })
  }
  return rows
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır,
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg).
function chartSection(s, text) {
  if (!s) return null
  return {
    title: text.chart.caption,
    svg: null,
    table: {
      // Ekrandaki <ChartDataTable every={6} .../> ile aynı örnekleme kuralı
      // (sampleIndices): son nokta her zaman dahil. 90 noktalı taramada düz
      // `i % 6` filtresi son satırı düşürüyordu.
      columns: [text.chart.x, text.chart.y],
      rows: sampleIndices(s.rows.length, 6).map((i) => [fmtEng(s.rows[i].x, '', 4), fmt(s.rows[i].y, 4)]),
    },
  }
}

export function buildReportSection({ mode, f, r, s, text }) {
  if (!r.ok) return null

  return {
    toolName: text.title,
    mode: text.modeLabel[r.mode],
    inputs: inputRows(mode, f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results: rlcResults(r, text),
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption,
    chart: chartSection(s, text),
  }
}
