// Via stub ve backdrill hesaplayıcısı ekranının rapor bölümü.
// Saf: React, DOM, ağ bilmez. Ekranla aynı `r`/`s`/`text` kaynağından aynı
// satırları üretir; ekranla rapor arasındaki kayma riski böylece en aza iner.

import { fmt, fmtEng } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
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

function chartSection(s, text) {
  if (!s) return null
  const indices = sampleIndices(s.rows.length, 8)
  return {
    title: text.sweepCaption[s.param],
    svg: null,
    table: {
      columns: [text.sweepAxis[s.param], text.sweepLabel[s.param]],
      rows: indices.map((i) => [fmt(s.rows[i].x, 3), fmt(s.rows[i].y, 4)]),
    },
  }
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  const results = [
    { label: text.bigResultLabel, ...splitFormatted(fmtEng(r.resonance, 'Hz', 4)), emphasis: true },
    { label: text.table.stub, ...splitFormatted(fmtEng(r.stub, 'm', 4)) },
    { label: text.table.velocity, ...splitFormatted(fmtEng(r.velocity, 'm/s', 4)) },
    { label: text.table.roundTrip, ...splitFormatted(fmtEng(r.roundTrip, 's', 4)) },
    { label: text.table.harmonics, value: r.harmonics.map((h) => fmtEng(h, 'Hz', 3)).join(' · ') },
  ]

  if (r.kt != null) {
    results.push({ label: text.table.kt, value: `${fmt(r.kt, 4)} — ${text.ktClassLabel(r.ktClass)}` })
  }
  if (r.margin != null) {
    results.push({ label: text.table.margin, value: `${fmt(r.margin, 4)}×` })
  }

  if (r.residual) {
    results.push(
      { label: text.table.residualNominal, ...splitFormatted(fmtEng(r.residual.nominal, 'm', 4)) },
      { label: text.table.residualWorst, ...splitFormatted(fmtEng(r.residual.worstCase, 'm', 4)) },
      { label: text.table.residualBest, ...splitFormatted(fmtEng(r.residual.bestCase, 'm', 4)) },
      // Stub tamamen kalktığında rezonans yoktur (`null`) — ekranla aynı
      // gösterim, aynı kaynak.
      r.residual.resonanceNominal != null
        ? { label: text.table.resonanceNominal, ...splitFormatted(fmtEng(r.residual.resonanceNominal, 'Hz', 4)) }
        : { label: text.table.resonanceNominal, value: '—', unit: null },
      r.residual.resonanceWorstCase != null
        ? { label: text.table.resonanceWorst, ...splitFormatted(fmtEng(r.residual.resonanceWorstCase, 'Hz', 4)) }
        : { label: text.table.resonanceWorst, value: '—', unit: null },
      {
        label: text.table.resonanceGain,
        value: r.residual.resonanceGain != null ? `${fmt(r.residual.resonanceGain, 4)}×` : '—',
      },
    )
  }

  if (r.backdrillTarget) {
    results.push({ label: text.table.targetAllowed, ...splitFormatted(fmtEng(r.backdrillTarget.allowed, 'm', 4)) })
    if (!r.backdrillTarget.error) {
      results.push(
        { label: text.table.targetNominal, ...splitFormatted(fmtEng(r.backdrillTarget.nominalTarget, 'm', 4)) },
        { label: text.table.targetRemoval, ...splitFormatted(fmtEng(r.backdrillTarget.requiredRemoval, 'm', 4)) },
      )
    }
  }

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption(r.hasBackdrill && !!r.residual),
    chart: chartSection(s, text),
  }
}
