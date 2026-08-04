// Kristal yük kapasitansı ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`s`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.

import { fmt, fmtPct } from '../../../lib/num'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, MODE_SYNTHESIS } from './model'

function inputRows(mode, f, text) {
  return formFields(mode, f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))
}

function bigResult(r, text) {
  const label = r.mode === MODE_SYNTHESIS ? text.big.requiredCaps : text.big.loadCap
  const value = r.mode === MODE_SYNTHESIS ? r.C : r.achieved
  return { label, value: fmt(value, 4), unit: 'pF', emphasis: true }
}

// Kristal sonuç satırları — ekranın `.result-table` bloğuyla birebir aynı
// sırada, "Standart değerle" alt başlığı hariç (o bir tablo ara başlığı, veri
// değil; LengthConverter/ResistorCode pilotlarında da mini-head satırları
// raporda tekrarlanmıyor).
function crystalResults(r, text) {
  const rows = []

  if (r.mode === MODE_SYNTHESIS) {
    rows.push(
      { label: text.table.targetCL, value: fmt(r.CL, 4), unit: 'pF' },
      { label: text.table.computedCaps, value: fmt(r.C, 5), unit: 'pF' },
      { label: text.table.achievedWithComputed, value: fmt(r.achieved, 5), unit: 'pF' },
      {
        label: text.table.e24,
        value: `${fmt(r.nearest.value, 4)} pF · ${fmt(r.withStandard, 4)} pF · `
          + `${text.pct(fmtPct(r.standardErrPct))}`,
      },
    )
  } else {
    rows.push(
      { label: 'C1', value: fmt(r.C1, 4), unit: 'pF' },
      { label: 'C2', value: fmt(r.C2, 4), unit: 'pF' },
      { label: text.table.achieved, value: fmt(r.achieved, 5), unit: 'pF' },
    )
  }

  rows.push(
    { label: text.table.stray, value: fmt(r.Cstray, 4), unit: 'pF' },
    { label: text.table.pinCaps, value: `${fmt(r.Cin, 3)} / ${fmt(r.Cout, 3)} pF` },
  )

  return rows
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır.
// Sütun biçimlendirmesi ekranın `formatX`/`formatY` çağrılarıyla birebir aynı.
function chartSection(r, s, text) {
  if (!s) return null

  const chartMeta = text.chart[s.kind]
  const formatX = (v) => `${fmt(v, 4)} pF`
  const formatY = (v) => fmt(v, 4)

  const columns = [chartMeta.x, text.chart.series[s.kind]]

  return {
    title: chartMeta.caption,
    svg: null,
    table: {
      // Ekrandaki <ChartDataTable every={6} .../> ile aynı örnekleme kuralı
      // (sampleIndices): son nokta her zaman dahil.
      columns,
      rows: sampleIndices(s.rows.length, 6).map((i) => {
        const row = s.rows[i]
        return [formatX(row.x), formatY(row.y)]
      }),
    },
  }
}

export function buildReportSection({ mode, f, r, s, text }) {
  if (!r.ok) return null

  return {
    toolName: text.title,
    mode: mode === MODE_SYNTHESIS ? text.modeSynthesis : text.modeAnalysis,
    inputs: inputRows(mode, f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results: [bigResult(r, text), ...crystalResults(r, text)],
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption,
    chart: chartSection(r, s, text),
  }
}
