// Terminasyon ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.
//
// Üç terminasyon tipi (seri, paralel, Thevenin) index.jsx'teki `r.type`
// dallanmasının aynısını izler — TraceWidth pilotu gibi mod anahtarı,
// şematik VE parametrik grafik birlikte var; ResistorCode'daki gibi ayrı
// bir "kind" yoktur, tek anahtar `type` hem moddur hem dallanmadır.

import {
  fmt, fmtRes, fmtAmp, fmtWatt, fmtVolt, fmtPct,
} from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import {
  formFields, TERM_SERIES, TERM_PARALLEL, TERM_THEVENIN,
} from './model'

function inputRows(type, f, text) {
  const rows = formFields(f, type, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))

  // E serisi seçimi (Thevenin) model.js'in formFields'ında yok — motor bu
  // alanı doğrulamaz, ekrandan doğrudan geçirilir (bkz. model.js yorumu).
  if (type === TERM_THEVENIN) {
    rows.push({ label: text.fields.eseries.label, value: f.eseries, unit: null })
  }

  return rows
}

function seriesResults(r, text) {
  const rows = [
    {
      label: text.bigLabel[TERM_SERIES],
      ...splitFormatted(fmtRes(r.Rs, 4)),
      emphasis: true,
    },
    { label: text.table.Rs, ...splitFormatted(fmtRes(r.Rs, 5)) },
  ]

  r.nearest.forEach((n, i) => {
    rows.push({
      label: text.table.nearest(r.eseries, i + 1),
      value: `${fmtRes(n.value, 4)} (${text.pct(fmtPct(n.errorPct))})`,
      unit: null,
    })
  })

  const withStandardBase = r.withStandard != null ? fmtRes(r.withStandard, 5) : text.none
  rows.push({
    label: text.table.withStandard,
    value: r.stdErrPct != null
      ? `${withStandardBase} (${text.pct(fmtPct(r.stdErrPct))})`
      : withStandardBase,
    unit: null,
  })

  rows.push(
    { label: text.table.total, ...splitFormatted(fmtRes(r.total, 5)) },
    { label: text.table.Rdriver, ...splitFormatted(fmtRes(r.Rdriver, 5)) },
    { label: text.table.Z0, ...splitFormatted(fmtRes(r.Z0, 5)) },
  )

  return rows
}

function parallelResults(r, text) {
  return [
    {
      label: text.bigLabel[TERM_PARALLEL],
      ...splitFormatted(fmtRes(r.RT, 4)),
      emphasis: true,
    },
    { label: text.table.RT, ...splitFormatted(fmtRes(r.RT, 5)) },
    { label: text.table.IdcParallel, ...splitFormatted(fmtAmp(r.Idc, 5)) },
    { label: text.table.PdcParallel, ...splitFormatted(fmtWatt(r.Pdc)) },
    { label: text.table.Pavg, ...splitFormatted(fmtWatt(r.Pavg)) },
    { label: text.table.duty, value: text.pct(fmt(r.duty * 100, 4)), unit: null },
    { label: text.table.V, ...splitFormatted(fmtVolt(r.V)) },
    { label: text.table.Z0, ...splitFormatted(fmtRes(r.Z0, 5)) },
  ]
}

function theveninResults(r, text) {
  const std = r.standard
  return [
    {
      label: text.bigLabel[TERM_THEVENIN](r.series),
      value: `${fmtRes(std.Rtop, 3)} / ${fmtRes(std.Rbottom, 3)}`,
      unit: null,
      emphasis: true,
    },
    { label: text.table.idealRtop, ...splitFormatted(fmtRes(r.ideal.Rtop, 5)) },
    { label: text.table.idealRbottom, ...splitFormatted(fmtRes(r.ideal.Rbottom, 5)) },
    { label: text.table.biasRatio, value: fmt(r.ideal.a, 5), unit: null },
    {
      label: text.table.standardPair,
      value: `${fmtRes(std.Rtop, 4)} / ${fmtRes(std.Rbottom, 4)}`,
      unit: null,
    },
    { label: text.table.Rpar, ...splitFormatted(fmtRes(std.Rpar, 5)) },
    { label: text.table.zErr, value: text.pct(fmtPct(std.zErr)), unit: null },
    { label: text.table.bias, ...splitFormatted(fmtVolt(std.bias)) },
    { label: text.table.vErr, value: text.pct(fmtPct(std.vErr)), unit: null },
    { label: text.table.Idc, ...splitFormatted(fmtAmp(r.Idc, 5)) },
    { label: text.table.Pdc, ...splitFormatted(fmtWatt(r.Pdc)) },
    { label: text.table.eseries, value: r.series, unit: null },
    { label: text.table.Z0, ...splitFormatted(fmtRes(r.Z0, 5)) },
  ]
}

function resultsFor(r, text) {
  if (r.type === TERM_SERIES) return seriesResults(r, text)
  if (r.type === TERM_PARALLEL) return parallelResults(r, text)
  return theveninResults(r, text)
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır,
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg). Tüm seriler
// aynı Z₀ taramasından (model.js'teki sweepX) geldiği için aynı x dizisini
// paylaşır; index burada hizalama anahtarıdır. Örnekleme adımı ve hücre
// biçimlendirmesi index.jsx'teki <ChartDataTable every={6} .../> ile birebir
// aynı olmalı — aksi halde ekrandaki "Veri tablosu" ile rapor farklı sayı
// gösterir (docs/uyelik-ve-rapor-plani.md §8 risk R6).
function chartSection(r, s, text) {
  if (!s) return null
  const meta = text.chart[r.type]
  const columns = [meta.x, ...s.series.map((serie) => meta.names[serie.key])]
  const isPower = r.type === TERM_PARALLEL
  const formatY = (v) => (isPower ? fmtWatt(v) : fmtRes(v, 4))

  const points = s.series[0].points
  // Son nokta her zaman gösterilir — ChartDataTable ile birebir aynı kural
  // (`sampleIndices`, bkz. LineChart.jsx), eğrinin sağ ucu asimptotu/işletim
  // noktasını taşır.
  const indices = sampleIndices(points.length, 6)

  const rows = indices.map((i) => [
    `${fmt(points[i][0], 4)} Ω`,
    ...s.series.map((serie) => (
      Number.isFinite(serie.points[i]?.[1]) ? formatY(serie.points[i][1]) : '—'
    )),
  ])
  return { title: meta.caption, svg: null, table: { columns, rows } }
}

export function buildReportSection({
  type, f, r, s, text,
}) {
  if (!r.ok) return null

  return {
    toolName: text.title,
    mode: text.typeLabel[type],
    inputs: inputRows(type, f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results: resultsFor(r, text),
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption[r.type],
    chart: chartSection(r, s, text),
  }
}
