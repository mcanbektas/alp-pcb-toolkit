// BGA breakout ekranının hesap modeli (spec §10.3).
// Saf: React, DOM ve gösterim bilmez. Kullanıcı metni içermez; alan
// etiketlerini `labels` parametresiyle dışarıdan alır.

import { readForm, fieldsFor } from '../../../lib/fields'
import { LENGTH } from '../../../lib/units'
import {
  computeBgaBreakout, buildBgaSweep,
  VIA_THROUGH, VIA_BLIND, VIA_MICROVIA, VIA_IN_PAD,
} from '../../../lib/bgaBreakout'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_ENGINE = 'engine'

export const SWEEP_PITCH = 'pitch'
export const SWEEP_LAND = 'landDiameter'

// Pad tanımı yalnızca mask geometrisinin nasıl çizileceğini ve genişlemenin
// işaretini anlatır; hesap yine girilen genişleme değerini kullanır.
export const PAD_NSMD = 'nsmd'
export const PAD_SMD = 'smd'

export const LEN_UNITS = ['mm', 'µm', 'mil']

const LEN = { mm: LENGTH.mm, 'µm': LENGTH['µm'], um: LENGTH.um, mil: LENGTH.mil }
const COUNT = { adet: 1 }
const PCT = { '%': 1 }

export const INITIAL_FORM = {
  pitch: '0.8', pitchU: 'mm',
  landDiameter: '0.45', landDiameterU: 'mm',
  traceWidth: '0.1', traceWidthU: 'mm',
  traceClearance: '0.1', traceClearanceU: 'mm',
  traceCount: '1',

  viaType: VIA_THROUGH,
  viaPadDiameter: '0.45', viaPadDiameterU: 'mm',
  viaDrillDiameter: '0.25', viaDrillDiameterU: 'mm',
  landViaDistance: '', landViaDistanceU: 'mm',
  viaPitch: '0.8', viaPitchU: 'mm',
  viaDepth: '1.6', viaDepthU: 'mm',

  padDefinition: PAD_NSMD,
  maskExpansion: '0.05', maskExpansionU: 'mm',

  rows: '10',
  cols: '10',

  warnPercent: '10',
}

export function formFields(labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'pitch', label: L('pitch'), unitKey: 'pitchU', table: LEN, min: 0 },
      { key: 'landDiameter', label: L('landDiameter'), unitKey: 'landDiameterU', table: LEN, min: 0 },
      { key: 'traceWidth', label: L('traceWidth'), unitKey: 'traceWidthU', table: LEN, min: 0 },
      { key: 'traceClearance', label: L('traceClearance'), unitKey: 'traceClearanceU', table: LEN, min: 0 },
      { key: 'traceCount', label: L('traceCount'), unit: 'adet', table: COUNT, allowZero: true, min: 0 },
      { key: 'viaPadDiameter', label: L('viaPadDiameter'), unitKey: 'viaPadDiameterU', table: LEN, optional: true, min: 0 },
      { key: 'viaDrillDiameter', label: L('viaDrillDiameter'), unitKey: 'viaDrillDiameterU', table: LEN, optional: true, min: 0 },
      { key: 'landViaDistance', label: L('landViaDistance'), unitKey: 'landViaDistanceU', table: LEN, optional: true, min: 0 },
      { key: 'viaPitch', label: L('viaPitch'), unitKey: 'viaPitchU', table: LEN, optional: true, min: 0 },
      { key: 'viaDepth', label: L('viaDepth'), unitKey: 'viaDepthU', table: LEN, optional: true, min: 0 },
      // Mask genişlemesi negatif olabilir (mask ile tanımlı pad).
      { key: 'maskExpansion', label: L('maskExpansion'), unitKey: 'maskExpansionU', table: LEN, optional: true, allowZero: true },
      { key: 'rows', label: L('rows'), unit: 'adet', table: COUNT, optional: true, min: 1 },
      { key: 'cols', label: L('cols'), unit: 'adet', table: COUNT, optional: true, min: 1 },
      { key: 'warnPercent', label: L('warnPercent'), unit: '%', table: PCT, optional: true, allowZero: true, min: 0, max: 100 },
    ],
  ])
}

export function compute(f, ctx = {}, labels = {}) {
  const read = readForm(f, formFields(labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const { limits = {}, hasProfile = false } = ctx

  // `fields.js` sayıyı okur ama tam sayı şartını bilmez; "1.5 iz" girildiğinde
  // hatayı motor kendi koduyla (BGA_ERR_NOT_INTEGER) bildirir, burada sessizce
  // yuvarlanmaz.
  const engineInput = {
    pitch: v.pitch,
    landDiameter: v.landDiameter,
    traceWidth: v.traceWidth,
    traceClearance: v.traceClearance,
    traceCount: v.traceCount,
    viaType: f.viaType,
    viaPadDiameter: v.viaPadDiameter,
    viaDrillDiameter: v.viaDrillDiameter,
    landViaDistance: v.landViaDistance,
    viaPitch: v.viaPitch,
    viaDepth: v.viaDepth,
    maskExpansion: v.maskExpansion,
    limits,
    warnPercent: v.warnPercent ?? null,
    hasProfile,
  }

  const r = computeBgaBreakout(engineInput)
  if (r.error) {
    return {
      ok: false, reason: REASON_ENGINE, code: r.error, field: r.field, variant: r.variant,
    }
  }

  return {
    ok: true,
    engineInput,
    grid: { rows: v.rows ?? null, cols: v.cols ?? null },
    padDefinition: f.padDefinition,
    warnPercent: v.warnPercent ?? null,
    ...r,
  }
}

/**
 * Grafik: adım ya da land çapına göre tek iz için maksimum genişlik (yatay ve
 * diyagonal) ve koridor marjı. Geometrisi geçersiz olan noktada nokta hiç
 * üretilmez; eğri orada kesilir, uydurulmuş değerle doldurulmaz.
 */
export function buildSweep(r, sweep) {
  if (!r.ok) return null

  const base = r.engineInput
  const rows = sweep === SWEEP_LAND
    ? buildBgaSweep(base, SWEEP_LAND, base.landDiameter * 0.4, base.pitch * 0.98, 41)
    : buildBgaSweep(base, SWEEP_PITCH, base.pitch * 0.5, base.pitch * 1.8, 41)

  if (rows.length === 0) return null

  return {
    rows,
    sweep,
    points: rows.map((p) => [p.x, p.y]),
    diagonalPoints: rows.map((p) => [p.x, p.yDiagonal]),
    marginPoints: rows.map((p) => [p.x, p.yMargin]),
    marker: {
      x: sweep === SWEEP_LAND ? base.landDiameter : base.pitch,
      y: r.results.maxWidthSingle,
    },
  }
}

export { VIA_THROUGH, VIA_BLIND, VIA_MICROVIA, VIA_IN_PAD }
