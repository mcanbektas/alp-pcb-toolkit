// Shunt direnci ve Kelvin bağlantı hesaplayıcısı ekranının rapor bölümü.
// Saf: React, DOM, ağ bilmez. Ekranla aynı `r`/`s`/`text` kaynağından aynı
// satırları üretir; ekranla rapor arasındaki kayma riski böylece en aza iner.

import { fmt, fmtVolt, fmtAmp, fmtPow, fmtRes, fmtPct } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, SHUNT_FROM_VSENSE } from './model'

// Yüzde alanları (tolerance, gainTolerance, derating) NumberField'da '%'
// birimiyle gösterilir ama model.js bunları oran (0–1) olarak SI'ye çevirir;
// rapor da aynı '%' birimini göstermeli, yoksa ekranla rapor ayrışır.
const PCT_FIELDS = new Set(['tolerance', 'gainTolerance', 'derating'])

function inputRows(f, text) {
  const extra = [
    {
      label: text.fields.shuntMode.label,
      value: f.shuntMode === SHUNT_FROM_VSENSE ? text.fields.shuntFromVsense : text.fields.shuntDirect,
    },
    { label: text.fields.kelvinCheck, value: f.kelvin ? '✓' : '—' },
  ]

  return [
    ...extra,
    ...formFields(f, text.fieldLabels)
      .filter((field) => f[field.key] !== '' && f[field.key] != null)
      .map((field) => ({
        label: field.label,
        value: f[field.key],
        unit: field.unitKey ? f[field.unitKey] : (PCT_FIELDS.has(field.key) ? '%' : (field.unit ?? null)),
      })),
  ]
}

function chartSection(s, text) {
  if (!s) return null
  const indices = sampleIndices(s.rows.length, 8)
  return {
    title: text.sweepCaption[s.param],
    svg: null,
    table: {
      columns: [text.sweepAxis[s.param], text.sweepLabel[s.param]],
      rows: indices.map((i) => [fmt(s.rows[i].x, 3), fmt(s.rows[i].y, 5)]),
    },
  }
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  const results = [
    { label: text.bigResultLabel, ...splitFormatted(fmtRes(r.shunt)), emphasis: true },
    { label: text.table.senseVoltageFs, ...splitFormatted(fmtVolt(r.senseVoltageFs)) },
    { label: text.table.power, ...splitFormatted(fmtPow(r.power)) },
  ]

  if (r.peakPower != null) {
    results.push({ label: text.table.peakPower, ...splitFormatted(fmtPow(r.peakPower)) })
  }
  if (r.powerMargin != null) {
    results.push({ label: text.table.powerMargin, value: `${fmt(r.powerMargin, 4)}×` })
  }
  if (r.temperatureRise != null) {
    results.push(
      { label: text.table.temperatureRise, value: `${fmt(r.temperatureRise, 3)} °C` },
      { label: text.table.temperature, value: `${fmt(r.temperature, 3)} °C` },
    )
  }

  results.push(
    { label: text.table.resistanceHot, ...splitFormatted(fmtRes(r.resistanceHot)) },
    { label: text.table.tcrErrorRow, value: text.pct(fmtPct(r.tcrError * 100, 4)) },
    { label: text.table.amplifierOutputFs, ...splitFormatted(fmtVolt(r.amplifierOutputFs)) },
    { label: text.table.offsetCurrentError, ...splitFormatted(fmtAmp(r.offsetCurrentError)) },
  )

  if (r.currentResolution != null) {
    results.push({ label: text.table.currentResolution, ...splitFormatted(fmtAmp(r.currentResolution)) })
  }
  if (r.currentResolutionEnob != null) {
    results.push({ label: text.table.currentResolutionEnob, ...splitFormatted(fmtAmp(r.currentResolutionEnob)) })
  }

  results.push(
    { label: text.table.sharedError, value: text.pct(fmt(r.sharedError * 100, 4)) },
    { label: text.table.offsetError, value: text.pct(fmt(r.offsetError * 100, 4)) },
    { label: text.table.worstCaseError, value: text.pct(fmt(r.worstCaseError * 100, 4)) },
    { label: text.table.rssError, value: text.pct(fmt(r.rssError * 100, 4)) },
  )

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: r.kelvin ? text.schematic.captionKelvin : text.schematic.captionShared,
    chart: chartSection(s, text),
  }
}
