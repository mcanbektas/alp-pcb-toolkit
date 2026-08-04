// Ohm kanunu ve seri/paralel direnç birleşimi ekranının hesap modeli
// (spec §9.4, §9.5).
// Saf: React, DOM ve gösterim bilmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import {
  RESISTANCE, VOLTAGE, CURRENT, POWER,
} from '../../../lib/units'
import { ohmsLaw, seriesResistance, parallelResistance } from '../../../lib/ohm'
import { nearestValue } from '../../../lib/eseries'
import { parseValueList } from '../../../lib/valueList'

export const TOOL_OHM = 'ohm'
export const TOOL_COMBO = 'combo'
export const TOOLS = [TOOL_OHM, TOOL_COMBO]

export const COMBO_SERIES = 'series'
export const COMBO_PARALLEL = 'parallel'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_OHM_INSUFFICIENT = 'ohm-insufficient'
export const REASON_VALUE_LIST = 'value-list'

export const INITIAL_FORM = {
  tool: TOOL_OHM,

  // Ohm kanunu — boş bırakılan alanlar hesaplanır
  V: '5', Vu: 'V',
  I: '', Iu: 'mA',
  R: '220', Ru: 'Ω',
  P: '', Pu: 'mW',

  // Seri / paralel
  combo: COMBO_PARALLEL,
  // Ayırıcı boşluk: virgül ondalık ayracıdır (4,7k = 4.7 kΩ), listeyi bölmez.
  values: '10k 22k 47k',
}

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// bu dosya dil bilmez. Etiket verilmezse alan anahtarı gösterilir — sessiz
// boşluk yerine teşhis edilebilir bir ad.
export function formFields(tool, f, labels = {}) {
  const L = (key) => labels[key] ?? key

  return fieldsFor([
    when(tool === TOOL_OHM, [
      { key: 'V', label: L('V'), unitKey: 'Vu', table: VOLTAGE, min: 0, optional: true },
      { key: 'I', label: L('I'), unitKey: 'Iu', table: CURRENT, min: 0, optional: true },
      { key: 'R', label: L('R'), unitKey: 'Ru', table: RESISTANCE, min: 0, optional: true },
      { key: 'P', label: L('P'), unitKey: 'Pu', table: POWER, min: 0, optional: true },
    ]),
  ])
}

// "10k 22k 4,7M" gibi bir listenin ayrıştırılması lib/valueList.js'e taşındı: buradaki
// eski uygulama girdiyi ÖNCE virgülden bölüyordu, bu yüzden "4,7k" iki dirence (4 Ω ve
// 7 kΩ) ayrılıyor ve paralel bağlamada ~1000× yanlış sonuç sessizce geçerli görünüyordu.

function computeOhm(v) {
  const r = ohmsLaw({ V: v.V, I: v.I, R: v.R, P: v.P })
  if (r.error) return { ok: false, reason: REASON_OHM_INSUFFICIENT }
  return { ok: true, tool: TOOL_OHM, ...r }
}

function computeCombo(f) {
  const parsed = parseValueList(f.values)
  if (parsed.error) return { ok: false, reason: REASON_VALUE_LIST, valueList: parsed.error, at: parsed.at }

  const values = parsed.values
  const equivalent = f.combo === COMBO_SERIES
    ? seriesResistance(values)
    : parallelResistance(values)

  // Paralelde akım payları iletkenlikle orantılıdır
  const totalG = values.reduce((a, x) => a + (x === 0 ? Infinity : 1 / x), 0)
  const shares = values.map((x) => (f.combo === COMBO_PARALLEL ? (x === 0 ? 1 : 1 / x / totalG) : x / seriesResistance(values)))

  return {
    ok: true, tool: TOOL_COMBO,
    combo: f.combo, values, equivalent, shares,
    nearestE24: nearestValue(equivalent, 'E24'),
  }
}

export function compute(tool, f, labels = {}) {
  const read = readForm(f, formFields(tool, f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok && tool !== TOOL_COMBO) {
    return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }
  }

  const v = read.values
  if (tool === TOOL_OHM) return computeOhm(v)
  return computeCombo(f)
}

// --- Parametrik grafikler ---

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

  if (r.tool === TOOL_OHM) {
    if (!(r.V > 0) || !(r.R > 0)) return null
    // Sabit gerilimde direnç değiştikçe harcanan güç
    const rows = logSweep(r.R / 100, r.R * 100, 70, (R) => (r.V * r.V) / R)
    return {
      kind: TOOL_OHM,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.R, y: r.P },
      refs: [],
    }
  }

  // Seri/paralel birleşimin taranacak sürekli bir parametresi yok
  return null
}
