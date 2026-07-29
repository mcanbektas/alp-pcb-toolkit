// Yayılma gecikmesi ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.

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
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg).
function chartSection(s, text) {
  if (!s) return null
  // ChartDataTable (ekrandaki eşdeğeri) `every` adımda örnekler ve son noktayı
  // her zaman ekler (LineChart.jsx) — eğrinin sağ ucu asimptotu taşır. Aynı
  // garanti burada da verilmezse rapor tablosu ekrandakinden bir satır eksik
  // kalabilir.
  const indices = []
  for (let i = 0; i < s.rows.length; i += 6) indices.push(i)
  if (indices.length && indices[indices.length - 1] !== s.rows.length - 1) {
    indices.push(s.rows.length - 1)
  }
  return {
    title: text.chart.caption,
    svg: null,
    table: {
      columns: [text.chart.x, text.legendElectricalLength],
      rows: indices.map((i) => s.rows[i]).map((row) => [fmtEng(row.x, 'Hz', 4), `${fmt(row.y, 4)}°`]),
    },
  }
}

// `lang`: epsEffRows bileşen ortak satırlarını üretmek için zorunludur —
// dört bileşen istisnasından biri olan EpsEffFields'in saf yardımcı
// fonksiyonu, dili doğrudan hook'tan değil parametre olarak alır (bkz.
// EpsEffFields.jsx). Burada geçilmezse satırlar sessizce Türkçeye düşer ve
// İngilizce raporda Türkçe satır çıkar.
export function buildReportSection({ f, r, s, text, lang }) {
  if (!r.ok) return null

  const results = [
    { label: text.bigResult, value: fmt(r.tpdPsPerMm, 4), unit: 'ps/mm', emphasis: true },
    ...epsEffRows(r.eps, fmt, lang).map((row) => ({ label: row.label, value: row.value })),
    { label: text.table.tpd, value: fmt(r.tpdPsPerMm, 5), unit: 'ps/mm' },
    { label: text.table.delay, ...splitFormatted(fmtEng(r.delay, 's', 5)) },
    { label: text.table.vp, ...splitFormatted(fmtEng(r.vp, 'm/s', 5)) },
    { label: text.table.lambda0, ...splitFormatted(fmtEng(r.lambda0, 'm', 5)) },
    { label: text.table.lambdaG, ...splitFormatted(fmtEng(r.lambdaG, 'm', 5)) },
    { label: text.table.quarter, ...splitFormatted(fmtEng(r.quarter, 'm', 5)) },
    { label: text.table.half, ...splitFormatted(fmtEng(r.half, 'm', 5)) },
    { label: text.table.electricalLength, value: `${fmt(r.degrees, 5)}° · ${fmt(r.radians, 5)} rad` },
    { label: text.table.fraction, value: fmt(r.fraction, 5), unit: 'λ' },
    { label: text.table.quarterWaveFreq, ...splitFormatted(fmtEng(r.quarterWaveFreq, 'Hz', 5)) },
  ]

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: r.fraction > 4 ? text.schematic.captionLong : text.schematic.captionShort,
    chart: chartSection(s, text),
  }
}
