// Stack-up planlayıcı ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// Ekranla aynı `r`/`s`/`text` kaynağından aynı satırları üretir.

import { fmt } from '../../../lib/num'
import { sampleIndices } from '../../../components/LineChart'
import { scalarFields, SWEEP_TOLERANCE } from './model'

const asMm = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${fmt(v * 1e3, 4)} mm`)
const asNum = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : fmt(v, 4))

function inputRows(f, text) {
  const scalars = scalarFields(text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))

  // Katmanlar rapora satır satır girer: dizilim raporun asıl konusudur ve
  // yalnızca toplamı yazmak, üreticiye gönderilecek bir belge için yetmez.
  const layers = f.layers.map((row, i) => ({
    label: `${text.layers.rowLabel} ${i + 1} — ${text.layerTypeLabel(row.type)}`
      + (row.name !== '' ? ` (${row.name})` : ''),
    value: row.thickness,
    unit: row.thicknessU,
  }))

  return [...scalars, ...layers]
}

function chartSection(r, s, text) {
  if (!s) return null
  const indices = sampleIndices(s.rows.length, 4)
  const isTolerance = s.sweep === SWEEP_TOLERANCE
  return {
    title: isTolerance ? text.chart.captionTolerance : text.chart.captionLayer,
    svg: null,
    table: {
      columns: isTolerance
        ? [text.chart.xTolerance, text.chart.seriesMin, text.chart.seriesMax]
        : [text.chart.xLayer, text.chart.seriesNominal],
      rows: indices.map((i) => (isTolerance
        ? [
          fmt(s.rows[i].x, 3),
          fmt(s.rows[i].yMin * 1e3, 4),
          fmt(s.rows[i].yMax * 1e3, 4),
        ]
        : [fmt(s.rows[i].x * 1e3, 3), fmt(s.rows[i].y * 1e3, 4)])),
    },
  }
}

// Sinyal katmanlarının referans mesafeleri rapora girer: kontrollü empedans
// kararı bu iki sayıya (H ya da H1/H2) dayanır.
function signalRows(r, text) {
  return r.signals.map((sg) => ({
    label: `${sg.name !== '' && sg.name != null ? sg.name : `${text.signals.layer} ${sg.index + 1}`}`
      + ` — ${sg.outer ? text.signals.outer : text.signals.inner}`,
    value: !sg.hasReference
      ? text.signals.none
      : (sg.outer
        ? `${text.signals.H} ${asMm(sg.H)}`
        : `${text.signals.H1} ${asMm(sg.H1)} · ${text.signals.H2} ${asMm(sg.H2)}`),
  }))
}

function checkRows(rows, dfm) {
  return rows.map((row) => ({
    label: `${row.label} — ${dfm.statusLabel(row.status)}`,
    value: row.status === 'unknown' ? row.reason : `${row.actual} / ${row.required}`,
  }))
}

export function buildReportSection({ f, r, s, text, dfm, rows = [] }) {
  if (!r.ok) return null

  const results = [
    { label: text.table.finishedTotal, value: asMm(r.results.finishedTotal), emphasis: true },
    { label: text.table.dielectricTotal, value: asMm(r.results.dielectricTotal) },
    { label: text.table.copperTotal, value: asMm(r.results.copperTotal) },
    { label: text.table.surfaceTotal, value: asMm(r.results.surfaceTotal) },
    { label: text.table.totalMin, value: asMm(r.results.totalMin) },
    { label: text.table.totalNominal, value: asMm(r.results.totalNominal) },
    { label: text.table.totalMax, value: asMm(r.results.totalMax) },
    { label: text.table.copperCount, value: String(r.results.copperCount) },
    { label: text.table.layerCount, value: String(r.results.layerCount) },
    { label: text.table.symmetryMax, value: fmt(r.results.symmetryMax * 100, 3), unit: '%' },
    { label: text.table.symmetryWeighted, value: fmt(r.results.symmetryWeighted * 100, 3), unit: '%' },
    {
      label: text.table.copperBalance,
      value: r.results.copperBalance === null ? '—' : fmt(r.results.copperBalance, 3),
      unit: r.results.copperBalance === null ? null : '%',
    },
    { label: text.table.achievableAspect, value: asNum(r.results.achievableAspect) },
  ]

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: [
      text.formula.title,
      ...text.formula.body.split('\n').map((line) => line.trim()).filter(Boolean),
    ],
    results: [...results, ...signalRows(r, text), ...checkRows(rows, dfm)],
    notes: text.commentary(r, asMm),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption,
    chart: chartSection(r, s, text),
  }
}
