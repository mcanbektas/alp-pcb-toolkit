// Dönüş yolu ve stitching via planlayıcısı ekranının rapor bölümü.
// Saf: React, DOM, ağ bilmez. Ekranla aynı `r`/`s`/`text` kaynağından aynı
// satırları üretir; ekranla rapor arasındaki kayma riski böylece en aza iner.

import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import {
  formFields, SPACING_DIVISORS, SWEEP_REACTANCE,
  BW_SINGLE_POLE, SIGNAL_DIFF, PLANE_GND, PLANE_POWER,
} from './model'

// model.js'in `stitchingViaCount` alanı SI dönüşüm tablosunun anahtarı olarak
// sabit 'adet' taşır (COUNT = { adet: 1 }) — dahili bir sözcüktür, hiç
// çevrilmez. Ekranın NumberField'ı birimi field.unit'ten değil
// `text.countUnit`'ten okur (bkz. index.jsx); rapor da aynı kaynaktan
// okumalı, yoksa İngilizce raporda çıplak 'adet' çıkar (ThermalVia'daki N
// alanıyla aynı gerekçe).
const UNIT_OVERRIDE = { stitchingViaCount: (text) => text.countUnit }

function planeLabel(planeType, text) {
  if (planeType === PLANE_GND) return text.fields.planeGnd
  if (planeType === PLANE_POWER) return text.fields.planePower
  return text.fields.planeSplit
}

// formFields yalnızca sayısal/birimli alanları kapsar; signalType, planeType,
// bandwidthMethod ve spacingDivisor kapalı seçenekli düz dizelerdir (Divider
// ekranındaki `series` alanıyla aynı gerekçeyle formFields dışında elle
// eklenir — compute() bunları f'ten doğrudan okur, ayrıştırma gerektirmezler).
function inputRows(f, text) {
  const extra = [
    { label: text.fields.signalType.label, value: f.signalType === SIGNAL_DIFF ? text.fields.signalDiff : text.fields.signalSingle },
    { label: text.fields.planeType.label, value: planeLabel(f.planeType, text) },
    {
      label: text.fields.bandwidthMethod.label,
      value: f.bandwidthMethod === BW_SINGLE_POLE ? text.fields.bwSinglePole : text.fields.bwConservative,
    },
    { label: text.fields.spacingDivisor.label, value: `λ/${f.spacingDivisor}` },
  ]

  return [
    ...extra,
    ...formFields(f, text.fieldLabels)
      .filter((field) => f[field.key] !== '' && f[field.key] != null)
      .map((field) => ({
        label: field.label,
        value: f[field.key],
        unit: field.unitKey
          ? f[field.unitKey]
          : (UNIT_OVERRIDE[field.key]?.(text) ?? field.unit ?? null),
      })),
  ]
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider — svg alanı burada bilinçli olarak null bırakılır.
// Örnekleme ekrandaki <ChartDataTable every={8}> ile birebir aynı
// `sampleIndices` fonksiyonunu kullanır (son nokta her zaman dahil).
// Via reaktansı taramasında ekrandaki gibi iki sütun (tek via / N via
// eşdeğeri) birlikte çıkar.
function chartSection(s, text) {
  if (!s) return null
  const indices = sampleIndices(s.rows.length, 8)
  const xLabel = text.sweepAxis[s.param]

  if (s.param === SWEEP_REACTANCE) {
    return {
      title: text.sweepCaption[s.param],
      svg: null,
      table: {
        columns: [xLabel, text.seriesSingle, text.seriesParallel],
        rows: indices.map((i) => [
          fmt(s.rows[i].x, 3), fmt(s.rows[i].y, 4), fmt(s.rows[i].yParallel, 4),
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

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  const results = [
    { label: text.bigResultLabel, ...splitFormatted(fmtRes(r.reactanceParallel)), emphasis: true },
    { label: text.table.fEdge, ...splitFormatted(fmtEng(r.fEdge, 'Hz', 4)) },
    { label: text.table.fAnalysis, ...splitFormatted(fmtEng(r.fAnalysis, 'Hz', 4)) },
  ]

  if (r.edgeToClockRatio != null) {
    results.push({ label: text.table.edgeToClockRatio, value: `${fmt(r.edgeToClockRatio, 4)}×` })
  }

  results.push(
    { label: text.table.vp, ...splitFormatted(fmtEng(r.vp, 'm/s', 4)) },
    { label: text.table.lambda, ...splitFormatted(fmtEng(r.lambda, 'm', 4)) },
  )

  SPACING_DIVISORS.forEach((d) => {
    results.push({ label: text.table.spacing(d), ...splitFormatted(fmtEng(r.spacingLimits[d], 'm', 4)) })
  })

  results.push(
    { label: text.table.viaLSingle, ...splitFormatted(fmtEng(r.viaInductanceSingle, 'H', 4)) },
    { label: text.table.viaLEq(r.stitchingViaCount), ...splitFormatted(fmtEng(r.viaInductanceEq, 'H', 4)) },
    { label: text.table.xlSingle, ...splitFormatted(fmtRes(r.reactanceSingle)) },
    { label: text.table.xlParallel, ...splitFormatted(fmtRes(r.reactanceParallel)) },
  )

  if (r.spacingRatio != null) {
    results.push(
      { label: text.table.spacingLimit, ...splitFormatted(fmtEng(r.spacingLimit, 'm', 4)) },
      { label: text.table.spacingRatio, value: `${fmt(r.spacingRatio, 4)}×` },
    )
  }

  if (r.signalToReturnViaDistance != null) {
    results.push({
      label: text.table.signalToReturnViaDistance,
      ...splitFormatted(fmtEng(r.signalToReturnViaDistance, 'm', 4)),
    })
  }

  if (r.returnVoltage != null) {
    results.push({ label: text.table.returnVoltage, ...splitFormatted(fmtVolt(r.returnVoltage)) })
  }

  if (r.capacitor) {
    results.push(
      { label: text.table.capEslTotal, ...splitFormatted(fmtEng(r.capacitor.eslTotal, 'H', 4)) },
      { label: text.table.capFsrf, ...splitFormatted(fmtEng(r.capacitor.fSrf, 'Hz', 4)) },
      { label: text.table.capImpedance, ...splitFormatted(fmtRes(r.capacitor.impedance)) },
    )
  }

  if (r.capDistance != null) {
    results.push({ label: text.table.capDistance, ...splitFormatted(fmtEng(r.capDistance, 'm', 4)) })
  }

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption(r.hasCapacitor && !!r.capacitor, r.planeType),
    chart: chartSection(s, text),
  }
}
