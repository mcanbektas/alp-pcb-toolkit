// Diferansiyel skew ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.
//
// Bu ekranda mod anahtarı (Analiz/Sentez) yoktur — `layer` yalnızca form
// alanlarından biridir, ekran seviyesinde ayrı bir `mode` durumu tutulmaz.
// Bu yüzden döndürülen bölümde `mode` alanı hiç yoktur (sahte `null` ile
// doldurulmaz).

import { fmt, fmtEng } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { epsEffRows } from '../../../components/EpsEffFields'
import { formFields } from './model'

function inputRows(f, text) {
  return formFields(f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır,
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg). Sütun
// başlıkları ve biçimlendirme index.jsx'teki <ChartDataTable every={6}> ile
// birebir aynı.
function chartSection(s, text) {
  if (!s) return null

  const columns = [
    text.chart.x,
    text.chart.seriesSkew,
    ...(s.differentLayer ? [text.chart.seriesSame] : []),
  ]
  const indices = []
  for (let i = 0; i < s.points.length; i += 6) indices.push(i)
  // Son nokta her zaman gösterilir — ChartDataTable ile birebir aynı kural
  // (bkz. LineChart.jsx), eğrinin sağ ucu asimptotu/işletim noktasını taşır.
  if (indices[indices.length - 1] !== s.points.length - 1) indices.push(s.points.length - 1)

  const rows = indices.map((i) => [
    `${fmt(s.points[i][0], 4)} mm`,
    `${fmt(s.points[i][1], 4)} ps`,
    ...(s.differentLayer ? [`${fmt(s.samePoints[i][1], 4)} ps`] : []),
  ])

  return { title: text.chart.caption, svg: null, table: { columns, rows } }
}

// `lang`: epsEffRows bileşen ortak satırlarını üretmek için zorunludur —
// dört bileşen istisnasından biri olan EpsEffFields'in saf yardımcı
// fonksiyonu, dili doğrudan hook'tan değil parametre olarak alır (bkz.
// EpsEffFields.jsx). Burada geçilmezse satırlar sessizce Türkçeye düşer ve
// İngilizce raporda Türkçe satır çıkar.
export function buildReportSection({ f, r, s, text, lang }) {
  if (!r.ok) return null

  const results = [
    { label: text.bigLabel, ...splitFormatted(fmtEng(r.skew, 's', 4)), emphasis: true },
    { label: text.table.skew, ...splitFormatted(fmtEng(r.skew, 's', 5)) },
    { label: text.table.deltaL, ...splitFormatted(fmtEng(r.deltaL, 'm', 5)) },
    { label: text.table.delayP, ...splitFormatted(fmtEng(r.delayP, 's', 5)) },
    { label: text.table.delayN, ...splitFormatted(fmtEng(r.delayN, 's', 5)) },
    // JSX'te de çeviri üzerinden değil, doğrudan bu iki sabit dizeyle basılır.
    { label: 't_pd (P)', value: fmt(r.tpdPsPerMmP, 5), unit: 'ps/mm' },
    { label: 't_pd (N)', value: fmt(r.tpdPsPerMmN, 5), unit: 'ps/mm' },
    { label: text.table.sameLayer, value: r.sameLayer ? text.yes : text.no },
    { label: text.table.skewMax, ...splitFormatted(fmtEng(r.skewMax, 's', 5)) },
    { label: text.table.maxDeltaL, ...splitFormatted(fmtEng(r.maxDeltaL, 'm', 5)) },
    {
      label: text.table.addLength,
      value: `${fmtEng(r.addLength, 'm', 5)}${r.addTo ? text.table.addTarget(r.addTo) : ''}`,
    },
    ...(r.differentLayer ? [{ label: text.table.epsEffN, value: fmt(r.epsEffN, 5) }] : []),
    ...(r.differentLayer && Number.isFinite(r.sameEpsSkew)
      ? [{ label: text.table.sameEpsSkew, ...splitFormatted(fmtEng(r.sameEpsSkew, 's', 5)) }]
      : []),
    ...epsEffRows(r.eps, fmt, lang).map((row) => ({ label: row.label, value: row.value })),
  ]

  return {
    toolName: text.title,
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: r.addTo === null ? text.schematic.captionEqual : text.schematic.captionDefault,
    chart: chartSection(s, text),
  }
}
