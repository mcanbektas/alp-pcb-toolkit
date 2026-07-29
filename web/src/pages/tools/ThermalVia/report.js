// Termal via dizisi ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`s`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.

import { fmt, fmtPow } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, MODE_SYNTHESIS } from './model'

// model.js'in `N` alanı yalnızca SI dönüşüm tablosunun anahtarı olarak sabit
// 'adet' taşır (COUNT = { adet: 1 }) — bu, ekranda gösterilen birim değil,
// dahili bir sözcüktür ve hiç çevrilmez. Ekranın NumberField'ı bu yüzden
// birimi field.unit'ten değil `text.countUnit`'ten okur (bkz. index.jsx);
// rapor da aynı kaynaktan okumalı, yoksa İngilizce raporda çıplak 'adet' çıkar.
const UNIT_OVERRIDE = { N: (text) => text.countUnit }

function inputRows(mode, f, text) {
  return formFields(mode, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey
        ? f[field.unitKey]
        : (UNIT_OVERRIDE[field.key]?.(text) ?? field.unit ?? null),
    }))
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır,
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg). Örnekleme
// ekrandaki <ChartDataTable every={3}> ile birebir aynı `sampleIndices` saf
// fonksiyonunu kullanır — yalnızca adımı değil, "son nokta her zaman dahil"
// kuralını da paylaşır, yoksa eğrinin asimptotik son satırı rapordan düşer.
function chartSection(r, s, text) {
  if (!s) return null
  const indices = sampleIndices(s.rows.length, 3)
  return {
    title: text.chart.caption,
    svg: null,
    table: {
      columns: [text.chart.x, text.schematic.arrayR],
      rows: indices.map((i) => [fmt(s.rows[i].x, 2), fmt(s.rows[i].y, 4)]),
    },
  }
}

export function buildReportSection({ mode, f, r, s, text }) {
  if (!r.ok) return null

  // Ekranın `.big-result` bloğuyla birebir aynı: sentezde çıplak via sayısı
  // (birimsiz — ekranda da yalnızca `{r.N}` basılır), analizde `°C/W` birimli
  // dizi direnci.
  const big = r.mode === MODE_SYNTHESIS
    ? { label: text.bigResult.synthesis, value: r.N, emphasis: true }
    : { label: text.bigResult.analysis, value: fmt(r.Rarray, 4), unit: '°C/W', emphasis: true }

  const results = [
    big,
    { label: text.table.area, value: fmt(r.area * 1e6, 4), unit: 'mm²' },
    ...(r.filled ? [{ label: text.table.fillArea, value: fmt(r.fillArea * 1e6, 4), unit: 'mm²' }] : []),
    { label: text.table.Rsingle, value: fmt(r.Rsingle, 5), unit: '°C/W' },
    { label: text.table.Rarray(r.N), value: fmt(r.Rarray, 5), unit: '°C/W' },
    { label: text.table.improvement, value: fmt(r.improvementVsOne, 4), unit: '×' },
    { label: text.table.deltaT, value: fmt(r.deltaT, 4), unit: '°C' },
    // actualQ ekranda fmtPow (dinamik SI öneki) ile basılır — sabit birim
    // yazılmaz, splitFormatted değeri/birimi ayırır.
    { label: text.table.actualQ, ...splitFormatted(fmtPow(r.actualQ, 5)) },
    ...(r.mode === MODE_SYNTHESIS ? [{ label: text.table.Rneeded, value: fmt(r.Rneeded, 5), unit: '°C/W' }] : []),
  ]

  return {
    toolName: text.title,
    mode: r.mode === MODE_SYNTHESIS ? text.modeSynthesis : text.modeAnalysis,
    inputs: inputRows(mode, f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: r.N > 36 ? text.schematic.captionTruncated(r.N) : text.schematic.caption,
    chart: chartSection(r, s, text),
  }
}
