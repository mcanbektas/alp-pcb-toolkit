// Uzunluk dönüştürücü ekranının rapor bölümü. Saf.
// docs/uyelik-ve-rapor-plani.md §5.2 — üç pilottan en yalını: tek panel,
// şematik yok, tam bağıntı (yöntem notu gerekmez).

import { fmt } from '../../../lib/num'
import { formFields } from './model'

const UNIT_LABEL = { mm: 'mm', 'µm': 'µm', mil: 'mil', inch: 'inch', cm: 'cm', m: 'm' }

export function buildReportSection({ f, r, text }) {
  if (!r.ok) return null

  const targetLabel = text.unitRow[r.target] ?? r.target

  return {
    toolName: text.title,
    mode: null,
    inputs: [
      ...formFields(text.fieldLabels)
        .filter((field) => f[field.key] !== '' && f[field.key] != null)
        .map((field) => ({
          label: field.label,
          value: f[field.key],
          unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
        })),
      { label: text.fields.target.label, value: targetLabel },
    ],
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results: [
      {
        label: text.bigLabel(targetLabel),
        value: fmt(r.targetValue, r.sig),
        unit: UNIT_LABEL[r.target] ?? r.target,
        emphasis: true,
      },
      { label: text.unitRow.mm, value: fmt(r.all.mm, r.sig), unit: 'mm' },
      { label: text.unitRow['µm'], value: fmt(r.all.um, r.sig), unit: 'µm' },
      { label: text.unitRow.mil, value: fmt(r.all.mil, r.sig), unit: 'mil' },
      { label: text.unitRow.inch, value: fmt(r.all.inch, r.sig), unit: 'inch' },
      { label: text.unitRow.cm, value: fmt(r.all.cm, r.sig), unit: 'cm' },
      { label: text.unitRow.m, value: fmt(r.all.m, r.sig), unit: 'm' },
    ],
    notes: text.commentary(r),
  }
}
