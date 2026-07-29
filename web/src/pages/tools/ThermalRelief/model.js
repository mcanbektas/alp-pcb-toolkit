// Thermal relief ekranının hesap modeli (spec §10.5).
// Saf: React, DOM ve gösterim bilmez. Kullanıcı metni içermez; alan
// etiketlerini `labels` parametresiyle dışarıdan alır.

import { readForm, readRows, fieldsFor, when } from '../../../lib/fields'
import {
  LENGTH, CURRENT, VOLTAGE, POWER, THERMAL_R, K_CU, K_CU_HIGH,
} from '../../../lib/units'
import {
  computeThermalRelief, buildThermalReliefSweep,
  SPOKE_UNIFORM, SPOKE_TAPER, SPOKE_CUSTOM,
} from '../../../lib/thermalRelief'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_ENGINE = 'engine'

export const SWEEP_WIDTH = 'innerWidth'
export const SWEEP_COUNT = 'spokeCount'
export const SWEEP_LENGTH = 'spokeLength'
export const SWEEP_THICKNESS = 'copperThickness'

// Grafik ölçüsü. Farklı birimdeki büyüklükler aynı Y eksenine zorlanmaz;
// kullanıcı hangisini çizeceğini seçer.
export const METRIC_RESISTANCE = 'resistance'
export const METRIC_VOLTAGE = 'voltageDrop'
export const METRIC_THERMAL = 'thermalResistance'
export const METRIC_DENSITY = 'currentDensity'

export const LEN_UNITS = ['mm', 'µm', 'mil']
export const CURRENT_UNITS = ['A', 'mA']

const LEN = { mm: LENGTH.mm, 'µm': LENGTH['µm'], um: LENGTH.um, mil: LENGTH.mil }
const TEMP = { '°C': 1 }
const COUNT = { adet: 1 }
const COND = { 'W/(m·K)': 1 }
const DENSITY = { 'A/m²': 1, 'A/mm²': 1e6 }
const PCT = { '%': 1 }

export const K_OPTIONS = [K_CU, K_CU_HIGH]

export const INITIAL_FORM = {
  current: '2', currentU: 'A',
  temperature: '20',
  copperThickness: '35', copperThicknessU: 'µm',

  spokeMode: SPOKE_UNIFORM,
  spokeCount: '4',
  spokeLength: '0.3', spokeLengthU: 'mm',
  innerWidth: '0.2', innerWidthU: 'mm',
  outerWidth: '0.3', outerWidthU: 'mm',

  customSpokes: [
    { innerWidth: '0.2', outerWidth: '0.2', length: '0.3', thickness: '35' },
    { innerWidth: '0.2', outerWidth: '0.2', length: '0.3', thickness: '35' },
  ],

  padDiameter: '1.0', padDiameterU: 'mm',
  thermalGap: '0.3', thermalGapU: 'mm',
  clearanceDiameter: '', clearanceDiameterU: 'mm',

  deltaT: '',
  k: String(K_CU),

  maxVoltageDrop: '', maxVoltageDropU: 'mV',
  maxPowerLoss: '', maxPowerLossU: 'mW',
  maxCurrentDensity: '', maxCurrentDensityU: 'A/mm²',
  maxThermalResistance: '', maxThermalResistanceU: 'K/W',

  warnPercent: '10',
}

export function formFields(spokeMode, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'current', label: L('current'), unitKey: 'currentU', table: CURRENT, min: 0 },
      { key: 'temperature', label: L('temperature'), unit: '°C', table: TEMP, allowZero: true },
      { key: 'copperThickness', label: L('copperThickness'), unitKey: 'copperThicknessU', table: LEN, min: 0 },
      { key: 'spokeLength', label: L('spokeLength'), unitKey: 'spokeLengthU', table: LEN, optional: true, min: 0 },
      { key: 'padDiameter', label: L('padDiameter'), unitKey: 'padDiameterU', table: LEN, optional: true, min: 0 },
      { key: 'thermalGap', label: L('thermalGap'), unitKey: 'thermalGapU', table: LEN, optional: true, min: 0 },
      { key: 'clearanceDiameter', label: L('clearanceDiameter'), unitKey: 'clearanceDiameterU', table: LEN, optional: true, min: 0 },
      { key: 'deltaT', label: L('deltaT'), unit: '°C', table: TEMP, optional: true, min: 0 },
      { key: 'k', label: L('k'), unit: 'W/(m·K)', table: COND, min: 0 },
      { key: 'maxVoltageDrop', label: L('maxVoltageDrop'), unitKey: 'maxVoltageDropU', table: VOLTAGE, optional: true, min: 0 },
      { key: 'maxPowerLoss', label: L('maxPowerLoss'), unitKey: 'maxPowerLossU', table: POWER, optional: true, min: 0 },
      { key: 'maxCurrentDensity', label: L('maxCurrentDensity'), unitKey: 'maxCurrentDensityU', table: DENSITY, optional: true, min: 0 },
      { key: 'maxThermalResistance', label: L('maxThermalResistance'), unitKey: 'maxThermalResistanceU', table: THERMAL_R, optional: true, min: 0 },
      { key: 'warnPercent', label: L('warnPercent'), unit: '%', table: PCT, optional: true, allowZero: true, min: 0, max: 100 },
    ],
    when(spokeMode !== SPOKE_CUSTOM, [
      { key: 'spokeCount', label: L('spokeCount'), unit: 'adet', table: COUNT, min: 1 },
      { key: 'innerWidth', label: L('innerWidth'), unitKey: 'innerWidthU', table: LEN, min: 0 },
    ]),
    when(spokeMode === SPOKE_TAPER, [
      { key: 'outerWidth', label: L('outerWidth'), unitKey: 'outerWidthU', table: LEN, min: 0 },
    ]),
  ])
}

