// Termal via dizisi ekranının hesap modeli (spec §5.2).
// Saf: React, DOM ve gösterim bilmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { LENGTH, POWER } from '../../../lib/units'
import { thermalVia, thermalViaCount } from '../../../lib/via'
import { K_CU } from '../../../lib/units'

export const MODE_ANALYSIS = 'ana'
export const MODE_SYNTHESIS = 'syn'

export const REASON_INCOMPLETE = 'incomplete'

export const INITIAL_FORM = {
  Df: '0.3', Dfu: 'mm',
  tp: '25', tpu: 'µm',
  H: '1.6', Hu: 'mm',
  N: '9',
  filled: false,
  k: String(K_CU),

  deltaT: '20',
  Q: '2', Qu: 'W',
}

const TEMP = { '°C': 1 }
const COUNT = { adet: 1 }
const COND = { 'W/(m·K)': 1 }
const DIA = { mm: LENGTH.mm, 'µm': LENGTH['µm'], um: LENGTH.um, mil: LENGTH.mil }

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// `lib/` bunları bilmez. Etiket verilmezse alan anahtarı gösterilir.
export function formFields(mode, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'Df', label: L('Df'), unitKey: 'Dfu', table: DIA, min: 0 },
      { key: 'tp', label: L('tp'), unitKey: 'tpu', table: DIA, min: 0 },
      { key: 'H', label: L('H'), unitKey: 'Hu', table: DIA, min: 0 },
      { key: 'k', label: L('k'), unit: 'W/(m·K)', table: COND, min: 0 },
      { key: 'deltaT', label: L('deltaT'), unit: '°C', table: TEMP, min: 0 },
    ],
    when(mode === MODE_ANALYSIS, [
      { key: 'N', label: L('N'), unit: 'adet', table: COUNT, min: 1 },
    ]),
    when(mode === MODE_SYNTHESIS, [
      { key: 'Q', label: L('Q'), unitKey: 'Qu', table: POWER, min: 0 },
    ]),
  ])
}

export function compute(mode, f, labels = {}) {
  const read = readForm(f, formFields(mode, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const common = { Df: v.Df, tp: v.tp, H: v.H, filled: f.filled, k: v.k }

  if (mode === MODE_SYNTHESIS) {
    const need = thermalViaCount({ ...common, deltaT: v.deltaT, Q: v.Q })
    if (need.error) return { ok: false, reason: REASON_INCOMPLETE }

    const array = thermalVia({ ...common, N: need.N, deltaT: v.deltaT })
    if (array.error) return { ok: false, reason: REASON_INCOMPLETE }

    return {
      ok: true, mode, ...array,
      deltaT: v.deltaT,
      targetQ: v.Q,
      Rneeded: need.Rneeded,
      // Bulunan sayı hedefi ne kadar aşıyor
      actualQ: v.deltaT / array.Rarray,
    }
  }

  const array = thermalVia({ ...common, N: v.N, deltaT: v.deltaT })
  if (array.error) return { ok: false, reason: REASON_INCOMPLETE }

  return { ok: true, mode, ...array, deltaT: v.deltaT, actualQ: array.Q }
}

// Grafik: via sayısına göre dizi termal direnci
export function buildSweep(r) {
  if (!r.ok) return null

  const maxN = Math.max(36, r.N * 2)
  const rows = []
  for (let n = 1; n <= maxN; n++) {
    rows.push({ x: n, y: r.Rsingle / n })
  }

  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    refs: r.mode === MODE_SYNTHESIS && r.Rneeded > 0 ? [{ key: 'needed', y: r.Rneeded }] : [],
    marker: { x: r.N, y: r.Rarray },
  }
}
