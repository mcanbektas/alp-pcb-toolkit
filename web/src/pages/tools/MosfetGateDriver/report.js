// MOSFET gate sürücü ve gate direnci hesaplayıcısı ekranının rapor bölümü.
// Saf: React, DOM, ağ bilmez. Ekranla aynı `r`/`s`/`text` kaynağından aynı
// satırları üretir; ekranla rapor arasındaki kayma riski böylece en aza iner.

import { fmt, fmtEng, fmtRes } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, SWEEP_RESISTANCE } from './model'

// model.js'in `count` alanı yalnızca SI dönüşüm tablosunun anahtarı olarak sabit
// 'adet' taşır (COUNT = { adet: 1 }) — bu, ekranda gösterilen birim değil, dahili
// bir sözcüktür ve hiç çevrilmez. Ekranın NumberField'ı bu yüzden birimi field.unit'ten
// değil `text.countUnit`'ten okur (bkz. index.jsx); rapor da aynı kaynaktan okumalı,
// yoksa İngilizce raporda çıplak 'adet' çıkar (ThermalVia/report.js ile aynı desen).
const UNIT_OVERRIDE = { count: (text) => text.countUnit }

function inputRows(f, text) {
  return formFields(f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey
        ? f[field.unitKey]
        : (UNIT_OVERRIDE[field.key]?.(text) ?? field.unit ?? null),
    }))
}

function chartSection(s, text) {
  if (!s) return null
  const indices = sampleIndices(s.rows.length, 8)
  const xLabel = text.sweepAxis[s.param]

  if (s.param === SWEEP_RESISTANCE) {
    return {
      title: text.sweepCaption[s.param],
      svg: null,
      table: {
        columns: [xLabel, text.seriesOn, text.seriesOff],
        rows: indices.map((i) => [
          fmt(s.rows[i].x, 3), fmt(s.rows[i].y, 4), fmt(s.rows[i].yOff, 4),
        ]),
      },
    }
  }

  return {
    title: text.sweepCaption[s.param],
    svg: null,
    table: {
      columns: [xLabel, text.sweepLabel[s.param]],
      rows: indices.map((i) => [fmt(s.rows[i].x, 3), fmt(s.rows[i].y, 4)]),
    },
  }
}

function sideRows(side, headLabel, text) {
  return [
    { label: `${text.table.rTotal} (${headLabel})`, ...splitFormatted(fmtRes(side.rTotal)) },
    { label: `${text.table.current} (${headLabel})`, ...splitFormatted(fmtEng(side.current, 'A', 4)) },
    { label: `${text.table.millerTime} (${headLabel})`, ...splitFormatted(fmtEng(side.millerTime, 's', 4)) },
    { label: `${text.table.chargeTime} (${headLabel})`, ...splitFormatted(fmtEng(side.chargeTime, 's', 4)) },
    { label: `${text.table.resistorLoss} (${headLabel})`, ...splitFormatted(fmtEng(side.resistorLoss, 'W', 4)) },
  ]
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  const results = [
    { label: text.bigResultLabel, ...splitFormatted(fmtEng(r.on.current, 'A', 4)), emphasis: true },
    { label: text.table.averageCurrent, ...splitFormatted(fmtEng(r.averageCurrent, 'A', 4)) },
    { label: text.table.gatePower, ...splitFormatted(fmtEng(r.gatePower, 'W', 4)) },
    ...sideRows(r.on, text.table.onHead, text),
    ...sideRows(r.off, text.table.offHead, text),
  ]

  if (r.targetOn && !r.targetOn.error) {
    results.push({
      label: `${text.table.targetExternal} (${text.table.onHead})`,
      ...splitFormatted(fmtRes(r.targetOn.external)),
    })
  }
  if (r.targetOff && !r.targetOff.error) {
    results.push({
      label: `${text.table.targetExternal} (${text.table.offHead})`,
      ...splitFormatted(fmtRes(r.targetOff.external)),
    })
  }
  if (r.switchingLoss != null) {
    results.push({ label: text.table.switchingLoss, ...splitFormatted(fmtEng(r.switchingLoss, 'W', 4)) })
  }
  if (r.cossLoss != null) {
    results.push({ label: text.table.cossLoss, ...splitFormatted(fmtEng(r.cossLoss, 'W', 4)) })
  }

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
