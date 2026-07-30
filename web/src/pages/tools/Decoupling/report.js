// Decoupling ağı ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.

import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { VOLTAGE, fromSI } from '../../../lib/units'
import { sampleIndices } from '../../../components/LineChart'
import {
  formFields, capColumns, MODE_MIN, MODE_NETWORK,
} from './model'

function inputRows(mode, f, text) {
  const fieldRows = formFields(mode, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))

  if (mode !== MODE_NETWORK) return fieldRows

  // Kapasitör satırları RowList'ten gelir, formFields'ta yoktur — ekrandaki
  // gibi satır adı + sütun etiketiyle ("Kapasitör 2 — ESR") tek tek eklenir.
  const cols = capColumns(text.capCols)
  const rowRows = f.caps.flatMap((row, i) => cols.map((c) => ({
    label: `${text.rowList.rowLabel} ${i + 1} — ${c.label}`,
    value: row[c.key],
    unit: c.unitKey ? row[c.unitKey] : null,
  })))

  return [...fieldRows, ...rowRows]
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır.
// `s.rows` (= model.js'in `r.sweep`'i) her iki modda da HAM (log dönüşümsüz)
// değer taşır; log10 dönüşümü yalnızca `buildSweep`'in çizim için ürettiği
// `points` alanındadır, bu yüzden burada Math.pow ile geri çevirmeye gerek yok.
// ChartDataTable (src/components/LineChart.jsx) `every` adımda örnekler ama son
// noktayı her zaman zorla ekler — eğrinin sağ ucu asimptotu taşır. Aynı garanti
// burada da uygulanmazsa rapor/Excel tablosu ekrandaki son satırı sessizce
// kaybeder (bkz. Faz 6 inceleme notu). Kural `sampleIndices` içinde tek kopya
// durur — ekran da rapor da aynı fonksiyonu çağırır.
function chartTable(r, s, text) {
  const every = r.mode === MODE_MIN ? 6 : 20
  const idx = sampleIndices(s.rows.length, every)

  if (r.mode === MODE_MIN) {
    return {
      columns: [text.chart.minX, 'C_min'],
      rows: idx.map((i) => s.rows[i]).map((row) => [
        `${fmt(fromSI(row.x, text.chart.minXUnit, VOLTAGE), 4)} ${text.chart.minXUnit}`,
        fmtEng(row.y, 'F', 4),
      ]),
    }
  }

  return {
    columns: [text.chart.netX, text.chart.seriesNet, ...s.series.map((x) => text.chart.seriesRow(x.index))],
    rows: idx.map((i) => s.rows[i]).map((row) => [
      fmtEng(row.x, 'Hz', 4),
      fmtRes(row.y, 4),
      ...s.series.map((x) => (Number.isFinite(row.per[x.index]) ? fmtRes(row.per[x.index], 4) : text.words.dash)),
    ]),
  }
}

function chartSection(r, s, text) {
  if (!s) return null
  const title = r.mode === MODE_MIN
    ? text.chart.minCaption
    : text.netCaption(s.hidden, r.peak, r.peakAbove, r.peakWorstSingle)
  return { title, svg: null, table: chartTable(r, s, text) }
}

function minResults(r, text) {
  return [
    { label: text.bigMin.label, ...splitFormatted(fmtEng(r.C, 'F', 4)), emphasis: true },
    { label: text.tableMin.cmin, ...splitFormatted(fmtEng(r.C, 'F', 5)) },
    { label: text.tableMin.charge, ...splitFormatted(fmtEng(r.charge, 'C', 5)) },
    { label: text.tableMin.dI, ...splitFormatted(fmtEng(r.deltaI, 'A', 4)) },
    { label: text.tableMin.dT, ...splitFormatted(fmtEng(r.deltaT, 's', 4)) },
    { label: text.tableMin.dV, ...splitFormatted(fmtVolt(r.deltaV)) },
    { label: text.tableMin.includesEsrEsl, value: text.words.yesNo(r.includesEsrEsl) },
  ]
}

function networkItemRows(r, text) {
  return r.items.map((it, i) => ({
    label: text.tableNet.rowCell(i, it),
    value: `${fmtRes(it.group ? it.group.mag : NaN, 3)} · SRF `
      + `${it.srf != null ? fmtEng(it.srf, 'Hz', 3) : text.words.dash} · `
      + `${it.single ? text.words.reactive(it.single.aboveSrf) : text.words.dash}`,
  }))
}

function networkBankRows(r, text) {
  return r.items.map((it, i) => ({
    label: text.tableNet.bankCell(i, it),
    value: `${fmtEng(it.bank ? it.bank.Ceq : NaN, 'F', 3)} · `
      + `ESR ${fmtRes(it.bank ? it.bank.ESReq : NaN, 3)} · `
      + `ESL ${fmtEng(it.bank ? it.bank.ESLeq : NaN, 'H', 3)}`,
  }))
}

function networkResults(r, text) {
  return [
    { label: text.bigNet.label(r.f), ...splitFormatted(fmtRes(r.mag, 4)), emphasis: true },
    ...networkItemRows(r, text),
    ...networkBankRows(r, text),
    { label: text.tableNet.mag, ...splitFormatted(fmtRes(r.mag, 5)) },
    { label: text.tableNet.re, ...splitFormatted(fmtRes(r.re, 4)) },
    { label: text.tableNet.im, value: `${fmtRes(r.im, 4)} (${text.words.reactive(r.inductive)})` },
    { label: text.tableNet.count, value: fmt(r.count, 4) },
    { label: text.tableNet.aboveCount, value: `${fmt(r.aboveCount, 3)} / ${fmt(r.items.length, 3)}` },
    {
      label: text.tableNet.noEslCount,
      value: `${fmt(r.noEslCount, 3)} / ${fmt(r.items.length, 3)}`
        + (r.noEslCount > 0 ? text.tableNet.noEslSub : ''),
    },
    {
      label: text.tableNet.peak,
      value: r.peak ? `${fmtEng(r.peak.f, 'Hz', 4)} · ${fmtRes(r.peak.mag, 4)}` : text.words.noPeak,
    },
    ...(r.peak && r.peakWorstSingle != null
      ? [{
        label: text.tableNet.peakWorstSingle,
        value: `${fmtRes(r.peakWorstSingle, 4)} (${text.tableNet.peakCompare(r.peakAbove)})`,
      }]
      : []),
    { label: text.tableNet.idealSharing, value: text.words.yesNo(r.idealSharing) },
    { label: text.tableNet.mountingIncluded, value: text.words.yesNo(false) },
  ]
}

export function buildReportSection({ mode, f, r, s, text }) {
  if (!r.ok) return null

  return {
    toolName: text.title,
    mode: text.modeLabel[mode],
    inputs: inputRows(mode, f, text),
    formula: text.formula[mode].split('\n').map((line) => line.trim()).filter(Boolean),
    results: mode === MODE_MIN ? minResults(r, text) : networkResults(r, text),
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: mode === MODE_MIN ? text.schematic.captionMin : text.schematic.captionNet,
    chart: chartSection(r, s, text),
  }
}
