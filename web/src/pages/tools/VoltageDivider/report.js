// Gerilim bölücü ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`s`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.

import { fmt, fmtRes, fmtAmp, fmtPow, fmtVolt, fmtPct } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { errorPct } from '../../../lib/eseries'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, MODE_SYNTHESIS } from './model'

function inputRows(mode, f, text) {
  // `series` (E serisi seçimi) formFields'ta yok — compute() onu doğrulamaz,
  // yalnızca aday aramada okunur — ama ekranda görünen bir SelectField'tır.
  // ResistorCode/report.js'teki kindInputs ile aynı gerekçeyle elle eklenir.
  const extra = mode === MODE_SYNTHESIS
    ? [{ label: text.fields.series.label, value: f.series }]
    : []

  return [
    ...extra,
    ...formFields(mode, f, text.fieldLabels)
      .filter((field) => f[field.key] !== '' && f[field.key] != null)
      .map((field) => ({
        label: field.label,
        value: f[field.key],
        unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
      })),
  ]
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır,
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg).
function chartSection(s, text) {
  if (!s) return null
  // Ekrandaki <ChartDataTable every={5} .../> ile aynı örnekleme kuralı
  // (sampleIndices): son nokta (asimptot) her zaman dahil edilir, yalnızca
  // her 5. indeksle sınırlı kalınmaz — aksi halde dışa aktarılan tablo
  // ekranda görünenden eksik olur.
  return {
    title: text.sweepCaption[s.param],
    svg: null,
    table: {
      columns: [text.sweepAxis[s.param], 'V_out'],
      rows: sampleIndices(s.rows.length, 5).map((i) => [fmt(s.rows[i].x, 3), fmt(s.rows[i].y, 3)]),
    },
  }
}

export function buildReportSection({ mode, f, r, s, text }) {
  if (!r.ok) return null

  const results = [
    {
      label: r.RL !== null ? text.bigResultLoaded(r.RL) : text.bigResultUnloaded,
      ...splitFormatted(fmtVolt(r.Vout)),
      emphasis: true,
    },
    { label: 'R1', ...splitFormatted(fmtRes(r.R1, 3)) },
    { label: 'R2', ...splitFormatted(fmtRes(r.R2, 3)) },
  ]

  // Sentez modunda büyük sonucun "alt" satırında hedef değer ve sapma birlikte
  // gösterilir — ekrandaki gibi tek satırda birleştirilir (ResistorCode'daki
  // nearestE24/nearestE96 desenindeki gibi, splitFormatted'a gerek yok).
  if (r.targetVout != null) {
    results.push({
      label: text.table.targetDeviation,
      value: `${fmtVolt(r.targetVout)} (${text.pct(fmtPct(errorPct(r.Vout, r.targetVout)))})`,
    })
  }

  if (r.tolerance) {
    results.push({
      label: text.table.tolWindow,
      value: `${fmtVolt(r.tolerance.min)} · ${fmtVolt(r.tolerance.nom)} · ${fmtVolt(r.tolerance.max)}`,
    })
  }

  results.push({ label: text.table.unloadedOut, ...splitFormatted(fmtVolt(r.base.Vout)) })

  if (r.RL !== null) {
    results.push(
      { label: text.table.r2ParRL, ...splitFormatted(fmtRes(r.base.loaded.R2eff)) },
      { label: text.table.loadCurrent, ...splitFormatted(fmtAmp(r.base.loaded.IL)) },
    )
  }

  results.push(
    {
      label: text.table.dividerCurrent,
      ...splitFormatted(fmtAmp(r.RL !== null ? r.base.loaded.Idiv : r.base.Idiv)),
    },
    { label: text.table.sourceImpedance, ...splitFormatted(fmtRes(r.Zout)) },
    { label: text.table.p1, ...splitFormatted(fmtPow(r.base.P1)) },
    { label: text.table.p2, ...splitFormatted(fmtPow(r.base.P2)) },
    {
      label: text.table.totalPower,
      ...splitFormatted(fmtPow(r.Vin * (r.RL !== null ? r.base.loaded.Idiv : r.base.Idiv))),
    },
  )

  return {
    toolName: text.title,
    mode: mode === MODE_SYNTHESIS ? text.modeSynthesis : text.modeAnalysis,
    inputs: inputRows(mode, f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: r.findings
      .map((fd) => ({ level: fd.level, text: text.findingText(fd) }))
      .filter((n) => n.text),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: r.RL !== null ? text.schematic.captionLoaded : text.schematic.captionUnloaded,
    chart: chartSection(s, text),
  }
}
