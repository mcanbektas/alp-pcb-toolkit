// LED seri direnci ekranının hesap modeli (spec §9.8).
// Saf: React, DOM ve gösterim bilmez.
// Brif 11 §C: LedOhmRlc'nin TOOL_LED alt-aracından bölündü — davranış birebir
// korunur, yeni özellik eklenmedi.

import { readForm, fieldsFor } from '../../../lib/fields'
import { VOLTAGE, CURRENT } from '../../../lib/units'
import { ledResistor, LED_ERR_HEADROOM } from '../../../lib/led'
import { nearestValue } from '../../../lib/eseries'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_LED_HEADROOM = 'led-headroom'

export const INITIAL_FORM = {
  Vs: '5', Vsu: 'V',
  Vf: '2.1', Vfu: 'V',
  n: '1',
  Iled: '20', Iledu: 'mA',
  derating: '50',
}

const PCT = { '%': 1 }
const COUNT = { adet: 1 }

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// bu dosya dil bilmez. Etiket verilmezse alan anahtarı gösterilir — sessiz
// boşluk yerine teşhis edilebilir bir ad.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key

  return fieldsFor([
    { key: 'Vs', label: L('Vs'), unitKey: 'Vsu', table: VOLTAGE, min: 0 },
    { key: 'Vf', label: L('Vf'), unitKey: 'Vfu', table: VOLTAGE, min: 0 },
    { key: 'n', label: L('n'), unit: 'adet', table: COUNT, min: 1 },
    { key: 'Iled', label: L('Iled'), unitKey: 'Iledu', table: CURRENT, min: 0 },
    { key: 'derating', label: L('derating'), unit: '%', table: PCT, min: 0 },
  ])
}

function computeLed(v) {
  const r = ledResistor({
    Vs: v.Vs, Vf: v.Vf, n: v.n, I: v.Iled, derating: v.derating / 100,
  })
  if (r.error === LED_ERR_HEADROOM) {
    return { ok: false, reason: REASON_LED_HEADROOM, Vled: r.Vled, Vs: r.Vs }
  }
  if (r.error) return { ok: false, reason: REASON_INCOMPLETE }

  // Standart dirençle gerçekleşen akım — ideal R çoğu zaman stokta yoktur
  const e24 = nearestValue(r.R, 'E24')
  const e96 = nearestValue(r.R, 'E96')
  const actual = (R) => (v.Vs - r.Vled) / R

  return {
    ok: true, ...r,
    Vs: v.Vs, n: v.n, targetI: v.Iled,
    e24: { ...e24, I: actual(e24.value), P: actual(e24.value) ** 2 * e24.value },
    e96: { ...e96, I: actual(e96.value), P: actual(e96.value) ** 2 * e96.value },
  }
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  return computeLed(read.values)
}

// --- Parametrik grafik: seri direnç değiştikçe LED akımı ---

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
  if (!(r.R > 0)) return null

  // Seri direnç değiştikçe LED akımı
  const rows = logSweep(r.R / 20, r.R * 20, 70, (R) => (r.Vs - r.Vled) / R)
  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    marker: { x: r.R, y: r.targetI },
    refs: [{ key: 'target', y: r.targetI }],
  }
}
