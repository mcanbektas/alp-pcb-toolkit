// Bakır kalınlığı dönüştürücü ekranının hesap modeli (spec §4.1.2, §4.1.3, §4.3).
// Saf: React, DOM ve gösterim bilmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { LENGTH } from '../../../lib/units'
import {
  nominalThickness, derivedThickness, allUnits,
  finishedThickness, crossSection, trapezoidArea,
} from '../../../lib/copper'
import { sheetResistance } from '../../../lib/plane'
import { OZ_NOMINAL_UM } from '../../../lib/units'

export const SOURCE_WEIGHT = 'weight'
export const SOURCE_THICKNESS = 'thickness'
export const SOURCES = [SOURCE_WEIGHT, SOURCE_THICKNESS]

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_ETCH = 'etch'

export const OZ_OPTIONS = Object.keys(OZ_NOMINAL_UM).map(Number)

export const INITIAL_FORM = {
  source: SOURCE_WEIGHT,
  oz: '1',
  thickness: '35', thicknessu: 'um',

  layer: 'external',
  plating: '25',

  W: '0.25', Wu: 'mm',
  etch: '0',

  T: '20',
}

const TEMP = { '°C': 1 }
const PCT = { '%': 1 }
const WIDTH = { mm: LENGTH.mm, mil: LENGTH.mil }
const THICK = { um: LENGTH.um, mm: LENGTH.mm, mil: LENGTH.mil, inch: LENGTH.inch }

export function formFields(f) {
  return fieldsFor([
    when(f.source === SOURCE_WEIGHT, [
      { key: 'oz', label: 'Bakır ağırlığı', unit: 'oz', table: { oz: 1 }, min: 0 },
    ]),
    when(f.source === SOURCE_THICKNESS, [
      { key: 'thickness', label: 'Kalınlık', unitKey: 'thicknessu', table: THICK, min: 0 },
    ]),
    [
      { key: 'plating', label: 'Kaplama kalınlığı', unit: 'um', table: LENGTH, min: 0, allowZero: true },
      { key: 'W', label: 'Yol genişliği', unitKey: 'Wu', table: WIDTH, min: 0 },
      { key: 'etch', label: 'Aşındırma oranı', unit: '%', table: PCT, min: 0, allowZero: true },
      { key: 'T', label: 'Sıcaklık', unit: '°C', table: TEMP, allowZero: true },
    ],
  ])
}

export function compute(f) {
  const read = readForm(f, formFields(f))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  if (v.etch >= 100) return { ok: false, reason: REASON_ETCH }

  // Kaynak: ya bakır ağırlığı ya doğrudan kalınlık
  const starting = f.source === SOURCE_WEIGHT ? nominalThickness(v.oz) : v.thickness
  if (!(starting > 0)) return { ok: false, reason: REASON_INCOMPLETE }

  const oz = f.source === SOURCE_WEIGHT ? v.oz : null
  // v.plating readForm tarafından µm'den metreye çevrilmiş olarak gelir
  const finished = finishedThickness({ starting, plating: v.plating, layer: f.layer })
  if (finished.error) return { ok: false, reason: REASON_INCOMPLETE }

  const rect = crossSection({ t: finished.finished, W: v.W })
  const trap = trapezoidArea({ t: finished.finished, Wbottom: v.W, etchFactor: v.etch / 100 })
  if (trap.error) return { ok: false, reason: REASON_ETCH }

  return {
    ok: true,
    source: f.source,
    oz,
    layer: f.layer,
    starting,
    plating: finished.plating,
    finished: finished.finished,
    platingShare: finished.platingShare,
    // Nominal tablo ile yoğunluktan türetilen değer birlikte sunulur
    nominal: oz != null ? nominalThickness(oz) : null,
    derived: oz != null ? derivedThickness(oz) : null,
    units: {
      starting: allUnits(starting),
      finished: allUnits(finished.finished),
    },
    W: v.W,
    rect,
    trap,
    etch: v.etch,
    T: v.T,
    Rsheet: sheetResistance(finished.finished, v.T),
    // Trapez kesitin dirence etkisi — alan azaldıkça direnç artar
    RsheetTrap: rect.area > 0 ? sheetResistance(finished.finished, v.T) * (rect.area / trap.area) : NaN,
  }
}

// Grafik: bakır ağırlığına göre kare direnci
export function buildSweep(r) {
  if (!r.ok) return null

  const steps = 60
  const from = 0.25
  const to = 6
  const rows = []
  for (let i = 0; i < steps; i++) {
    const oz = from + ((to - from) * i) / (steps - 1)
    const t = nominalThickness(oz)
    rows.push({ x: oz, y: sheetResistance(t, r.T) })
  }

  const markerOz = r.oz ?? r.units.finished.ozNominal

  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    marker: { x: markerOz, y: sheetResistance(r.finished, r.T) },
    refs: [],
  }
}
