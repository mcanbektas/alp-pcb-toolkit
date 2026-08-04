// Flex PCB bükülme ve iz hesaplayıcısı ekranının rapor bölümü. Saf: React,
// DOM, ağ bilmez. Ekranla aynı `r`/`s`/`text`/`dfm` kaynağından aynı satırları
// üretir; ekranla rapor arasındaki kayma riski böylece en aza iner.

import { fmt, fmtEng } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import {
  formFields, FLEX_DOUBLE, FLEX_MULTI, FLEX_RIGID,
  BEND_DYNAMIC, EPS_SOURCE_VENDOR, SWEEP_THICKNESS,
} from './model'

// A_Cu m² döner; fmtEng doğrusal büyüklükler içindir (bkz. index.jsx'teki aynı
// gerekçe) — alan burada elle mm²'ye çevrilir.
const fmtArea = (x) => (Number.isFinite(x) ? `${fmt(x * 1e6, 4)} mm²` : '—')

// model.js'in `n` alanı SI dönüşüm tablosunun anahtarı olarak sabit 'adet'
// taşır — dahili bir sözcüktür, hiç çevrilmez. Ekranın NumberField'ı birimi
// field.unit'ten değil `text.countUnit`'ten okur (bkz. index.jsx); rapor da
// aynı kaynaktan okumalı, yoksa İngilizce raporda çıplak 'adet' çıkar
// (ReturnPathStitchingVia'daki stitchingViaCount alanıyla aynı gerekçe).
const UNIT_OVERRIDE = { n: (text) => text.countUnit }

function flexTypeLabel(flexType, text) {
  switch (flexType) {
    case FLEX_DOUBLE: return text.fields.flexDouble
    case FLEX_MULTI: return text.fields.flexMulti
    case FLEX_RIGID: return text.fields.flexRigid
    default: return text.fields.flexSingle
  }
}

// flexType, bendMode ve epsilonAllowSource kapalı seçenekli düz dizelerdir
// (ReturnPathStitchingVia'daki signalType/planeType ile aynı gerekçeyle
// formFields dışında elle eklenir — compute() bunları f'ten doğrudan okur).
function inputRows(f, text) {
  const extra = [
    { label: text.fields.flexType.label, value: flexTypeLabel(f.flexType, text) },
    {
      label: text.fields.bendMode.label,
      value: f.bendMode === BEND_DYNAMIC ? text.fields.bendDynamic : text.fields.bendStatic,
    },
  ]

  const epsSourceRow = (f.epsilonAllow !== '' && f.epsilonAllow != null)
    ? [{
      label: text.fields.epsilonAllowSource.label,
      value: f.epsilonAllowSource === EPS_SOURCE_VENDOR
        ? text.fields.epsSourceVendor
        : text.fields.epsSourceAssumption,
    }]
    : []

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
    ...epsSourceRow,
  ]
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider — svg alanı burada bilinçli olarak null bırakılır.
// Örnekleme ekrandaki <ChartDataTable every={8} .../> ile aynı `sampleIndices`
// fonksiyonunu kullanır (son nokta her zaman dahil). Toplam kalınlık
// taramasında ekrandaki gibi bulunabilirse iki sütun (üretici/strain kuralı)
// birlikte çıkar.
function chartSection(s, text) {
  if (!s) return null
  const indices = sampleIndices(s.rows.length, 8)
  const xLabel = text.sweepAxisX[s.param]

  if (s.param === SWEEP_THICKNESS) {
    const columns = [xLabel]
    if (s.hasVendor) columns.push(text.seriesVendor)
    if (s.hasStrain) columns.push(text.seriesStrain)
    return {
      title: text.sweepCaption[s.param],
      svg: null,
      table: {
        columns,
        rows: indices.map((i) => {
          const row = [fmt(s.rows[i].x, 4)]
          if (s.hasVendor) row.push(s.rows[i].vendor === null ? '—' : fmt(s.rows[i].vendor, 4))
          if (s.hasStrain) row.push(s.rows[i].strainBased === null ? '—' : fmt(s.rows[i].strainBased, 4))
          return row
        }),
      },
    }
  }

  return {
    title: text.sweepCaption[s.param],
    svg: null,
    table: {
      columns: [xLabel, text.sweepLabel[s.param]],
      rows: indices.map((i) => [fmt(s.rows[i].x, 4), fmt(s.rows[i].y, 4)]),
    },
  }
}

