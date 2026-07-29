// RC/RL zaman sabiti ve kristal ekranının rapor bölümü. Saf: React, DOM, ağ
// bilmez. docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan,
// aynı `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.
//
// Bu ekranda iki bağımsız eksen var: `f.tool` (rc/rl/crystal — ResistorCode'daki
// `kind` ile aynı rol) ve `mode` (ana/syn). `mode` alanı ResistorCode'daki
// örüntüyle tutarlı biçimde araç adını taşır (`text.toolLabel[r.tool]`), analiz/
// sentez etiketini değil — o zaten `results`/`formula` dallanmasına yansır.

import { fmt, fmtEng, fmtAmp, fmtPct } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import {
  formFields, TOOL_RC, TOOL_RL, TOOL_CRYSTAL, MODE_SYNTHESIS,
} from './model'

function inputRows(mode, f, text) {
  return formFields(f.tool, mode, f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))
}

function bigResult(r, text) {
  if (r.tool === TOOL_CRYSTAL) {
    const label = r.mode === MODE_SYNTHESIS ? text.big.requiredCaps : text.big.loadCap
    const value = r.mode === MODE_SYNTHESIS ? r.C : r.achieved
    return { label, value: fmt(value, 4), unit: 'pF', emphasis: true }
  }

  if (r.mode === MODE_SYNTHESIS) {
    const label = r.tool === TOOL_RC ? text.big.requiredC : text.big.requiredL
    const value = r.tool === TOOL_RC ? r.C : r.L
    const unit = r.tool === TOOL_RC ? 'F' : 'H'
    return { label, ...splitFormatted(fmtEng(value, unit, 4)), emphasis: true }
  }

  return { label: text.big.tau, ...splitFormatted(fmtEng(r.tau, 's', 4)), emphasis: true }
}

// RC/RL sonuç satırları — ekranın `.result-table` bloğuyla birebir aynı
// sırada, "Yerleşme" alt başlığı hariç (o bir tablo ara başlığı, veri değil;
// LengthConverter/ResistorCode pilotlarında da mini-head satırları raporda
// tekrarlanmıyor).
function timingResults(r, text) {
  const rows = [
    { label: text.table.tau, ...splitFormatted(fmtEng(r.tau, 's', 5)) },
    { label: text.table.rise, ...splitFormatted(fmtEng(r.riseTime1090, 's', 5)) },
  ]

  for (const st of r.steps) {
    rows.push({ label: `${st.n}τ`, value: `${fmtEng(st.time, 's', 4)} · ${text.pct(fmt(st.pct, 4))}` })
  }

  rows.push({
    label: r.tool === TOOL_RC ? text.table.peakCurrent : text.table.steadyCurrent,
    ...splitFormatted(fmtAmp(r.Ifinal, 4)),
  })

  if (r.mode === MODE_SYNTHESIS) {
    const nearest = r.tool === TOOL_RC ? r.nearestC : r.nearestL
    const unit = r.tool === TOOL_RC ? 'nF' : 'µH'
    rows.push({
      label: text.table.nearestE24,
      value: `${fmt(nearest.value, 4)} ${unit} (${text.pct(fmtPct(nearest.errorPct))})`,
    })
  }

  return rows
}

// Kristal sonuç satırları — "Standart değerle" ara başlığı hariç, aynı
// gerekçeyle yukarıdaki gibi atlanır.
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

  const isTiming = r.tool === TOOL_RC || r.tool === TOOL_RL
  const chartMeta = text.chart[s.kind]
  const formatX = (v) => (isTiming ? fmtEng(v, 's', 4) : `${fmt(v, 4)} pF`)
  const formatY = (v) => fmt(v, 4)

  const columns = [chartMeta.x, text.chart.series[s.kind]]
  if (s.dischargePoints) columns.push(text.chart.discharge)

  return {
    title: chartMeta.caption,
    svg: null,
    table: {
      columns,
      rows: s.rows.filter((_, i) => i % 6 === 0).map((row) => {
        const out = [formatX(row.x), formatY(row.y)]
        if (s.dischargePoints) out.push(formatY(row.discharge))
        return out
      }),
    },
  }
}

export function buildReportSection({ mode, f, r, s, text }) {
  if (!r.ok) return null

  const isTiming = r.tool === TOOL_RC || r.tool === TOOL_RL

  return {
    toolName: text.title,
    mode: text.toolLabel[r.tool],
    inputs: inputRows(mode, f, text),
    formula: text.formula[r.tool].split('\n').map((line) => line.trim()).filter(Boolean),
    results: [bigResult(r, text), ...(isTiming ? timingResults(r, text) : crystalResults(r, text))],
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption[r.tool],
    chart: chartSection(r, s, text),
  }
}
