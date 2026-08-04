// ADC giriş yerleşme süresi ve RC filtre hesaplayıcısı ekranının rapor
// bölümü. Saf: React, DOM, ağ bilmez. Ekranla aynı `r`/`s`/`text` kaynağından
// aynı satırları üretir; ekranla rapor arasındaki kayma riski böylece en aza
// iner.

import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, ACQ_DIRECT } from './model'

function inputRows(f, text) {
  const extra = [
    { label: text.fields.acqMode.label, value: f.acqMode === ACQ_DIRECT ? text.fields.acqDirect : text.fields.acqCycles },
  ]

  return [
    ...extra,
    ...formFields(f, text.fieldLabels)
      .filter((field) => f[field.key] !== '' && f[field.key] != null)
      .map((field) => ({
        label: field.label,
        value: f[field.key],
        unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
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
      rows: indices.map((i) => [fmt(s.rows[i].x, 3), fmt(s.rows[i].y, 6)]),
    },
  }
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  const results = [
    { label: text.bigResultLabel, ...splitFormatted(fmtRes(r.maxEquivalentResistance)), emphasis: true },
    { label: text.table.acquisitionTime, ...splitFormatted(fmtEng(r.acquisitionTime, 's', 4)) },
    { label: text.table.rEq, ...splitFormatted(fmtRes(r.rEq)) },
    { label: text.table.cEq, ...splitFormatted(fmtEng(r.cEq, 'F', 4)) },
    { label: text.table.tau, ...splitFormatted(fmtEng(r.tau, 's', 4)) },
    { label: text.table.requiredSettlingTime, ...splitFormatted(fmtEng(r.requiredSettlingTime, 's', 4)) },
    { label: text.table.settlingMargin, ...splitFormatted(fmtEng(r.settlingMargin, 's', 4)) },
    { label: text.table.relativeError, value: fmt(r.relativeError, 6) },
    { label: text.table.allowedError, value: fmt(r.allowedError, 6) },
    { label: text.table.lsbVoltage, ...splitFormatted(fmtVolt(r.lsbVoltage)) },
    { label: text.table.voltageError, ...splitFormatted(fmtVolt(r.voltageError)) },
    { label: text.table.errorLsb, value: fmt(r.errorLsb, 4) },
    { label: text.table.maxEquivalentResistance, ...splitFormatted(fmtRes(r.maxEquivalentResistance)) },
  ]

  if (r.maxSourceResistance != null) {
    results.push({ label: text.table.maxSourceResistance, ...splitFormatted(fmtRes(r.maxSourceResistance)) })
  }
  if (r.cutoffFrequency != null) {
    results.push({ label: text.table.cutoffFrequency, ...splitFormatted(fmtEng(r.cutoffFrequency, 'Hz', 4)) })
  }
  if (r.filter) {
    results.push({ label: text.table.filterAtten, value: `${fmt(r.filter.attenuationDb, 3)} dB` })
  }
  if (r.capacitorRatio != null) {
    results.push({ label: text.table.capacitorRatio, value: `${fmt(r.capacitorRatio, 3)}×` })
  }
  if (r.droop != null) {
    results.push({ label: text.table.droop, ...splitFormatted(fmtVolt(r.droop)) })
  }
  results.push({ label: text.table.thermalNoise, ...splitFormatted(fmtVolt(r.thermalNoise)) })

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption,
    chart: chartSection(s, text),
  }
}