// Sonuç satırları ekrandaki `.result-table` ile birebir aynı sırada; ilk
// satır ekrandaki `.big-result` ile aynı değeri taşır ve vurgulanır
// (VoltageDivider/ReturnPathStitchingVia'daki "ilk satır = büyük sonuç"
// deseniyle aynı).
function resultRows(r, text) {
  const rows = [
    { label: text.bigResultLabel, value: fmt(r.strainPercent, 4), unit: '%', emphasis: true },
  ]

  if (r.vendorMinRadius !== null) {
    rows.push({ label: text.table.vendorMinRadius, ...splitFormatted(fmtEng(r.vendorMinRadius, 'm', 4)) })
  }
  if (r.strainMinRadius !== null) {
    rows.push({ label: text.table.strainMinRadius, ...splitFormatted(fmtEng(r.strainMinRadius, 'm', 4)) })
  }
  rows.push({ label: text.table.bendRadius, ...splitFormatted(fmtEng(r.bendRadius, 'm', 4)) })

  if (r.arcLength !== null) {
    rows.push({ label: text.table.arcLength, ...splitFormatted(fmtEng(r.arcLength, 'm', 4)) })
  }
  if (r.surfaceLengths !== null) {
    rows.push(
      { label: text.table.outerLength, ...splitFormatted(fmtEng(r.surfaceLengths.outer, 'm', 4)) },
      { label: text.table.innerLength, ...splitFormatted(fmtEng(r.surfaceLengths.inner, 'm', 4)) },
    )
  }
  if (r.elongation !== null) {
    rows.push({ label: text.table.elongation, ...splitFormatted(fmtEng(r.elongation, 'm', 4)) })
  }
  if (r.copperArea !== null) {
    rows.push({ label: text.table.copperArea, value: fmt(r.copperArea * 1e6, 4), unit: 'mm²' })
  }
  if (r.traceResistanceSingle !== null) {
    rows.push({
      label: text.table.traceResistanceSingle, ...splitFormatted(fmtEng(r.traceResistanceSingle, 'Ω', 4)),
    })
  }
  if (r.traceResistance !== null) {
    rows.push({ label: text.table.traceResistance(r.n), ...splitFormatted(fmtEng(r.traceResistance, 'Ω', 4)) })
  }
  if (r.voltageDrop !== null) {
    rows.push({ label: text.table.voltageDrop, ...splitFormatted(fmtEng(r.voltageDrop, 'V', 4)) })
  }
  if (r.powerLoss !== null) {
    rows.push({ label: text.table.powerLoss, ...splitFormatted(fmtEng(r.powerLoss, 'W', 4)) })
  }
  if (r.cycleLife !== null) {
    rows.push({ label: text.table.cycleLife, value: fmt(r.cycleLife, 4), unit: null })
  }

  return rows
}

export function buildReportSection({ f, r, s, text, dfm }) {
  if (!r.ok) return null

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results: resultRows(r, text),
    // §15.9'un üç mesafe kontrolü (via/pad/stiffener) burada ayrı bir kontrol
    // tablosu olarak tekrar edilmez: `text.commentary` her üçünü de zaten
    // ayrı birer cümleyle (durum + gerçek/minimum/marj) taşır — bkz.
    // text.js'teki clearanceNote. Değerlendirilemeyen kontrol de (status
    // 'unknown') bu cümlelerde açıkça görünür, sessizce düşmez.
    notes: text.commentary(r, dfm),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption,
    chart: chartSection(s, text),
  }
}
