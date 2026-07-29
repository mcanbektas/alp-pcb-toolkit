// Frekans ve periyot dönüştürücü ekranının rapor bölümü. Saf: React, DOM,
// ağ bilmez. docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e
// dokunmadan, aynı `r`/`text` kaynağından aynı satırları üretir; ekranla
// rapor arasındaki kayma riski (plan §8 R6) böylece en aza iner.
//
// Bu ekranda TraceWidth'teki gibi bir Analiz/Sentez `mode` durumu yoktur —
// yön seçimi (`f.source`) form alanının kendisidir (LengthConverter'daki
// `f.target` gibi), compute()'a ayrı bir parametre olarak geçmez. Bu yüzden
// `buildReportSection` mode almaz ve `mode: null` döner.

import { fmt, fmtEng } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { formFields, SOURCE_FREQUENCY } from './model'

function inputRows(f, text) {
  return formFields(f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))
}

// Birim karşılıkları tabloları — ekranda `row.unit` etikettir, `fmt(row.value, 6)`
// birimsiz basılır (birim zaten satır etiketinde), bkz. index.jsx `.result-table`.
function unitRows(rows) {
  return rows.map((row) => ({ label: row.unit, value: fmt(row.value, 6), unit: row.unit }))
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır,
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg). Örnekleme ve
// biçimlendirme ekrandaki ChartDataTable ile birebir aynıdır (every=10,
// fmtEng ile dinamik SI öneki).
function chartSection(s, text) {
  if (!s) return null
  return {
    title: text.chart.caption,
    svg: null,
    table: {
      columns: [text.chart.x, text.chart.y],
      rows: s.rows
        .filter((_, i) => i % 10 === 0)
        .map((row) => [fmtEng(row.x, 'Hz', 4), fmtEng(row.y, 's', 4)]),
    },
  }
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  // Ana sonuç: ekranın `.big-result .value`'suyla birebir aynı — kaynak
  // frekansaysa periyot, periyotsa frekans türetilir. Dinamik SI öneki
  // taşıdığı için splitFormatted ile {value, unit} olarak ayrılır.
  const big = {
    label: text.mainLabel[r.source],
    ...splitFormatted(
      r.source === SOURCE_FREQUENCY ? fmtEng(r.period, 's', 4) : fmtEng(r.frequency, 'Hz', 4),
    ),
    emphasis: true,
  }

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results: [big, ...unitRows(r.freqRows), ...unitRows(r.timeRows)],
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption,
    chart: chartSection(s, text),
  }
}
