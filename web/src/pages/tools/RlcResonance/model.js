// RLC rezonans ekranının hesap modeli (spec §9.9).
// Saf: React, DOM ve gösterim bilmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { RESISTANCE, CAPACITANCE, INDUCTANCE, FREQUENCY } from '../../../lib/units'
import { seriesRLC } from '../../../lib/reactance'
import { nearestValue } from '../../../lib/eseries'
import { solveBounded } from '../../../lib/solve'

export const MODE_ANALYSIS = 'ana'
export const MODE_SYNTHESIS = 'syn'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_NO_SOLUTION = 'no-solution'

export const INITIAL_FORM = {
  Rr: '10', Rru: 'Ω',
  L: '1', Lu: 'µH',
  C: '1', Cu: 'nF',
  freq: '5', frequ: 'MHz',
  targetF0: '5', targetF0u: 'MHz',
}

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// bu dosya dil bilmez. Etiket verilmezse alan anahtarı gösterilir — sessiz
// boşluk yerine teşhis edilebilir bir ad.
export function formFields(mode, f, labels = {}) {
  const L = (key) => labels[key] ?? key

  return fieldsFor([
    [
      { key: 'Rr', label: L('Rr'), unitKey: 'Rru', table: RESISTANCE, min: 0, allowZero: true },
      { key: 'L', label: L('L'), unitKey: 'Lu', table: INDUCTANCE, min: 0 },
    ],
    when(mode === MODE_ANALYSIS, [
      { key: 'C', label: L('C'), unitKey: 'Cu', table: CAPACITANCE, min: 0 },
      { key: 'freq', label: L('freq'), unitKey: 'frequ', table: FREQUENCY, min: 0 },
    ]),
    when(mode === MODE_SYNTHESIS, [
      { key: 'targetF0', label: L('targetF0'), unitKey: 'targetF0u', table: FREQUENCY, min: 0 },
    ]),
  ])
}

export function compute(mode, f, labels = {}) {
  const read = readForm(f, formFields(mode, f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values

  if (mode === MODE_SYNTHESIS) {
    // f₀ = 1/(2π√(LC)) → C = 1/(L·(2πf₀)²). Kapalı çözüm var, yine de sonuç
    // sınırlandırılmış kök aramayla doğrulanır: L veya f₀ uçlarda ise kapalı
    // form sessizce fiziksel olmayan bir değer üretebilir.
    const w0 = 2 * Math.PI * v.targetF0
    const Cclosed = 1 / (v.L * w0 * w0)
    const F = (C) => 1 / (2 * Math.PI * Math.sqrt(v.L * C)) - v.targetF0
    const solved = solveBounded(F, { x0: Cclosed, min: 1e-18, max: 1 })
    if (solved.error) return { ok: false, reason: REASON_NO_SOLUTION }

    const C = solved.value
    const at = seriesRLC({ R: v.Rr, L: v.L, C, f: v.targetF0 })
    return {
      ok: true, mode,
      R: v.Rr, L: v.L, C, f: v.targetF0,
      targetF0: v.targetF0,
      solvedBy: solved.method,
      nearestC: nearestValue(C * 1e12, 'E24'), // pF cinsinden standart değer
      ...at,
    }
  }

  const at = seriesRLC({ R: v.Rr, L: v.L, C: v.C, f: v.freq })
  if (at.error) return { ok: false, reason: REASON_INCOMPLETE }
  return { ok: true, mode, R: v.Rr, L: v.L, C: v.C, f: v.freq, ...at }
}

// --- Parametrik grafik ---

function logSweep(from, to, steps, fn) {
  const rows = []
  const a = Math.log10(from)
  const b = Math.log10(to)
  for (let i = 0; i < steps; i++) {
    const x = Math.pow(10, a + ((b - a) * i) / (steps - 1))
    rows.push({ x, y: fn(x) })
  }
  return rows
}

export function buildSweep(r) {
  if (!r.ok) return null
  if (!(r.f0 > 0)) return null

  // Frekansa göre empedans büyüklüğü — rezonans çukuru burada görünür
  const rows = logSweep(r.f0 / 100, r.f0 * 100, 90, (f) => {
    const z = seriesRLC({ R: r.R, L: r.L, C: r.C, f })
    return z.error ? NaN : z.magnitude
  })
  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    marker: { x: r.f, y: r.magnitude },
    refs: [{ key: 'esr', y: r.R }],
    f0: r.f0,
  }
}
