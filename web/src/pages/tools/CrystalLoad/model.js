// Kristal yük kapasitansı ekranının hesap modeli (spec §9.11). Saf: React,
// DOM ve gösterim bilmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { FREQUENCY } from '../../../lib/units'
import { crystalLoad, crystalCapsForLoad, CRYSTAL_ERR_STRAY, CRYSTAL_ERR_PIN } from '../../../lib/crystal'
import { nearestValue } from '../../../lib/eseries'

// Grafik taramasının kendi içindeki etiket (text.chart[kind] anahtarlaması
// için) — dışa seçici olarak sunulmaz, tek araç kaldığı için TOOLS dizisi yok.
export const TOOL_CRYSTAL = 'crystal'

export const MODE_ANALYSIS = 'ana'
export const MODE_SYNTHESIS = 'syn'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_STRAY = CRYSTAL_ERR_STRAY
export const REASON_PIN = CRYSTAL_ERR_PIN

export const INITIAL_FORM = {
  // Kristal — kapasiteler pF cinsinden tutulur
  CL: '12',
  C1: '18', C2: '18',
  Cin: '0', Cout: '0',
  Cstray: '3',
  fXtal: '8', fXtalu: 'MHz',
}

const PF = { pF: 1 } // kristal hesabı kendi içinde pF ile tutarlı

// Alan etiketleri dışarıdan gelir: model dil bilmez. Etiket verilmezse alan
// anahtarı görünür — sessiz boşluk yerine teşhis edilebilir bir ad.
export function formFields(mode, f, labels = {}) { // eslint-disable-line no-unused-vars
  const L = (key) => labels[key] ?? key

  return fieldsFor([
    [
      { key: 'Cstray', label: L('Cstray'), unit: 'pF', table: PF, min: 0, allowZero: true },
      { key: 'Cin', label: L('Cin'), unit: 'pF', table: PF, min: 0, allowZero: true },
      { key: 'Cout', label: L('Cout'), unit: 'pF', table: PF, min: 0, allowZero: true },
      { key: 'fXtal', label: L('fXtal'), unitKey: 'fXtalu', table: FREQUENCY, min: 0, optional: true },
    ],
    when(mode === MODE_ANALYSIS, [
      { key: 'C1', label: L('C1'), unit: 'pF', table: PF, min: 0 },
      { key: 'C2', label: L('C2'), unit: 'pF', table: PF, min: 0 },
    ]),
    when(mode === MODE_SYNTHESIS, [
      { key: 'CL', label: L('CL'), unit: 'pF', table: PF, min: 0 },
    ]),
  ])
}

function computeCrystal(mode, v) {
  if (mode === MODE_SYNTHESIS) {
    const r = crystalCapsForLoad({ CL: v.CL, Cin: v.Cin, Cout: v.Cout, Cstray: v.Cstray })
    if (r.error) return { ok: false, reason: r.error, CL: v.CL, Cstray: v.Cstray, Cp: r.Cp }

    // Seçilen kapasitörle gerçekleşen yük kapasitesi
    const nearest = nearestValue(r.C, 'E24')
    const achieved = crystalLoad({ C1: r.C, C2: r.C, Cin: v.Cin, Cout: v.Cout, Cstray: v.Cstray })
    const withStandard = crystalLoad({
      C1: nearest.value, C2: nearest.value, Cin: v.Cin, Cout: v.Cout, Cstray: v.Cstray,
    })

    return {
      ok: true, mode,
      C: r.C, simplified: r.simplified, Cp: r.Cp,
      CL: v.CL, Cstray: v.Cstray, Cin: v.Cin, Cout: v.Cout,
      achieved: achieved.CL,
      nearest,
      withStandard: withStandard.CL,
      standardErrPct: (100 * (withStandard.CL - v.CL)) / v.CL,
      f: v.fXtal,
    }
  }

  const r = crystalLoad({ C1: v.C1, C2: v.C2, Cin: v.Cin, Cout: v.Cout, Cstray: v.Cstray })
  if (r.error) return { ok: false, reason: REASON_INCOMPLETE }

  return {
    ok: true, mode,
    achieved: r.CL,
    C1: v.C1, C2: v.C2, Cin: v.Cin, Cout: v.Cout, Cstray: v.Cstray,
    f: v.fXtal,
  }
}

export function compute(mode, f, labels = {}) {
  const read = readForm(f, formFields(mode, f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  return computeCrystal(mode, read.values)
}

// --- Parametrik grafik: harici kapasitör değiştikçe gerçekleşen yük kapasitesi ---

export function buildSweep(r) {
  if (!r.ok) return null

  const centre = r.mode === MODE_SYNTHESIS ? r.C : (r.C1 + r.C2) / 2
  if (!(centre > 0)) return null

  const steps = 70
  const from = Math.max(1, centre / 5)
  const to = centre * 5
  const rows = []
  for (let i = 0; i < steps; i++) {
    const C = from + ((to - from) * i) / (steps - 1)
    const load = crystalLoad({ C1: C, C2: C, Cin: r.Cin, Cout: r.Cout, Cstray: r.Cstray })
    rows.push({ x: C, y: load.error ? NaN : load.CL })
  }

  return {
    kind: TOOL_CRYSTAL,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    refs: r.mode === MODE_SYNTHESIS ? [{ key: 'target', y: r.CL }] : [],
    marker: { x: centre, y: r.achieved },
  }
}
