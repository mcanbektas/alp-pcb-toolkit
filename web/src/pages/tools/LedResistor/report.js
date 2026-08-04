// LED seri direnci ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.
//
// Brif 11 §C: LedOhmRlc'nin TOOL_LED alt-aracından bölündü — davranış birebir
// korunur, yeni özellik eklenmedi.

import { fmt, fmtEng, fmtRes, fmtAmp, fmtPow, fmtVolt, fmtPct } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import { formFields } from './model'

function inputRows(f, text) {
  return formFields(f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      // `n` alanının birimi model.js'te dil bilmeyen 'adet' sabitiyle
      // (COUNT tablosunun anahtarı) tutulur; ekranda gösterilen birim
      // `text.fields.countUnit` ile dile göre değişir ("adet" / "pcs").
      // Bu satır olmasaydı İngilizce raporda da "adet" basılırdı.
      unit: field.key === 'n'
        ? text.fields.countUnit
        : (field.unitKey ? f[field.unitKey] : (field.unit ?? null)),
    }))
}

function ledResults(r, text) {
  const errPctE24 = (100 * (r.e24.I - r.targetI)) / r.targetI
  const errPctE96 = (100 * (r.e96.I - r.targetI)) / r.targetI
  return [
    { label: text.big.ledLabel, ...splitFormatted(fmtRes(r.R, 4)), emphasis: true },
    { label: text.table.totalLedVoltage, ...splitFormatted(fmtVolt(r.Vled)) },
    { label: text.table.headroom, ...splitFormatted(fmtVolt(r.headroom)) },
    { label: text.table.idealResistance, ...splitFormatted(fmtRes(r.R, 5)) },
    { label: text.table.resistorPower, ...splitFormatted(fmtPow(r.P, 4)) },
    {
      label: text.table.ratedPower,
      value: `${fmtPow(r.Prated, 4)} ${text.table.utilisation(text.pct(fmt(r.derating * 100, 3)))}`,
    },
    { label: text.table.standardHead, value: text.table.standardHeadSub },
    {
      label: 'E24',
      value: `${fmtRes(r.e24.value, 4)} · ${fmtAmp(r.e24.I, 3)} · ${text.pct(fmtPct(errPctE24))}`,
    },
    {
      label: 'E96',
      value: `${fmtRes(r.e96.value, 4)} · ${fmtAmp(r.e96.I, 3)} · ${text.pct(fmtPct(errPctE96))}`,
    },
  ]
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır,
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg).
function chartSection(s, text) {
  if (!s) return null
  return {
    title: text.chart.caption,
    svg: null,
    table: {
      // Ekrandaki <ChartDataTable every={6} .../> ile aynı örnekleme kuralı
      // (sampleIndices): son nokta her zaman dahil. 70 noktalı taramada düz
      // `i % 6` filtresi son satırı düşürüyordu.
      columns: [text.chart.x, text.chart.y],
      rows: sampleIndices(s.rows.length, 6).map((i) => [fmtEng(s.rows[i].x, '', 4), fmt(s.rows[i].y, 4)]),
    },
  }
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results: ledResults(r, text),
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption,
    chart: chartSection(s, text),
  }
}
