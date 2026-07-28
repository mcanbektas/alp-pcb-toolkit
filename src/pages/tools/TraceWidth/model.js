// Trace genişliği ekranının hesap modeli. Saf: React, DOM ve gösterim bilmez.

import { fieldsFor, readForm, when } from '../../../lib/fields'
import { LENGTH, CURRENT, VOLTAGE } from '../../../lib/units'
import {
  OZ_TABLE, MIL2_TO_MM2,
  areaForCurrent_mil2, currentForArea, kCoeff,
  traceResistance, validityWarnings,
} from '../../../lib/traceCalc'

export const MODE_ANALYSIS = 'ana'
export const MODE_SYNTHESIS = 'syn'

export const REASON_INCOMPLETE = 'incomplete'

export const INITIAL_FORM = {
  I: '1', Iu: 'A',
  dT: '10', Ta: '25',
  layer: 'external',
  oz: '1', tCustom: '35',
  L: '50', Lu: 'mm',
  W: '0.5', Wu: 'mm',
  Vs: '',
  margin: '20',
  tol: false, wTol: '10', tTol: '10',
}

const PCT = { '%': 1 }
const TEMP = { '°C': 1 }
const WIDTH = { mm: LENGTH.mm, mil: LENGTH.mil }

export function formFields(mode, f) {
  return fieldsFor([
    [
      { key: 'I', label: 'Akım (I)', unitKey: 'Iu', table: CURRENT, min: 0 },
      { key: 'dT', label: 'Sıcaklık artışı (ΔT)', unit: '°C', table: TEMP, min: 0 },
      // Ortam sıcaklığı sıfır ve negatif olabilir
      { key: 'Ta', label: 'Ortam sıcaklığı (Tₐ)', unit: '°C', table: TEMP, allowZero: true },
      { key: 'L', label: 'Yol uzunluğu (L)', unitKey: 'Lu', table: LENGTH, min: 0 },
    ],
    when(f.oz === 'custom', [
      { key: 'tCustom', label: 'Özel bakır kalınlığı', unit: 'µm', table: LENGTH, min: 0 },
    ]),
    when(mode === MODE_ANALYSIS, [
      { key: 'W', label: 'Yol genişliği (W)', unitKey: 'Wu', table: WIDTH, min: 0 },
    ]),
    when(mode === MODE_SYNTHESIS, [
      { key: 'margin', label: 'Güvenlik marjı (M)', unit: '%', table: PCT, min: 0, allowZero: true },
    ]),
    [
      { key: 'Vs', label: 'Besleme gerilimi', unit: 'V', table: VOLTAGE, min: 0, optional: true },
    ],
    when(f.tol, [
      { key: 'wTol', label: 'Genişlik toleransı', unit: '%', table: PCT, min: 0, allowZero: true },
      { key: 'tTol', label: 'Bakır kalınlığı toleransı', unit: '%', table: PCT, min: 0, allowZero: true },
    ]),
  ])
}

// Seçilen bakır ağırlığından kalınlık (m). Özel kalınlık alanı SI'ye çevrilmiş gelir.
function copperThickness(f, values) {
  if (f.oz === 'custom') return values.tCustom
  const row = OZ_TABLE.find((o) => o.key === f.oz)
  return row?.um != null ? row.um * 1e-6 : NaN
}

// Belirli bir genişlik için tüm elektriksel sonuçlar. Girişler SI.
function electricals(W_m, t_m, L_m, I, Ta, dT, Vs) {
  const A_m2 = W_m * t_m
  const Tavg = Ta + dT / 2
  const Tmax = Ta + dT
  const R20 = traceResistance(L_m, W_m, t_m, 20)
  const Ravg = traceResistance(L_m, W_m, t_m, Tavg)
  const Rmax = traceResistance(L_m, W_m, t_m, Tmax)
  const VdropAvg = I * Ravg
  const VdropMax = I * Rmax
  const Ploss = I * I * Ravg

  return {
    A_mm2: A_m2 * 1e6,
    Tavg, Tmax, R20, Ravg, Rmax, VdropAvg, VdropMax, Ploss,
    J: I / A_m2 / 1e6, // A/mm²
    PperLength: Ploss / L_m, // W/m
    pctAvg: Vs > 0 ? (100 * VdropAvg) / Vs : null,
    pctMax: Vs > 0 ? (100 * VdropMax) / Vs : null,
  }
}

