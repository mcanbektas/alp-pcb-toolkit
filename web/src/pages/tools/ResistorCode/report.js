// Direnç/SMD/kondansatör kod çözücü ekranının rapor bölümü. Saf.
// docs/uyelik-ve-rapor-plani.md §5.2. Üç komponent türü (renk bandı, SMD,
// kondansatör) ve iki mod (analiz, sentez) için ayrı girdi/sonuç kümeleri —
// ekrandaki `index.jsx` dallanmasının aynısı, aynı `r` alanlarından okunur.

import { fmt, fmtRes, fmtPct } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import {
  formFields, bandKeys, bandRoles, MODE_SYNTHESIS, KIND_COLOR, KIND_SMD, KIND_CAP,
} from './model'

function kindInputs(f, r, text) {
  if (f.kind === KIND_SMD) {
    return [
      { label: text.fields.smd.label, value: f.smd },
      { label: text.fields.smdProfile.label, value: f.smdProfile === 'standard' ? text.fields.smdProfile.standard : text.fields.smdProfile.manufacturer },
    ]
  }
  if (f.kind === KIND_CAP) {
    return [{ label: text.fields.cap.label, value: f.cap }]
  }
  // KIND_COLOR: her bandın seçili rengi, rolüne göre etiketlenir.
  const bandCount = Number(f.bandCount)
  const keys = bandKeys(f)
  return bandRoles(bandCount).map((role) => ({
    label: text.roleLabel[role.role](role.index),
    value: text.colorName[keys[role.index]],
  }))
}

function bigResult(r, text) {
  if (r.kind === KIND_CAP) {
    return { label: text.big.capacitance, value: fmt(r.nF, 4), unit: 'nF', emphasis: true }
  }
  const label = r.mode === MODE_SYNTHESIS ? text.big.representable : text.big.resistance
  return { label, ...splitFormatted(fmtRes(r.ohms, 4)), emphasis: true }
}

function coreResults(r, text) {
  const rows = []

  if (r.mode === MODE_SYNTHESIS && r.kind === KIND_COLOR) {
    rows.push(
      { label: text.table.bands, value: r.bands.map((b) => text.colorName[b]).join(' · ') },
      { label: text.table.requested, ...splitFormatted(fmtRes(r.requested, 4)) },
    )
  }

  if (r.kind === KIND_CAP) {
    rows.push(
      { label: 'pF', value: fmt(r.pF, 6) },
      { label: 'nF', value: fmt(r.nF, 6) },
      { label: 'µF', value: fmt(r.uF, 6) },
    )
    if (r.toleranceLetter) {
      rows.push({ label: text.table.capTolerance(r.toleranceLetter), value: fmt(r.tolerance, 3), unit: '%' })
    }
    return rows
  }

  if (r.mode !== MODE_SYNTHESIS && r.kind === KIND_COLOR) {
    rows.push({ label: text.table.bands, value: r.bands.map((b) => text.colorName[b]).join(' · ') })
  }
  if (r.kind === KIND_SMD) {
    rows.push({ label: text.table.smdKind, value: text.smdKindLabel[r.smdKind] ?? r.smdKind })
    if (r.base != null) {
      rows.push({ label: text.table.baseTimesMultiplier, value: `${r.base} × ${fmt(r.multiplier, 4)}` })
    }
  }

  rows.push(
    { label: text.table.nearestE24, value: `${fmtRes(r.nearestE24.value, 4)} (${text.pct(fmtPct(r.nearestE24.errorPct))})` },
    { label: text.table.nearestE96, value: `${fmtRes(r.nearestE96.value, 4)} (${text.pct(fmtPct(r.nearestE96.errorPct))})` },
  )

  if (r.tcr != null) {
    rows.push(
      { label: text.table.tcr, value: fmt(r.tcr, 3), unit: 'ppm/°C' },
      {
        label: text.table.resistanceAt(fmt(r.temps.Tref, 3)),
        value: `${fmtRes(r.atTref, 4)} (${text.pct(fmtPct(r.driftPct))})`,
      },
    )
  }

  return rows
}

export function buildReportSection({ mode, f, r, text }) {
  if (!r.ok) return null

  return {
    toolName: text.title,
    mode: text.kindLabel[r.kind],
    inputs: [
      ...kindInputs(f, r, text),
      ...formFields(mode, f, text.fieldLabels)
        .filter((field) => f[field.key] !== '' && f[field.key] != null)
        .map((field) => ({
          label: field.label,
          value: f[field.key],
          unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
        })),
    ],
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results: [bigResult(r, text), ...coreResults(r, text)],
    notes: text.commentary(r),
  }
}
