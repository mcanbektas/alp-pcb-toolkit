// Clearance/creepage/padstack ekranının rapor bölümü. Saf: React, DOM, ağ
// bilmez. Ekranla aynı `r`/`s`/`text` kaynağından aynı satırları üretir;
// ekranla rapor arasındaki kayma riski böylece en aza iner.

import { fmt } from '../../../lib/num'
import { sampleIndices } from '../../../components/LineChart'
import {
  formFields, TAB_PADSTACK, TAB_CLEARANCE, MODE_SYNTHESIS, SWEEP_ALTITUDE,
} from './model'

// Ekranla birebir aynı biçimlendirme: SI (m) → mm, dört anlamlı basamak.
const asMm = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${fmt(v * 1e3, 4)} mm`)

function inputRows(tab, mode, f, text) {
  return formFields(tab, mode, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))
}

function chartSection(r, s, text) {
  if (!s) return null
  const isDistance = r.tab !== TAB_PADSTACK
  const indices = sampleIndices(s.rows.length, 4)
  const xLabel = isDistance
    ? (s.sweep === SWEEP_ALTITUDE ? text.chart.xAltitude : text.chart.xVoltage)
    : text.chart.xTolerance
  return {
    title: isDistance ? text.chart.captionStep : text.chart.captionRing,
    svg: null,
    table: {
      columns: [xLabel, isDistance ? text.chart.yDistance : text.chart.yRing],
      rows: indices.map((i) => [
        isDistance ? fmt(s.rows[i].x, 4) : fmt(s.rows[i].x * 1e3, 3),
        fmt(s.rows[i].y * 1e3, 4),
      ]),
    },
  }
}

function resultRows(r, text) {
  if (r.tab === TAB_PADSTACK) {
    return [
      { label: text.table.Ddrill, value: asMm(r.results.Ddrill), emphasis: true },
      { label: text.table.drillRange, value: `${asMm(r.results.DdrillMin)} … ${asMm(r.results.DdrillMax)}` },
      { label: text.table.Dfinished, value: asMm(r.results.Dfinished) },
      { label: text.table.Dpad, value: asMm(r.results.Dpad) },
      { label: text.table.padRange, value: `${asMm(r.results.DpadMin)} … ${asMm(r.results.DpadMax)}` },
      { label: text.table.ringNominal, value: asMm(r.results.ringNominal) },
      { label: text.table.ringWorst, value: asMm(r.results.ringWorst) },
      { label: text.table.Dantipad, value: asMm(r.results.Dantipad) },
      { label: text.table.Dmask, value: asMm(r.results.Dmask) },
      { label: text.table.maskWeb, value: asMm(r.results.maskWeb) },
      { label: text.table.copperGap, value: asMm(r.results.copperGap) },
      { label: text.table.holeGap, value: asMm(r.results.holeGap) },
      {
        label: text.table.aspectRatio,
        value: r.results.aspectRatio === null ? '—' : fmt(r.results.aspectRatio, 3),
      },
    ]
  }

  return [
    { label: text.table.required, value: asMm(r.required), emphasis: true },
    { label: text.table.base, value: asMm(r.baseDistance) },
    { label: text.table.factor, value: r.factor === null ? '—' : fmt(r.factor, 4) },
    { label: text.table.corrected, value: asMm(r.correctedDistance) },
    { label: text.table.fab, value: asMm(r.fabMinimum) },
    { label: text.table.user, value: asMm(r.userMinimum) },
    { label: text.table.actual, value: asMm(r.actual) },
    { label: text.table.margin, value: asMm(r.margin) },
    { label: text.table.marginPct, value: fmt(r.marginPercent, 3) },
    { label: text.table.matched, value: String(r.matchedRuleCount) },
  ]
}

// Kontroller rapora da girer: geçen, uyarı veren ve **değerlendirilemeyen**
// kontroller birlikte görünmezse rapor okuyan kişi ölçülmemiş olanı ölçülmüş
// sanar.
function checkRows(rows, dfm) {
  return rows.map((row) => ({
    label: `${row.label} — ${dfm.statusLabel(row.status)}`,
    value: row.status === 'unknown' ? row.reason : `${row.actual} / ${row.required}`,
  }))
}

export function buildReportSection({ tab, mode, f, r, s, text, dfm, rows = [] }) {
  if (!r.ok) return null

  const formulaBlock = r.tab === TAB_PADSTACK ? text.formulas.padstack
    : r.tab === TAB_CLEARANCE ? text.formulas.clearance
      : text.formulas.creepage

  const modeLabel = r.tab === TAB_PADSTACK
    ? `${text.tabs.padstack} — ${mode === MODE_SYNTHESIS ? text.modeSynthesis : text.modeAnalysis}`
    : text.tabs[r.tab]

  return {
    toolName: text.title,
    mode: modeLabel,
    inputs: inputRows(tab, mode, f, text),
    formula: [
      formulaBlock.title,
      ...formulaBlock.body.split('\n').map((line) => line.trim()).filter(Boolean),
    ],
    results: [...resultRows(r, text), ...checkRows(rows, dfm)],
    notes: text.commentary(r, asMm),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption,
    chart: chartSection(r, s, text),
  }
}
