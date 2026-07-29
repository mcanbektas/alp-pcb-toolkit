// Thermal relief ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// Ekranla aynı `r`/`s`/`text` kaynağından aynı satırları üretir.

import { fmt, fmtEng } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, SWEEP_COUNT, SWEEP_THICKNESS, METRIC_RESISTANCE, METRIC_VOLTAGE, METRIC_DENSITY } from './model'

const asMm = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${fmt(v * 1e3, 4)} mm`)
const asKW = (v) => (v === null || !Number.isFinite(v) ? '—' : `${fmt(v, 4)} K/W`)
const asDensity = (v) => (v === null || !Number.isFinite(v) ? '—' : `${fmt(v / 1e6, 4)} A/mm²`)

// model.js'in adet alanı SI tablosunun anahtarı olarak sabit 'adet' taşır;
// ekranda gösterilen birim `text.countUnit`'ten gelir. Rapor da aynı kaynaktan
// okur, yoksa İngilizce raporda çıplak 'adet' çıkar.
const COUNT_KEY = 'adet'

function inputRows(f, text) {
  return formFields(f.spokeMode, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey
        ? f[field.unitKey]
        : (field.unit === COUNT_KEY ? text.countUnit : field.unit ?? null),
    }))
}

// Grafikte çizilen ölçü ekrandakiyle aynı birime çevrilir; farklı birimdeki
// büyüklükler tek eksene zorlanmaz, o yüzden tablo da tek ölçü taşır.
function metricValue(metric, value) {
  if (metric === METRIC_RESISTANCE || metric === METRIC_VOLTAGE) return value * 1e3
  if (metric === METRIC_DENSITY) return value / 1e6
  return value
}

function chartSection(r, s, metric, text) {
  if (!s) return null
  const indices = sampleIndices(s.rows.length, 4)
  const formatX = (x) => {
    // Spoke sayısı tam sayıdır: `fmt` anlamlı basamak alır ve sıfır basamak
    // geçersizdir (toPrecision(0) hata verir). Sayı doğrudan basılır.
    if (s.sweep === SWEEP_COUNT) return String(Math.round(x))
    if (s.sweep === SWEEP_THICKNESS) return fmt(x * 1e6, 3)
    return fmt(x * 1e3, 3)
  }
  return {
    title: text.chart.caption,
    svg: null,
    table: {
      columns: [text.chart.axis[s.sweep], text.chart.yAxis[metric]],
      rows: indices.map((i) => [
        formatX(s.rows[i].x),
        fmt(metricValue(metric, s.rows[i][metric]), 4),
      ]),
    },
  }
}

// Spoke başına satırlar rapora girer: dengesiz paylaşımda belirleyici olan
// en yüksek akımı taşıyan spokedir ve bu ancak satır satır görünür.
function spokeRows(r, text) {
  return r.spokes.map((sp, i) => ({
    label: `${text.spokeTable.index} ${i + 1} — ${asMm(sp.minWidth)}`,
    value: `${fmtEng(sp.current, 'A', 4)} · ${asDensity(sp.currentDensity)}`,
  }))
}

function checkRows(rows, dfm) {
  return rows.map((row) => ({
    label: `${row.label} — ${dfm.statusLabel(row.status)}`,
    value: row.status === 'unknown' ? row.reason : `${row.actual} / ${row.required}`,
  }))
}

export function buildReportSection({ f, r, s, metric = METRIC_RESISTANCE, text, dfm, rows = [] }) {
  if (!r.ok) return null

  const results = [
    {
      label: text.table.parallelResistance,
      ...splitFormatted(fmtEng(r.results.parallelResistance, 'Ω', 4)),
      emphasis: true,
    },
    { label: text.table.singleResistance, ...splitFormatted(fmtEng(r.results.singleResistance, 'Ω', 4)) },
    { label: text.table.maxSpokeCurrent, ...splitFormatted(fmtEng(r.results.maxSpokeCurrent, 'A', 4)) },
    { label: text.table.voltageDrop, ...splitFormatted(fmtEng(r.results.voltageDrop, 'V', 4)) },
    { label: text.table.powerTotal, ...splitFormatted(fmtEng(r.results.powerTotal, 'W', 4)) },
    { label: text.table.powerCheck, ...splitFormatted(fmtEng(r.results.powerFromEquivalent, 'W', 4)) },
    { label: text.table.totalArea, value: fmt(r.results.totalArea * 1e6, 4), unit: 'mm²' },
    { label: text.table.averageDensity, value: asDensity(r.results.averageCurrentDensity) },
    { label: text.table.maxDensity, value: asDensity(r.results.maxLocalCurrentDensity) },
    { label: text.table.singleThermal, value: asKW(r.results.singleThermalResistance) },
    { label: text.table.thermalResistance, value: asKW(r.results.thermalResistance) },
    { label: text.table.thermalConductance, value: fmt(r.results.thermalConductance, 5), unit: 'W/K' },
    {
      label: text.table.heatFlow,
      ...(r.results.heatFlow === null
        ? { value: text.table.notEntered }
        : splitFormatted(fmtEng(r.results.heatFlow, 'W', 4))),
    },
    { label: text.table.thermalGap, value: asMm(r.results.thermalGap) },
    { label: text.table.clearanceDiameter, value: asMm(r.results.clearanceDiameter) },
    { label: text.table.spokeLength, value: asMm(r.results.spokeLength) },
    { label: text.table.overlapLimit, value: asMm(r.results.overlapLimit) },
    {
      label: text.table.bridgeFraction,
      value: r.results.bridgeFraction === null ? '—' : fmt(r.results.bridgeFraction * 100, 3),
      unit: r.results.bridgeFraction === null ? null : '%',
    },
    { label: text.table.k, value: fmt(r.results.k, 3), unit: 'W/(m·K)' },
  ]

  return {
    toolName: text.title,
    mode: text.spokeMode[r.spokeMode],
    inputs: inputRows(f, text),
    formula: [
      text.formula.title,
      ...text.formula.body.split('\n').map((line) => line.trim()).filter(Boolean),
    ],
    results: [...results, ...spokeRows(r, text), ...checkRows(rows, dfm)],
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption,
    chart: chartSection(r, s, metric, text),
  }
}
