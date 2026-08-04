// CAN ve RS-485 fiziksel katman hesaplayıcısı ekranının rapor bölümü.
// Saf: React, DOM, ağ bilmez. Ekranla aynı `r`/`s`/`text` kaynağından aynı
// satırları üretir; ekranla rapor arasındaki kayma riski böylece en aza iner.

import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, MODE_CAN } from './model'

function inputRows(f, text) {
  const extra = [
    { label: text.modeLabel, value: f.mode === MODE_CAN ? text.modeCan : text.modeRs485 },
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

function chartSection(s, r, text) {
  if (!s) return null
  const indices = sampleIndices(s.rows.length, 8)
  const isCan = r.mode === MODE_CAN
  return {
    title: isCan ? text.sweepCaptionCan : text.sweepCaptionRs485,
    svg: null,
    table: {
      columns: [
        isCan ? text.sweepAxisCan : text.sweepAxisRs485,
        isCan ? text.sweepYLabelCan : text.sweepYLabelRs485,
      ],
      rows: indices.map((i) => [fmt(s.rows[i].x, 3), fmt(s.rows[i].y, 4)]),
    },
  }
}

function canResults(r, text) {
  const results = [
    { label: text.bigResultLabelCan, ...splitFormatted(fmtEng(r.margin, 's', 4)), emphasis: true },
    { label: text.table.bitTime, ...splitFormatted(fmtEng(r.bitTime, 's', 4)) },
    { label: text.table.sampleTime, ...splitFormatted(fmtEng(r.sampleTime, 's', 4)) },
    { label: text.table.cableDelay, ...splitFormatted(fmtEng(r.cableDelay, 's', 4)) },
    { label: text.table.roundTrip, ...splitFormatted(fmtEng(r.roundTrip, 's', 4)) },
    { label: text.table.fixedDelay, ...splitFormatted(fmtEng(r.fixedDelay, 's', 4)) },
    { label: text.table.loopDelay, ...splitFormatted(fmtEng(r.loopDelay, 's', 4)) },
    { label: text.table.margin, ...splitFormatted(fmtEng(r.margin, 's', 4)) },
    { label: text.table.terminationEq, ...splitFormatted(fmtRes(r.terminationEq)) },
  ]
  if (r.maxLength != null) {
    results.push({ label: text.table.maxLength, ...splitFormatted(fmtEng(r.maxLength, 'm', 4)) })
  }
  if (r.split) {
    results.push(
      { label: text.table.splitTotal, ...splitFormatted(fmtRes(r.split.total)) },
      { label: text.table.splitCm, ...splitFormatted(fmtRes(r.split.commonMode)) },
    )
    if (r.split.cutoff != null) {
      results.push({ label: text.table.splitCutoff, ...splitFormatted(fmtEng(r.split.cutoff, 'Hz', 4)) })
    }
  }
  if (r.stub) {
    results.push({ label: text.table.stubRoundTrip, ...splitFormatted(fmtEng(r.stub.roundTrip, 's', 4)) })
    if (r.stub.ratio != null) {
      results.push({ label: text.table.stubRatio, value: `${fmt(r.stub.ratio, 4)}×` })
    }
  }
  return results
}

function rs485Results(r, text) {
  const results = [
    { label: text.bigResultLabelRs485, ...splitFormatted(fmtRes(r.differentialLoad)), emphasis: true },
    { label: text.table.terminationEq, ...splitFormatted(fmtRes(r.terminationEq)) },
  ]
  if (r.bias) {
    results.push(
      { label: text.table.biasCurrent, ...splitFormatted(fmtEng(r.bias.current, 'A', 4)) },
      { label: text.table.biasIdle, ...splitFormatted(fmtVolt(r.bias.idleVoltage)) },
      { label: text.table.biasMargin, ...splitFormatted(fmtVolt(r.bias.thresholdMargin)) },
      { label: text.table.biasPowerUp, ...splitFormatted(fmtEng(r.bias.powerPullUp, 'W', 4)) },
      { label: text.table.biasPowerDown, ...splitFormatted(fmtEng(r.bias.powerPullDown, 'W', 4)) },
    )
  }
  if (r.biasTarget && !r.biasTarget.error) {
    results.push(
      { label: text.table.targetIdeal, ...splitFormatted(fmtRes(r.biasTarget.ideal)) },
      { label: text.table.targetStandard, ...splitFormatted(fmtRes(r.biasTarget.standard)) },
      { label: text.table.targetAchieved, ...splitFormatted(fmtVolt(r.biasTarget.achieved)) },
    )
  }
  if (r.maxNodes != null) {
    results.push({ label: text.table.maxNodes, value: fmt(r.maxNodes, 3) })
  }
  if (r.cableDelay != null) {
    results.push({ label: text.table.rs485CableDelay, ...splitFormatted(fmtEng(r.cableDelay, 's', 4)) })
  }
  if (r.bitTime != null) {
    results.push({ label: text.table.rs485BitTime, ...splitFormatted(fmtEng(r.bitTime, 's', 4)) })
  }
  return results
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  const isCan = r.mode === MODE_CAN

  return {
    toolName: text.title,
    mode: isCan ? text.modeCan : text.modeRs485,
    inputs: inputRows(f, text),
    formula: text.formula(f.mode).split('\n').map((line) => line.trim()).filter(Boolean),
    results: isCan ? canResults(r, text) : rs485Results(r, text),
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: isCan ? text.schematic.captionCan(!!r.split, !!r.stub) : text.schematic.captionRs485,
    chart: chartSection(s, r, text),
  }
}
