// BGA breakout ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// Ekranla aynı `r`/`s`/`text` kaynağından aynı satırları üretir.

import { fmt } from '../../../lib/num'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, SWEEP_LAND } from './model'

const asMm = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${fmt(v * 1e3, 4)} mm`)

// model.js'in adet alanları SI dönüşüm tablosunun anahtarı olarak sabit 'adet'
// taşır — bu, ekranda gösterilen birim değil, dahili bir sözcüktür ve hiç
// çevrilmez. Ekran birimi `text.countUnit`'ten okur; rapor da aynı kaynaktan
// okumalı, yoksa İngilizce raporda çıplak 'adet' çıkar.
const COUNT_KEY = 'adet'

function inputRows(f, text) {
  return formFields(text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey
        ? f[field.unitKey]
        : (field.unit === COUNT_KEY ? text.countUnit : field.unit ?? null),
    }))
}

function chartSection(r, s, text) {
  if (!s) return null
  const indices = sampleIndices(s.rows.length, 4)
  return {
    title: text.chart.caption,
    svg: null,
    table: {
      columns: [
        s.sweep === SWEEP_LAND ? text.chart.xLand : text.chart.xPitch,
        text.chart.seriesHorizontal,
        text.chart.seriesDiagonal,
      ],
      rows: indices.map((i) => [
        fmt(s.rows[i].x * 1e3, 3),
        fmt(s.rows[i].y * 1e3, 3),
        fmt(s.rows[i].yDiagonal * 1e3, 3),
      ]),
    },
  }
}

// Kontroller rapora da girer — değerlendirilemeyenler dâhil. Bunları
// atlamak, ölçülmemiş olanı ölçülmüş gibi gösterirdi.
function checkRows(rows, dfm) {
  return rows.map((row) => ({
    label: `${row.label} — ${dfm.statusLabel(row.status)}`,
    value: row.status === 'unknown' ? row.reason : `${row.actual} / ${row.required}`,
  }))
}

export function buildReportSection({ f, r, s, text, dfm, rows = [], verdict = null }) {
  if (!r.ok) return null

  const results = [
    { label: text.table.nMax, value: String(r.results.nMax), unit: text.countUnit, emphasis: true },
    { label: text.table.gap, value: asMm(r.results.gap) },
    { label: text.table.maxWidthSingle, value: asMm(r.results.maxWidthSingle) },
    { label: text.table.requiredSpace, value: asMm(r.results.requiredSpace) },
    { label: text.table.channelMargin, value: asMm(r.results.channelMargin) },
    { label: text.table.diagGap, value: asMm(r.results.diagGap) },
    { label: text.table.maxWidthDiagonal, value: asMm(r.results.maxWidthDiagonal) },
    { label: text.table.landViaDistance, value: asMm(r.results.landViaDistance) },
    { label: text.table.maxViaPad, value: asMm(r.results.maxViaPad) },
    { label: text.table.landViaClearance, value: asMm(r.results.landViaClearance) },
    { label: text.table.neckLength, value: asMm(r.results.neckLength) },
    { label: text.table.viaViaClearance, value: asMm(r.results.viaViaClearance) },
    { label: text.table.maskOpening, value: asMm(r.results.maskOpening) },
    { label: text.table.maskWeb, value: asMm(r.results.maskWeb) },
    {
      label: text.table.viaAspect,
      value: r.results.viaAspect === null ? '—' : fmt(r.results.viaAspect, 3),
    },
    { label: text.table.viaType, value: text.viaType[r.results.viaType] },
  ]

  // İhtiyatlı karar cümlesi raporun da bir parçasıdır; "route edilir" iddiası
  // hiçbir yolda üretilmez.
  const notes = [
    ...text.commentary(r, asMm),
    ...(verdict ? [{ level: 'ok', text: verdict }] : []),
  ]

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: [
      text.formula.title,
      ...text.formula.body.split('\n').map((line) => line.trim()).filter(Boolean),
    ],
    results: [...results, ...checkRows(rows, dfm)],
    notes,
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption,
    chart: chartSection(r, s, text),
  }
}
