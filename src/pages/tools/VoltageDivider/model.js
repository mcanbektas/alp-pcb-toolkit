// Gerilim bölücü ekranının hesap modeli.
//
// Saf: React ve DOM bilmez, gösterim biçimi üretmez. Form nesnesini alır,
// SI'ye çevirir, hesap motorlarını çağırır, sonucu ve hata kodunu döner.
// Kullanıcıya gösterilecek metin `text.js` içindedir.

import { fieldsFor, readForm, when } from '../../../lib/fields'
import { RESISTANCE, VOLTAGE, POWER } from '../../../lib/units'
import {
  voltageDivider, dividerRatio, dividerTolerance, dividerFindings,
  findDividerPair, sweepDivider, outputVoltage,
} from '../../../lib/divider'
import { twoInParallel } from '../../../lib/ohm'

export const MODE_ANALYSIS = 'ana'
export const MODE_SYNTHESIS = 'syn'

export const SWEEP_PARAMS = ['RL', 'R2', 'R1']

// Hesap yapılamadığında dönen kodlar; metne `text.js` çevirir.
export const REASON_INCOMPLETE = 'incomplete'
export const REASON_RATIO = 'ratio'
export const REASON_NO_PAIR = 'no-pair'
export const REASON_RANGE = 'range'

export const INITIAL_FORM = {
  Vin: '12', Vinu: 'V',
  R1: '27', R1u: 'kΩ',
  R2: '10', R2u: 'kΩ',
  RL: '', RLu: 'kΩ',
  Vout: '3.3', Voutu: 'V',
  series: 'E24',
  rMin: '1', rMinu: 'kΩ',
  rMax: '1', rMaxu: 'MΩ',
  Prated: '', accept: '2',
  tol: false, tolR1: '1', tolR2: '1', tolVin: '0',
}

// Alan tanımları. Etiketler burada duruyor çünkü hata mesajında alan adı
// gösterilir; `lib/` bunları bilmez, çağıran taraf verir.
const PCT = { '%': 1 }

export function formFields(mode, f) {
  return fieldsFor([
    [{ key: 'Vin', label: 'Giriş gerilimi (Vᵢₙ)', unitKey: 'Vinu', table: VOLTAGE, min: 0 }],

    when(mode === MODE_ANALYSIS, [
      { key: 'R1', label: 'R1', unitKey: 'R1u', table: RESISTANCE, min: 0 },
      { key: 'R2', label: 'R2', unitKey: 'R2u', table: RESISTANCE, min: 0 },
    ]),

    when(mode === MODE_SYNTHESIS, [
      { key: 'Vout', label: 'Hedef çıkış (V_out)', unitKey: 'Voutu', table: VOLTAGE, min: 0 },
      { key: 'rMin', label: 'En küçük direnç', unitKey: 'rMinu', table: RESISTANCE, min: 0 },
      { key: 'rMax', label: 'En büyük direnç', unitKey: 'rMaxu', table: RESISTANCE, min: 0 },
    ]),

    [
      { key: 'RL', label: 'Yük direnci (R_L)', unitKey: 'RLu', table: RESISTANCE, min: 0, optional: true },
      // Güç sınırı arayüzde mW olarak girilir
      { key: 'Prated', label: 'Direnç güç sınırı', unit: 'mW', table: POWER, min: 0, optional: true },
      { key: 'accept', label: 'Kabul edilebilir sapma', unit: '%', table: PCT, min: 0, optional: true },
    ],

    when(f.tol, [
      { key: 'tolR1', label: 'R1 toleransı', unit: '%', table: PCT, min: 0, allowZero: true },
      { key: 'tolR2', label: 'R2 toleransı', unit: '%', table: PCT, min: 0, allowZero: true },
      { key: 'tolVin', label: 'Vᵢₙ toleransı', unit: '%', table: PCT, min: 0, allowZero: true },
    ]),
  ])
}

export function compute(mode, f, pickIndex = 0) {
  const read = readForm(f, formFields(mode, f))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const { Vin, RL, Prated, accept } = v
  const tol = f.tol ? { tolR1: v.tolR1, tolR2: v.tolR2, tolVin: v.tolVin } : null

  let R1
  let R2
  let pairs = null
  let targetVout = null

  if (mode === MODE_SYNTHESIS) {
    targetVout = v.Vout
    if (v.rMax <= v.rMin) return { ok: false, reason: REASON_RANGE }
    if (dividerRatio(Vin, targetVout).error) return { ok: false, reason: REASON_RATIO }

    const search = findDividerPair({
      Vin, Vout: targetVout, series: f.series, RL,
      min: v.rMin, max: v.rMax, count: 8,
      maxPowerEach: Prated,
    })
    if (search.error) return { ok: false, reason: REASON_NO_PAIR }

    pairs = search.pairs
    const pick = pairs[Math.min(pickIndex, pairs.length - 1)]
    R1 = pick.R1
    R2 = pick.R2
  } else {
    R1 = v.R1
    R2 = v.R2
  }

  const base = voltageDivider({ Vin, R1, R2, RL })
  if (base.error) return { ok: false, reason: REASON_RANGE }

  const tolerance = tol ? dividerTolerance({ Vin, R1, R2, RL, ...tol }) : null
  const fnd = dividerFindings({
    Vin, R1, R2, RL,
    tolerance: tolerance && !tolerance.error ? tolerance : null,
    targetVout, acceptPct: accept, maxPowerEach: Prated,
  })

  return {
    ok: true,
    mode, Vin, R1, R2, RL, Prated, accept, targetVout,
    base,
    Vout: outputVoltage(base),
    Zout: twoInParallel(R1, R2),
    tolerance: tolerance && !tolerance.error ? tolerance : null,
    tolInput: tol,
    findings: fnd.findings ?? [],
    pairs,
    pickIndex: pairs ? Math.min(pickIndex, pairs.length - 1) : 0,
  }
}

// Taranan parametrenin sınırları. R_L mutlak bir aralıkta taranır; R1/R2
// mevcut değerin çevresinde, çünkü anlamlı aralık tasarıma göre değişir.
function sweepRange(r, param) {
  if (param === 'RL') return { from: 100, to: 10e6 }
  const centre = param === 'R2' ? r.R2 : r.R1
  return { from: centre / 20, to: centre * 20 }
}

export function buildSweep(r, param) {
  if (!r.ok) return null

  const { from, to } = sweepRange(r, param)
  const rows = sweepDivider({
    Vin: r.Vin, R1: r.R1, R2: r.R2, RL: r.RL,
    param, from, to, steps: 70, tol: r.tolInput,
  })
  if (rows.length === 0) return null

  const markerX = param === 'RL' ? r.RL : param === 'R2' ? r.R2 : r.R1

  return {
    param,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    bandPoints: r.tolerance
      ? rows.filter((p) => Number.isFinite(p.lo)).map((p) => [p.x, p.lo, p.hi])
      : null,
    // Referans çizgileri: hedef her modda, yüksüz çıkış yalnız R_L taramasında
    refs: [
      ...(r.targetVout != null ? [{ key: 'target', y: r.targetVout }] : []),
      ...(param === 'RL' ? [{ key: 'open', y: r.base.Vout }] : []),
    ],
    marker: Number.isFinite(markerX) && markerX !== null ? { x: markerX, y: r.Vout } : null,
  }
}
