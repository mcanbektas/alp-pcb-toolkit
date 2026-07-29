// Tek uçlu empedans ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.

import { fmt, fmtEng, fmtRes } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { formFields, MODE_SYNTHESIS } from './model'

function inputRows(mode, f, text) {
  return formFields(f, mode, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır,
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg).
function chartSection(r, s, text) {
  if (!s) return null
  return {
    title: text.chart.caption,
    svg: null,
    table: {
      columns: [text.chart.x, text.chart.y],
      rows: s.rows.filter((_, i) => i % 6 === 0).map((row) => [fmt(row.x, 4), fmtRes(row.y, 4)]),
    },
  }
}

export function buildReportSection({ mode, f, r, s, text }) {
  if (!r.ok) return null

  const big = r.mode === MODE_SYNTHESIS
    ? { label: text.bigResultWidth, ...splitFormatted(fmtEng(r.W, 'm', 4)), emphasis: true }
    : { label: text.bigResultZ0, ...splitFormatted(fmtRes(r.Z0, 4)), emphasis: true }

  const results = [
    big,
    ...(r.tolerance
      ? [{
        label: text.table.tolWindow,
        value: `${fmtRes(r.tolerance.min, 4)} · ${fmtRes(r.tolerance.nom, 4)} · ${fmtRes(r.tolerance.max, 4)}`,
      }]
      : []),
    { label: text.table.z0, ...splitFormatted(fmtRes(r.Z0, 5)) },
    { label: text.table.epsEff, value: fmt(r.epsEff, 5) },
    { label: text.table.tpd, value: fmt(r.tpdPsPerMm, 4), unit: 'ps/mm' },
    { label: text.table.vp, value: fmt((1 / r.tpdPsPerMm) * 1000, 4), unit: 'mm/ns' },
    { label: text.table.W, ...splitFormatted(fmtEng(r.W, 'm', 5)) },
    { label: text.table.height, ...splitFormatted(fmtEng(r.height, 'm', 5)) },
    ...(r.u != null ? [{ label: text.table.u, value: fmt(r.u, 4) }] : []),
    ...(r.k != null ? [{ label: text.table.k, value: fmt(r.k, 5) }] : []),
    { label: text.table.model, value: r.model },
  ]

  return {
    toolName: text.title,
    mode: r.mode === MODE_SYNTHESIS ? text.modeSynthesis : text.modeAnalysis,
    inputs: inputRows(mode, f, text),
    formula: text.formula[f.structure].split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption[r.structure],
    chart: chartSection(r, s, text),
  }
}
