// Direnç renk kodu ekranının hesap modeli (spec §9.1 – §9.3).
// Saf: React, DOM ve gösterim bilmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import {
  decodeColorBands, encodeColorBands, resistanceAtTemp,
  decodeCapacitor,
  DIGIT_COLORS, MULTIPLIER_COLORS, TOLERANCE_COLORS, TCR_COLORS,
} from '../../../lib/codes'
import { nearestValue } from '../../../lib/eseries'
import { RESISTANCE } from '../../../lib/units'

export const MODE_ANALYSIS = 'ana' // koddan değere
export const MODE_SYNTHESIS = 'syn' // değerden koda

export const KIND_COLOR = 'color'
export const KIND_CAP = 'cap'

export const KINDS = [KIND_COLOR, KIND_CAP]
export const BAND_COUNTS = [4, 5, 6]

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_SYNTHESIS_COLOR_ONLY = 'synthesis-color-only'

export const INITIAL_FORM = {
  kind: KIND_COLOR,
  bandCount: '4',
  b0: 'yellow', b1: 'violet', b2: 'black', b3: 'red', b4: 'gold', b5: 'brown',
  cap: '104K',
  // Sentez girdileri
  target: '4.7', targetUnit: 'kΩ',
  tolerance: '5',
  tcr: '100',
  // Sıcaklık eğrisi
  Tmin: '-40', Tmax: '125', Tref: '85',
}

const TEMP = { '°C': 1 }
const PCT = { '%': 1 }
const PPM = { 'ppm/°C': 1 }

// Alan etiketleri dışarıdan gelir: model dili bilmez, ekran `text.fieldLabels`
// geçirir. Etiket verilmezse alan anahtarı görünür — sessiz boşluk yerine
// teşhis edilebilir bir ad.
export function formFields(mode, f, labels = {}) {
  const L = (key) => labels[key] ?? key

  return fieldsFor([
    when(mode === MODE_SYNTHESIS, [
      { key: 'target', label: L('target'), unitKey: 'targetUnit', table: RESISTANCE, min: 0 },
      { key: 'tolerance', label: L('tolerance'), unit: '%', table: PCT, min: 0 },
    ]),
    when(mode === MODE_SYNTHESIS && f.bandCount === '6', [
      { key: 'tcr', label: L('tcr'), unit: 'ppm/°C', table: PPM, min: 0 },
    ]),
    [
      { key: 'Tmin', label: L('Tmin'), unit: '°C', table: TEMP, allowZero: true },
      { key: 'Tmax', label: L('Tmax'), unit: '°C', table: TEMP, allowZero: true },
      { key: 'Tref', label: L('Tref'), unit: '°C', table: TEMP, allowZero: true },
    ],
  ])
}

// Seçili bant anahtarlarını bant sayısına göre toplar
export function bandKeys(f) {
  const n = Number(f.bandCount)
  return ['b0', 'b1', 'b2', 'b3', 'b4', 'b5'].slice(0, n).map((k) => f[k])
}

// Bant konumunun hangi rolü taşıdığı — arayüz doğru renk listesini gösterebilsin
export function bandRoles(bandCount) {
  const digits = bandCount === 4 ? 2 : 3
  const roles = []
  for (let i = 0; i < digits; i++) roles.push({ index: i, role: 'digit', options: DIGIT_COLORS })
  roles.push({ index: digits, role: 'multiplier', options: MULTIPLIER_COLORS })
  roles.push({ index: digits + 1, role: 'tolerance', options: TOLERANCE_COLORS })
  if (bandCount === 6) roles.push({ index: digits + 2, role: 'tcr', options: TCR_COLORS })
  return roles
}

function evaluate(ohms, tolerance, tcr, v) {
  const nearest = nearestValue(ohms, 'E24')
  const nearestE96 = nearestValue(ohms, 'E96')

  return {
    ohms,
    tolerance: tolerance ?? null,
    tcr: tcr ?? null,
    min: tolerance != null ? ohms * (1 - tolerance / 100) : null,
    max: tolerance != null ? ohms * (1 + tolerance / 100) : null,
    nearestE24: nearest,
    nearestE96,
    // TCR biliniyorsa sıcaklık kayması toleransla karşılaştırılabilir
    atTref: tcr != null ? resistanceAtTemp(ohms, tcr, v.Tref) : null,
    driftPct: tcr != null ? tcr * 1e-6 * (v.Tref - 25) * 100 : null,
  }
}

export function compute(mode, f, labels = {}) {
  const read = readForm(f, formFields(mode, f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values

  if (mode === MODE_SYNTHESIS) {
    if (f.kind !== KIND_COLOR) return { ok: false, reason: REASON_SYNTHESIS_COLOR_ONLY }

    const bandCount = Number(f.bandCount)
    const enc = encodeColorBands(v.target, v.tolerance, bandCount, bandCount === 6 ? v.tcr : null)
    if (enc.error) return { ok: false, reason: enc.error, detail: enc.detail }

    return {
      ok: true, mode, kind: KIND_COLOR, bandCount,
      bands: enc.bands,
      exact: enc.exact,
      requested: v.target,
      ...evaluate(enc.encoded, v.tolerance, bandCount === 6 ? v.tcr : null, v),
      temps: v,
    }
  }

  if (f.kind === KIND_COLOR) {
    const bandCount = Number(f.bandCount)
    const dec = decodeColorBands(bandKeys(f))
    if (dec.error) return { ok: false, reason: dec.error, detail: dec.detail }

    return {
      ok: true, mode, kind: KIND_COLOR, bandCount,
      bands: dec.bands,
      ...evaluate(dec.ohms, dec.tolerance, dec.tcr, v),
      temps: v,
    }
  }

  const dec = decodeCapacitor(f.cap)
  if (dec.error) return { ok: false, reason: dec.error, detail: dec.detail }

  return {
    ok: true, mode, kind: KIND_CAP,
    pF: dec.pF, nF: dec.nF, uF: dec.uF, farad: dec.farad,
    tolerance: dec.tolerance,
    toleranceLetter: dec.toleranceLetter,
    // Tek sayıyla ifade edilemeyen tolerans harfleri motorda `toleranceAsymmetric`
    // adıyla döner; cümlesini text.js kurar.
    toleranceAsymmetric: dec.toleranceAsymmetric,
    min: dec.min, max: dec.max,
    temps: v,
  }
}

// Sıcaklıkla direnç değişimi. TCR bilinmiyorsa grafik anlamsızdır — null döner.
export function buildSweep(r) {
  if (!r.ok || r.kind === KIND_CAP || r.tcr == null || !(r.ohms > 0)) return null

  const { Tmin, Tmax } = r.temps
  if (!(Tmax > Tmin)) return null

  const steps = 60
  const rows = []
  for (let i = 0; i < steps; i++) {
    const T = Tmin + ((Tmax - Tmin) * i) / (steps - 1)
    rows.push({ x: T, y: resistanceAtTemp(r.ohms, r.tcr, T) })
  }

  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    // Tolerans bandı sıcaklıktan bağımsızdır; sabit yatay sınırlar
    refs: [
      ...(r.min != null ? [{ key: 'min', y: r.min }] : []),
      ...(r.max != null ? [{ key: 'max', y: r.max }] : []),
    ],
    marker: { x: r.temps.Tref, y: r.atTref },
  }
}
