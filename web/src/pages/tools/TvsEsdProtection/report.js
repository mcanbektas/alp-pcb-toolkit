// TVS ve ESD Koruma Boyutlandırıcısı — rapor bölümü (REV2 §14).
//
// Ekranla (index.jsx) aynı `r`/`s`/`text` kaynağından aynı satırları üretir;
// ekranla rapor arasındaki kayma riski böylece en aza iner. Saf: React, DOM
// ve ağ bilmez.

import { sampleIndices } from '../../../components/LineChart'
import { splitFormatted } from '../../../lib/reportPayload'
import { fmtVolt, fmtAmp, fmtRes, fmtPow, fmtEng } from '../../../lib/num'
import { formFields } from './model'

const fmtJoule = (x) => fmtEng(x, 'J', 3)
const fmtHertz = (x) => fmtEng(x, 'Hz', 4)

// Girdi satırları model.js'in kendi `formFields()`inden kurulur — ekranla
// aynı alan listesi, aynı etiketler. Kapalı seçenekli (Segmented/checkbox)
// alanlar `formFields` dışında kaldığı için elle eklenir; ReturnPathStitchingVia
// / ThermalVia'daki planeType/bandwidthMethod ile aynı gerekçe.
function inputRows(f, text) {
  const specs = formFields(f, text.fieldLabels)
  const rows = []

  for (const spec of specs) {
    const raw = f[spec.key]
    if (raw === '' || raw === null || raw === undefined) continue
    const unit = spec.unitKey ? f[spec.unitKey] : (spec.unit || null)
    rows.push({ label: text.fieldLabels[spec.key] ?? spec.key, value: raw, unit })
  }

  rows.push({ label: text.table.rDynMode, value: text.rDynModeLabel[f.rDynMode], unit: null })
  if (f.hasEnergy) {
    rows.push({ label: text.table.waveform, value: text.waveformLabel[f.waveform], unit: null })
  }

  return rows
}

function chartSection(s, text) {
  if (!s) return null
  // Ekran veri tablosunu `every={8}` ile seyreltiyor (index.jsx); rapor aynı
  // örneklemeyi kullanmazsa aynı grafiğin tablosu raporda sekiz katı satır
  // taşır. Seyreltme kuralı tek yerdedir: `sampleIndices`.
  const indices = sampleIndices(s.rows.length, 8)
  return {
    title: text.sweepLabel[s.param],
    svg: null, // ReportDialog canlı DOM'dan yakalar
    table: {
      columns: [text.sweepAxis[s.param], text.sweepYLabel[s.param]],
      rows: indices.map((i) => [fmtEng(s.rows[i].x, '', 3), fmtEng(s.rows[i].y, '', 3)]),
    },
  }
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  const results = [
    { label: text.resultCurrentLabel, ...splitFormatted(fmtAmp(r.solver.current)), emphasis: true },
    { label: text.table.method, value: text.methodLabel[r.solver.method], unit: null },
  ]

  if (r.solver.method === 'bisection') {
    results.push({
      label: text.table.iterations,
      value: `${r.solver.iterations} / ${r.solver.expansions}`,
      unit: null,
    })
  }

  results.push(
    { label: text.table.rDyn, ...splitFormatted(fmtRes(r.rDyn)) },
    { label: text.table.vClamp, ...splitFormatted(fmtVolt(r.vClamp)) },
    { label: text.table.peakPower, ...splitFormatted(fmtPow(r.peakPower)) },
  )

  if (r.energy != null) {
    results.push({ label: text.table.energy, ...splitFormatted(fmtJoule(r.energy)) })
  }
  if (r.overshoot) {
    results.push(
      { label: text.table.overshootVL, ...splitFormatted(fmtVolt(r.overshoot.vL)) },
      { label: text.table.icPeak, ...splitFormatted(fmtVolt(r.overshoot.icPeak)) },
    )
  }
  if (r.capacitanceCutoffHz != null) {
    results.push({ label: text.table.capCutoff, ...splitFormatted(fmtHertz(r.capacitanceCutoffHz)) })
  }

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption,
    chart: chartSection(s, text),
  }
}
