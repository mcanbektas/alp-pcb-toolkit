// Ohm kanunu ve seri/paralel direnç birleşimi ekranının rapor bölümü. Saf:
// React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.

import {
  fmt, fmtEng, fmtRes, fmtAmp, fmtPow, fmtVolt,
} from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import {
  formFields, TOOL_OHM, TOOL_COMBO, COMBO_SERIES,
} from './model'

// TOOL_COMBO alanları (combo, values) `formFields()`'tan geçmez: doğrulaması
// `parseValueList` ile ayrı yapılır (bkz. model.js compute()). Bu yüzden
// girdi satırları burada elle kurulur, tıpkı ResistorCode'un KIND_SMD/KIND_CAP
// dallarında olduğu gibi.
function inputRows(tool, f, text) {
  if (tool === TOOL_COMBO) {
    return [
      { label: text.fields.combo, value: text.comboLabel[f.combo] },
      { label: text.fields.values.label, value: f.values },
    ]
  }

  return formFields(tool, f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))
}

function ohmResults(r, text) {
  const rows = [
    { label: text.big.ohmLabel, ...splitFormatted(fmtPow(r.P, 4)), emphasis: true },
    { label: text.table.voltage, ...splitFormatted(fmtVolt(r.V)) },
    { label: text.table.current, ...splitFormatted(fmtAmp(r.I)) },
    { label: text.table.resistance, ...splitFormatted(fmtRes(r.R)) },
    { label: text.table.power, ...splitFormatted(fmtPow(r.P)) },
  ]
  if (r.inconsistency != null) {
    rows.push({ label: text.table.inconsistency, value: fmt(r.inconsistency * 100, 3), unit: '%' })
  }
  return rows
}

function comboResults(r, text) {
  const shareLabel = r.combo === COMBO_SERIES ? text.table.shareSeries : text.table.shareParallel
  return [
    { label: text.big.comboLabel(r.combo), ...splitFormatted(fmtRes(r.equivalent, 4)), emphasis: true },
    { label: text.table.shareHead, value: shareLabel },
    ...r.values.map((x, i) => ({
      label: fmtRes(x, 4),
      value: fmt(r.shares[i] * 100, 3),
      unit: '%',
    })),
  ]
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır,
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg). Seri/paralel
// birleşimin taranacak sürekli bir parametresi yok, `s` o durumda hep null.
function chartSection(s, text) {
  if (!s) return null
  const meta = text.chart[s.kind]
  return {
    title: meta.caption,
    svg: null,
    table: {
      // Ekrandaki <ChartDataTable every={6} .../> ile aynı örnekleme kuralı
      // (sampleIndices): son nokta her zaman dahil. 70 noktalı taramalarda
      // düz `i % 6` filtresi son satırı düşürüyordu.
      columns: [meta.x, meta.y],
      rows: sampleIndices(s.rows.length, 6).map((i) => [fmtEng(s.rows[i].x, '', 4), fmt(s.rows[i].y, 4)]),
    },
  }
}

// schematic.jsx'teki CircuitSchematic ile birebir aynı türetme (bkz. orada
// `const caption = text.caption[tool] ?? (...)`) — ekrandaki <figcaption>
// yalnızca <svg>'in kardeşi olduğu için schematicRef üzerinden yakalanamaz,
// bu yüzden metni burada ayrıca hesaplayıp `schematicCaption` alanına koymak
// gerekir (bkz. ReportPayload.cs SchematicCaption).
function schematicCaption(r, text) {
  return text.schematic.caption[r.tool]
    ?? (r.combo === COMBO_SERIES ? text.schematic.captionSeries : text.schematic.captionParallel)
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  const results = r.tool === TOOL_OHM ? ohmResults(r, text) : comboResults(r, text)

  return {
    toolName: text.title,
    mode: text.toolLabel[r.tool],
    inputs: inputRows(r.tool, f, text),
    formula: text.formula[r.tool].split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: schematicCaption(r, text),
    chart: chartSection(s, text),
  }
}
