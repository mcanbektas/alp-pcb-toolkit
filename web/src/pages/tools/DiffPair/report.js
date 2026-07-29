// Diferansiyel çift ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`s`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.

import { fmt, fmtEng, fmtRes } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { formFields, MODE_SYNTHESIS, STRUCT_MICROSTRIP, STRUCT_STRIPLINE } from './model'

// formFields() (model.js) etiketleri hata mesajı amaçlı genel `fieldLabels`
// sözlüğünden alır; index.jsx ise H için yapıya, W/S için sentez modunda
// "sabit" olup olmadığına göre ayrı bir metin seçer (bkz. index.jsx satır
// 112-135). Rapor ekranla aynı satırı göstersin diye (plan §8 R6) bu iki alan
// burada aynı koşullarla yeniden etiketlenir.
function labelFor(field, f, mode, text) {
  if (field.key === 'H') {
    return f.structure === STRUCT_MICROSTRIP ? text.fields.HMicrostrip : text.fields.HStripline
  }
  if (mode === MODE_SYNTHESIS && field.key === 'W') return text.fields.WFixed.label
  if (mode === MODE_SYNTHESIS && field.key === 'S') return text.fields.SFixed.label
  return field.label
}

function inputRows(f, mode, text) {
  return formFields(f, mode, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: labelFor(field, f, mode, text),
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır,
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg). Sütun
// başlıkları ve değer biçimi index.jsx'teki LineChart eksen biçimiyle aynı
// (bare fmt, sig=3) — ChartDataTable'ın kendi birim ekli formatX/formatY'siyle
// değil, TraceWidth pilotunun kurduğu kalıpla birebir.
function chartSection(r, s, text) {
  if (!s) return null
  const meta = s.sweepSpacing ? text.chartSpacing : text.chartWidth
  return {
    title: meta.caption,
    svg: null,
    table: {
      columns: [meta.x, 'Z_diff', 'Z_odd'],
      rows: s.rows.filter((_, i) => i % 6 === 0).map((row) => [fmt(row.x, 3), fmt(row.y, 3), fmt(row.odd, 3)]),
    },
  }
}

export function buildReportSection({ mode, f, r, s, text }) {
  if (!r.ok) return null

  const big = r.mode === MODE_SYNTHESIS
    ? {
      label: r.solvedFor === 'S' ? text.bigResultSpacing : text.bigResultWidth,
      ...splitFormatted(fmtEng(r.solvedFor === 'S' ? r.S : r.W, 'm', 4)),
      emphasis: true,
    }
    : { label: text.bigResultZdiff, ...splitFormatted(fmtRes(r.Zdiff, 4)), emphasis: true }

  const results = [
    big,
    { label: text.table.zdiff, ...splitFormatted(fmtRes(r.Zdiff, 5)) },
    { label: text.table.zodd, ...splitFormatted(fmtRes(r.Zodd, 5)) },
    { label: text.table.zeven, ...splitFormatted(fmtRes(r.Zeven, 5)) },
    { label: text.table.zcommon, ...splitFormatted(fmtRes(r.Zcommon, 5)) },
    { label: text.table.z0, ...splitFormatted(fmtRes(r.Z0, 5)) },
    { label: text.table.twiceZ0, ...splitFormatted(fmtRes(2 * r.Z0, 5)) },
    { label: text.table.coupling, value: fmt(r.coupling, 5) },
    { label: text.table.ratio, value: fmt(r.ratio, 4) },
    { label: text.table.epsEff, value: fmt(r.epsEff, 5) },
    { label: text.table.tpd, value: fmt(r.tpdPsPerMm, 4), unit: 'ps/mm' },
    { label: text.table.geometry, value: `${fmtEng(r.W, 'm', 4)} · ${fmtEng(r.S, 'm', 4)}` },
  ]

  return {
    toolName: text.title,
    mode: mode === MODE_SYNTHESIS ? text.modeSynthesis : text.modeAnalysis,
    inputs: inputRows(f, mode, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: r.structure === STRUCT_STRIPLINE ? text.schematic.captionStripline : text.schematic.captionMicrostrip,
    chart: chartSection(r, s, text),
  }
}
