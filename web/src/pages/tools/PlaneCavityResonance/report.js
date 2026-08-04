// Düzlem kavite rezonansı ve kapasitansı ekranının rapor bölümü.
// Saf: React, DOM, ağ bilmez. Ekranla aynı `r`/`s`/`text` kaynağından aynı
// satırları üretir; ekranla rapor arasındaki kayma riski böylece en aza iner.
//
// Ekrandaki mod tablosu (r.modes) buraya BİLİNÇLİ OLARAK taşınmaz —
// VoltageDivider'daki aday direnç çiftleri (r.pairs) tablosuyla aynı
// gerekçe: rapor şeması bölüm başına tek `chart.table` alır ve o alan zaten
// taranan parametre grafiğine ayrılmıştır; ekrandaki ikincil/tamamlayıcı
// tablo rapora girmez (bkz. VoltageDivider/report.js — r.pairs orada da yok).

import { fmt, fmtEng } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import { formFields } from './model'

function inputRows(f, text) {
  const extra = [
    { label: text.fields.modeLimit.label, value: text.modeLimitOption(f.modeLimit) },
  ]
  if (f.hasStitching) {
    extra.push({ label: text.fields.stitchingN.label, value: text.stitchingNOption(f.stitchingN) })
  }

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

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider — svg alanı burada bilinçli olarak null bırakılır.
// Örnekleme ekrandaki <ChartDataTable every={8}> ile birebir aynı
// `sampleIndices` fonksiyonunu kullanır (son nokta her zaman dahil).
function chartSection(s, text) {
  if (!s) return null
  const indices = sampleIndices(s.rows.length, 8)

  return {
    title: text.sweepCaption[s.param],
    svg: null,
    table: {
      columns: [text.sweepAxis[s.param], text.sweepLabel[s.param]],
      rows: indices.map((i) => [fmt(s.rows[i].x, 3), fmt(s.rows[i].y, 4)]),
    },
  }
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  const results = [
    { label: text.table.capacitance, ...splitFormatted(fmtEng(r.capacitance, 'F', 4)), emphasis: true },
    { label: text.table.area, ...splitFormatted(fmtEng(r.area, 'm²', 4)) },
    { label: text.table.capacitancePerArea, ...splitFormatted(fmtEng(r.capacitancePerArea, 'F/m²', 4)) },
    { label: text.table.lowestResonance, ...splitFormatted(fmtEng(r.lowestResonance, 'Hz', 4)) },
    { label: text.table.dielectricQ, value: fmt(r.dielectricQ, 4) },
  ]

  if (r.totalQ != null) {
    results.push({ label: text.table.totalQ, value: fmt(r.totalQ, 4) })
  }

  if (r.energy != null) {
    results.push({ label: text.table.energy, ...splitFormatted(fmtEng(r.energy, 'J', 4)) })
  }

  if (r.hasStitching && r.stitching && !r.stitching.error) {
    results.push(
      { label: text.table.stitchingLambda, ...splitFormatted(fmtEng(r.stitching.lambda, 'm', 4)) },
      { label: text.table.stitchingSMax, ...splitFormatted(fmtEng(r.stitching.sMax, 'm', 4)) },
    )
    if (r.stitching.actualSpacing != null) {
      results.push({
        label: text.table.stitchingActual,
        ...splitFormatted(fmtEng(r.stitching.actualSpacing, 'm', 4)),
      })
    }
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