// Özel spoke satırları. Birimler satır başına taşınmaz: uzunluk ve genişlik
// mm, kalınlık µm olarak sabittir ve başlıkta yazılır — dokuz sütunlu bir
// birim seçici satırı okunmaz hâle getirirdi.
export const CUSTOM_LENGTH_UNIT = 'mm'
export const CUSTOM_THICKNESS_UNIT = 'µm'

export function customRowFields(labels = {}) {
  const L = (key) => labels[key] ?? key
  return [
    { key: 'innerWidth', label: L('innerWidth'), table: LEN, unit: CUSTOM_LENGTH_UNIT, min: 0 },
    { key: 'outerWidth', label: L('outerWidth'), table: LEN, unit: CUSTOM_LENGTH_UNIT, optional: true, min: 0 },
    { key: 'length', label: L('spokeLength'), table: LEN, unit: CUSTOM_LENGTH_UNIT, optional: true, min: 0 },
    { key: 'thickness', label: L('copperThickness'), table: LEN, unit: CUSTOM_THICKNESS_UNIT, optional: true, min: 0 },
  ]
}

export function compute(f, ctx = {}, labels = {}) {
  const mode = f.spokeMode
  const read = readForm(f, formFields(mode, labels))

  const rowsRead = mode === SPOKE_CUSTOM
    ? readRows(f.customSpokes, customRowFields(labels), labels.rowLabel ?? 'row')
    : { rows: [], ambiguous: [], invalid: [], ok: true }

  const ambiguous = [...read.ambiguous, ...rowsRead.ambiguous]
  if (ambiguous.length) return { ok: false, ambiguous }
  if (!read.ok || !rowsRead.ok) {
    return {
      ok: false,
      reason: REASON_INCOMPLETE,
      invalid: [...read.invalid, ...rowsRead.invalid],
    }
  }

  const v = read.values
  const { limits = {}, hasProfile = false } = ctx

  const engineInput = {
    current: v.current,
    temperature: v.temperature,
    copperThickness: v.copperThickness,
    spokeMode: mode,
    spokeCount: v.spokeCount,
    spokeLength: v.spokeLength,
    innerWidth: v.innerWidth,
    outerWidth: mode === SPOKE_TAPER ? v.outerWidth : v.innerWidth,
    customSpokes: rowsRead.rows.map((row) => ({
      innerWidth: row.innerWidth,
      outerWidth: row.outerWidth ?? row.innerWidth,
      length: row.length ?? v.spokeLength,
      thickness: row.thickness ?? v.copperThickness,
    })),
    padDiameter: v.padDiameter,
    thermalGap: v.thermalGap,
    clearanceDiameter: v.clearanceDiameter,
    deltaT: v.deltaT,
    k: v.k,
    maxVoltageDrop: v.maxVoltageDrop,
    maxPowerLoss: v.maxPowerLoss,
    maxCurrentDensity: v.maxCurrentDensity,
    maxThermalResistance: v.maxThermalResistance,
    limits,
    warnPercent: v.warnPercent ?? null,
    hasProfile,
  }

  const r = computeThermalRelief(engineInput)
  if (r.error) {
    return {
      ok: false,
      reason: REASON_ENGINE,
      code: r.error,
      field: r.field,
      index: r.index,
      variant: r.variant,
    }
  }

  return { ok: true, engineInput, warnPercent: v.warnPercent ?? null, ...r }
}

// Süpürme aralıkları: mevcut değerin çevresinde fiziksel olarak anlamlı bir
// bant. Spoke sayısı tam sayı olduğu için ayrı ele alınır.
function sweepRange(field, base) {
  if (field === SWEEP_COUNT) return [1, Math.max(8, base.spokeCount * 2)]
  const current = {
    [SWEEP_WIDTH]: base.innerWidth,
    [SWEEP_LENGTH]: base.spokeLength,
    [SWEEP_THICKNESS]: base.copperThickness,
  }[field]
  if (!Number.isFinite(current) || current <= 0) return null
  return [current * 0.25, current * 2.5]
}

export function buildSweep(r, sweep) {
  if (!r.ok) return null
  const range = sweepRange(sweep, r.engineInput)
  if (!range) return null

  const steps = sweep === SWEEP_COUNT ? range[1] - range[0] + 1 : 41
  const rows = buildThermalReliefSweep(r.engineInput, sweep, range[0], range[1], steps)
  if (rows.length === 0) return null

  return {
    rows,
    sweep,
    seriesFor: (metric) => rows.map((p) => [p.x, p[metric]]),
    marker: {
      x: {
        [SWEEP_WIDTH]: r.engineInput.innerWidth,
        [SWEEP_COUNT]: r.results.spokeCount,
        [SWEEP_LENGTH]: r.engineInput.spokeLength,
        [SWEEP_THICKNESS]: r.engineInput.copperThickness,
      }[sweep],
    },
  }
}

export { SPOKE_UNIFORM, SPOKE_TAPER, SPOKE_CUSTOM }