export function compute(mode, f) {
  const read = readForm(f, formFields(mode, f))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const t_m = copperThickness(f, v)
  if (!Number.isFinite(t_m) || t_m <= 0) return { ok: false, reason: REASON_INCOMPLETE }

  const { I, dT, Ta, L: L_m } = v
  const Vs = v.Vs ?? 0
  const t_mil = t_m / LENGTH.mil
  const t_um = t_m * 1e6

  const warnings = validityWarnings(I, dT)
  const k = kCoeff(f.layer)
  const wTol = f.tol ? v.wTol / 100 : 0
  const tTol = f.tol ? v.tTol / 100 : 0

  const common = { mode, I, dT, Ta, t_m, t_um, t_mil, L_m, Vs, warnings, k, layer: f.layer }

  if (mode === MODE_SYNTHESIS) {
    const M = v.margin / 100
    const A_mil2 = areaForCurrent_mil2(I, dT, f.layer)
    const Wmin_m = (A_mil2 / t_mil) * LENGTH.mil
    const Wrec_m = Wmin_m * (1 + M)
    const e = electricals(Wrec_m, t_m, L_m, I, Ta, dT, Vs)

    let tol = null
    if (f.tol) {
      // Worst-case: en dar genişlik + en ince bakır → en düşük kapasite
      const Wwc_m = Wrec_m * (1 - wTol)
      const twc_m = t_m * (1 - tTol)
      const Awc_mil2 = (Wwc_m / LENGTH.mil) * (twc_m / LENGTH.mil)
      const ImaxWc = currentForArea(Awc_mil2, dT, f.layer)
      tol = { Wwc_m, twc_um: twc_m * 1e6, ImaxWc, sufficient: ImaxWc >= I }
    }

    return {
      ok: true, ...common,
      A_mil2, A_mm2: A_mil2 * MIL2_TO_MM2,
      Wmin_m, Wrec_m, M, e, tol,
    }
  }

  const W_m = v.W
  const A_mil2 = (W_m / LENGTH.mil) * t_mil
  const Imax = currentForArea(A_mil2, dT, f.layer)
  const e = electricals(W_m, t_m, L_m, I, Ta, dT, Vs)

  let tol = null
  if (f.tol) {
    const AminMil2 = ((W_m * (1 - wTol)) / LENGTH.mil) * ((t_m * (1 - tTol)) / LENGTH.mil)
    const AmaxMil2 = ((W_m * (1 + wTol)) / LENGTH.mil) * ((t_m * (1 + tTol)) / LENGTH.mil)
    tol = {
      ImaxMin: currentForArea(AminMil2, dT, f.layer),
      ImaxMax: currentForArea(AmaxMil2, dT, f.layer),
      // En dar/ince kesit en yüksek direnci verir
      R20Max: traceResistance(L_m, W_m * (1 - wTol), t_m * (1 - tTol), 20),
      R20Min: traceResistance(L_m, W_m * (1 + wTol), t_m * (1 + tTol), 20),
    }
  }

  return {
    ok: true, ...common,
    W_m, A_mil2, A_mm2: A_mil2 * MIL2_TO_MM2,
    Imax, util: I / Imax, e, tol,
  }
}

// Parametrik grafik: genişliğe göre akım kapasitesi.
// Çalışma noktasının kapasite eğrisinin neresinde durduğunu gösterir.
export function buildSweep(r) {
  if (!r.ok) return null

  const centre = r.mode === MODE_SYNTHESIS ? r.Wrec_m : r.W_m
  const from = centre / 10
  const to = centre * 10
  const steps = 70

  const rows = []
  const a = Math.log10(from)
  const b = Math.log10(to)
  for (let i = 0; i < steps; i++) {
    const W_m = Math.pow(10, a + ((b - a) * i) / (steps - 1))
    const A_mil2 = (W_m / LENGTH.mil) * r.t_mil
    rows.push({
      x: W_m * 1e3, // mm
      y: currentForArea(A_mil2, r.dT, r.layer),
      other: currentForArea(A_mil2, r.dT, r.layer === 'external' ? 'internal' : 'external'),
    })
  }

  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    otherPoints: rows.map((p) => [p.x, p.other]),
    marker: { x: centre * 1e3, y: r.mode === MODE_SYNTHESIS ? r.I : r.Imax },
    target: r.I,
  }
}
