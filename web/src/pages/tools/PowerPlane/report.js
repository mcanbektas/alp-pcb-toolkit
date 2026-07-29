// Güç düzlemi ve paralel yol ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`s`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.
//
// Bu ekranda ayrı bir mod durumu (Analiz/Sentez gibi useState) yoktur —
// Crosstalk'taki `fextMode` gibi hesap türü (`f.tool`) forma gömülü bir
// SelectField'dır, TraceWidth/ResistorCode'daki Segmented mod anahtarının
// karşılığı değildir. Yine de bölümün `mode` alanı hangi hesabın çalıştığını
// göstermek için doldurulur — ResistorCode'un `text.kindLabel[r.kind]`
// deseniyle aynı gerekçeyle `text.toolLabel[r.tool]` kullanılır.

import {
  fmt, fmtEng, fmtOhm, fmtAmp, fmtVolt, fmtPow,
} from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import {
  formFields, traceColumns, TOOL_PLANE, TOOL_PARALLEL,
} from './model'

function inputRows(f, text) {
  const rows = formFields(f.tool, f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))

  if (f.tool !== TOOL_PARALLEL) return rows

  // Paralel yol satırları RowList'ten gelir, formFields'ta yoktur — ekrandaki
  // gibi satır adı + sütun etiketiyle ("Yol 1 — Uzunluk") tek tek eklenir
  // (bkz. Decoupling/report.js'teki aynı desen).
  const cols = traceColumns(text.fieldLabels)
  const rowRows = f.traces.flatMap((row, i) => cols.map((c) => ({
    label: `${text.fieldLabels.rowLabel} ${i + 1} — ${c.label}`,
    value: row[c.key],
    unit: c.unitKey ? row[c.unitKey] : null,
  })))

  return [...rows, ...rowRows]
}

// Düzlem sonuç tablosu: ekrandaki "boyun · ortalama" ikili sütunları tek
// satırda birleşik dize olarak taşınır (Crosstalk/report.js'teki aynı desen —
// splitFormatted tek bir sayı/birim çifti için tasarlıdır, ikili değer için
// kullanılmaz).
function planeResults(r, text) {
  const rows = [
    { label: text.planeTable.geometry, value: text.planeTable.geometryCols },
    { label: text.planeTable.resistance, value: `${fmtOhm(r.neck.R)} · ${fmtOhm(r.average.R)}` },
    {
      label: text.planeTable.squares,
      value: `${fmt(r.neck.squares, 3)} · ${fmt(r.average.squares, 3)}`,
    },
    { label: text.planeTable.vdrop, value: `${fmtVolt(r.neck.Vdrop)} · ${fmtVolt(r.average.Vdrop)}` },
    { label: text.planeTable.ploss, value: `${fmtPow(r.neck.Ploss, 3)} · ${fmtPow(r.average.Ploss, 3)}` },
    {
      label: text.planeTable.density,
      value: `${fmt(r.neck.J / 1e6, 3)} · ${fmt(r.average.J / 1e6, 3)}`,
      unit: 'A/mm²',
    },
  ]

  if (r.neck.pct != null) {
    rows.push({
      label: text.planeTable.supplyShare,
      value: `${text.pct(fmt(r.neck.pct, 3))} · ${text.pct(fmt(r.average.pct, 3))}`,
    })
  }

  rows.push(
    { label: text.planeTable.sheet, ...splitFormatted(`${fmtOhm(r.Rsheet)}/□`) },
    {
      label: text.planeTable.neckCapacity,
      value: `${fmtAmp(r.neckCapacity, 3)} ${text.planeTable.utilisation(fmt(r.neckUtil * 100, 3))}`,
    },
  )

  return rows
}

// Paralel yol tablosu: ekrandaki pick-table'ın her satırı (# + 5 sütun) tek
// tek rapor satırına açılır (Decoupling/report.js'teki r.items.map deseniyle
// aynı gerekçe — döngü ekranda olduğu gibi burada da tek kopya kalır).
function branchRows(r, text) {
  return r.branches.flatMap((b, i) => {
    const prefix = `${text.fieldLabels.rowLabel} ${i + 1}`
    return [
      { label: `${prefix} — ${text.branchCols.resistance}`, ...splitFormatted(fmtOhm(b.R)) },
      { label: `${prefix} — ${text.branchCols.current}`, ...splitFormatted(fmtAmp(b.I, 3)) },
      { label: `${prefix} — ${text.branchCols.share}`, value: text.pct(fmt(b.share * 100, 3)) },
      { label: `${prefix} — ${text.branchCols.capacity}`, ...splitFormatted(fmtAmp(b.capacity, 3)) },
      {
        label: `${prefix} — ${text.branchCols.utilisation}`,
        value: `${text.pct(fmt(b.util * 100, 3))}${b.util > 1 ? ' !' : ''}`,
      },
    ]
  })
}

function parallelResults(r, text) {
  return [
    ...branchRows(r, text),
    { label: text.parallelTable.totalLoss, ...splitFormatted(fmtPow(r.Ploss, 3)) },
    {
      label: text.parallelTable.equalShare,
      value: `${text.pct(fmt(r.equalShare * 100, 3))} · ${fmtAmp(r.I / r.branches.length, 3)}`,
    },
    { label: text.parallelTable.equivalentW, ...splitFormatted(fmtEng(r.equivalentW, 'm', 3)) },
    { label: text.parallelTable.totalWidth, ...splitFormatted(fmtEng(r.totalWidth, 'm', 3)) },
  ]
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır.
// Sütun/satır biçimi ekrandaki ChartDataTable çağrısıyla birebir aynı: x
// düzlemde sabit 'mm' soneki taşır, paralelde kol birimiyle yazılır; y daima
// fmtOhm ile biçimlenir (index.jsx'teki formatX/formatY, satır 376-377).
// Örnekleme de ChartDataTable ile birebir aynı (components/LineChart.jsx):
// `every` adımda bir index toplanır, son index listede yoksa zorla eklenir —
// eğrinin sağ ucundaki asimptot noktası raporda da hiç düşmesin diye.
function chartSection(r, s, text) {
  if (!s) return null
  const isPlane = r.tool === TOOL_PLANE
  const chartMeta = text.chart[s.kind]
  const every = isPlane ? 6 : 1
  const indices = []
  for (let i = 0; i < s.rows.length; i += every) indices.push(i)
  if (indices.length && indices[indices.length - 1] !== s.rows.length - 1) {
    indices.push(s.rows.length - 1)
  }
  return {
    title: chartMeta.caption,
    svg: null,
    table: {
      columns: [chartMeta.x, chartMeta.y],
      rows: indices.map((i) => {
        const row = s.rows[i]
        return [
          isPlane ? `${fmt(row.x, 3)} mm` : `${fmt(row.x, 2)} ${text.branchUnit}`,
          fmtOhm(row.y),
        ]
      }),
    },
  }
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  const isPlane = r.tool === TOOL_PLANE

  const big = isPlane
    ? { label: text.bigResultPlane, ...splitFormatted(fmtOhm(r.neck.R)), emphasis: true }
    : { label: text.bigResultParallel, ...splitFormatted(fmtOhm(r.Req)), emphasis: true }

  return {
    toolName: text.title,
    mode: text.toolLabel[r.tool],
    inputs: inputRows(f, text),
    formula: text.formula[r.tool].split('\n').map((line) => line.trim()).filter(Boolean),
    results: [big, ...(isPlane ? planeResults(r, text) : parallelResults(r, text))],
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: isPlane ? text.schematic.captionPlane : text.schematic.captionParallel,
    chart: chartSection(r, s, text),
  }
}
