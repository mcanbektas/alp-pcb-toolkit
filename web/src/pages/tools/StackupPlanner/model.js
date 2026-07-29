// Stack-up planlayıcı ekranının hesap modeli (spec §10.4).
// Saf: React, DOM ve gösterim bilmez. Kullanıcı metni içermez; alan
// etiketlerini `labels` parametresiyle dışarıdan alır.

import { readForm, readRows, fieldsFor } from '../../../lib/fields'
import { LENGTH } from '../../../lib/units'
import {
  computeStackup, buildStackupSweep, buildToleranceSweep,
  LAYER_COPPER, LAYER_CORE, LAYER_PREPREG, LAYER_SOLDERMASK, LAYER_COATING, LAYER_ADHESIVE,
  ROLE_SIGNAL, ROLE_GROUND, ROLE_POWER, ROLE_MIXED_PLANE, ROLE_DIELECTRIC, ROLE_COATING,
  TOL_ABSOLUTE, TOL_PERCENT, TOL_MINMAX,
} from '../../../lib/stackup'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_ENGINE = 'engine'

export const SWEEP_LAYER = 'layer'
export const SWEEP_TOLERANCE = 'tolerance'

export const LEN_UNITS = ['mm', 'µm', 'mil']

const LEN = { mm: LENGTH.mm, 'µm': LENGTH['µm'], um: LENGTH.um, mil: LENGTH.mil }
const PLAIN = { '': 1 }
const PCT = { '%': 1 }

// Kayıt zarfı mm saklar (stackupProfiles.js birim sözleşmesi); ekran da mm
// gösterir. Bu yüzden geri yükleme birim seçicisini mm'ye sabitler.
export const RECORD_UNIT = 'mm'

const emptyRow = (type, role, name, thickness) => ({
  type,
  role,
  name,
  thickness,
  thicknessU: RECORD_UNIT,
  toleranceMode: TOL_ABSOLUTE,
  tolA: '',
  tolB: '',
  dk: '',
  coverage: '',
})

export const INITIAL_FORM = {
  layers: [
    emptyRow(LAYER_SOLDERMASK, ROLE_COATING, '', '0.02'),
    emptyRow(LAYER_COPPER, ROLE_SIGNAL, 'L1', '0.035'),
    emptyRow(LAYER_PREPREG, ROLE_DIELECTRIC, '', '0.2'),
    emptyRow(LAYER_COPPER, ROLE_GROUND, 'L2', '0.035'),
    emptyRow(LAYER_CORE, ROLE_DIELECTRIC, '', '1.0'),
    emptyRow(LAYER_COPPER, ROLE_POWER, 'L3', '0.035'),
    emptyRow(LAYER_PREPREG, ROLE_DIELECTRIC, '', '0.2'),
    emptyRow(LAYER_COPPER, ROLE_SIGNAL, 'L4', '0.035'),
    emptyRow(LAYER_SOLDERMASK, ROLE_COATING, '', '0.02'),
  ],

  drillDiameter: '0.3', drillDiameterU: 'mm',
  symmetryLimit: '',
  copperBalanceLimit: '',
  warnPercent: '10',

  saveName: '',
}

export function scalarFields(labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'drillDiameter', label: L('drillDiameter'), unitKey: 'drillDiameterU', table: LEN, optional: true, min: 0 },
      { key: 'symmetryLimit', label: L('symmetryLimit'), unit: '%', table: PCT, optional: true, allowZero: true, min: 0 },
      { key: 'copperBalanceLimit', label: L('copperBalanceLimit'), unit: '%', table: PCT, optional: true, allowZero: true, min: 0 },
      { key: 'warnPercent', label: L('warnPercent'), unit: '%', table: PCT, optional: true, allowZero: true, min: 0, max: 100 },
    ],
  ])
}

// Satır içindeki sayısal alanlar. `tolA` / `tolB` tolerans kipine göre anlam
// değiştirir: mutlak ve yüzde kipinde eksi/artı payı, min/max kipinde alt ve
// üst uçtur. Anlam ekranda başlıkta ve ipucunda yazılır.
export function rowFields(labels = {}) {
  const L = (key) => labels[key] ?? key
  return [
    { key: 'thickness', label: L('thickness'), unitKey: 'thicknessU', table: LEN, min: 0 },
    { key: 'tolA', label: L('tolA'), optional: true, allowZero: true, min: 0 },
    { key: 'tolB', label: L('tolB'), optional: true, allowZero: true, min: 0 },
    { key: 'dk', label: L('dk'), optional: true, min: 0 },
    { key: 'coverage', label: L('coverage'), optional: true, allowZero: true, min: 0, max: 100 },
  ]
}

// Kip mutlak ya da min/max ise tolerans alanı bir uzunluktur ve satırın kendi
// birimiyle SI'ye çevrilir; yüzde kipinde boyutsuzdur ve çevrilmez.
function toleranceToSI(value, mode, unit) {
  if (value === null || value === undefined) return null
  if (mode === TOL_PERCENT) return value
  const factor = LEN[unit]
  return factor === undefined ? null : value * factor
}

export function compute(f, ctx = {}, labels = {}) {
  const read = readForm(f, scalarFields(labels))
  const rowLabel = labels.rowLabel ?? 'row'
  const rows = readRows(f.layers, rowFields(labels), rowLabel)

  const ambiguous = [...read.ambiguous, ...rows.ambiguous]
  if (ambiguous.length) return { ok: false, ambiguous }
  if (!read.ok || !rows.ok) {
    return { ok: false, reason: REASON_INCOMPLETE, invalid: [...read.invalid, ...rows.invalid] }
  }

  const v = read.values
  const { limits = {}, hasProfile = false } = ctx

  const layers = rows.rows.map((values, i) => {
    const src = f.layers[i]
    const mode = src.toleranceMode ?? TOL_ABSOLUTE
    const tolA = toleranceToSI(values.tolA, mode, src.thicknessU)
    const tolB = toleranceToSI(values.tolB, mode, src.thicknessU)

    return {
      type: src.type,
      role: src.role === '' ? null : src.role,
      name: src.name ?? '',
      material: src.material ?? '',
      thickness: values.thickness,
      toleranceMode: mode,
      // Mutlak / yüzde kipinde A eksi, B artı payıdır.
      toleranceMinus: mode === TOL_MINMAX ? null : tolA,
      tolerancePlus: mode === TOL_MINMAX ? null : tolB,
      // min/max kipinde aynı iki alan doğrudan uçlardır.
      minimumThickness: mode === TOL_MINMAX ? tolA : null,
      maximumThickness: mode === TOL_MINMAX ? tolB : null,
      dielectricConstant: values.dk,
      copperCoveragePercent: values.coverage,
    }
  })

  const engineInput = {
    layers,
    drillDiameter: v.drillDiameter,
    symmetryLimitPercent: v.symmetryLimit,
    copperBalanceLimitPercent: v.copperBalanceLimit,
    limits,
    warnPercent: v.warnPercent ?? null,
    hasProfile,
  }

  const r = computeStackup(engineInput)
  if (r.error) {
    return {
      ok: false,
      reason: REASON_ENGINE,
      code: r.error,
      index: r.index,
      field: r.field,
      variant: r.variant,
    }
  }

  return { ok: true, engineInput, warnPercent: v.warnPercent ?? null, ...r }
}

/**
 * Kayıt zarfı için katmanları mm cinsine çevirir. Depo mm saklar; hesap SI
 * ile yapılır ve dönüşüm yalnızca bu iki noktadadır.
 */
export function layersToRecord(layers) {
  const toMm = (x) => (x === null || x === undefined ? null : x / LENGTH.mm)
  return layers.map((l) => ({
    type: l.type,
    role: l.role,
    name: l.name,
    material: l.material,
    thickness: toMm(l.thickness),
    toleranceMode: l.toleranceMode,
    tolerancePlus: l.toleranceMode === TOL_PERCENT ? l.tolerancePlus : toMm(l.tolerancePlus),
    toleranceMinus: l.toleranceMode === TOL_PERCENT ? l.toleranceMinus : toMm(l.toleranceMinus),
    minimumThickness: toMm(l.minimumThickness),
    maximumThickness: toMm(l.maximumThickness),
    dielectricConstant: l.dielectricConstant,
    lossTangent: null,
    copperCoveragePercent: l.copperCoveragePercent,
  }))
}

/** Kayıttan form satırlarına. Birim seçicileri mm'ye sabitlenir. */
export function recordToRows(record) {
  return (record?.layers ?? []).map((l) => {
    const mode = l.toleranceMode ?? TOL_ABSOLUTE
    const asText = (x) => (x === null || x === undefined ? '' : String(x))
    return {
      type: l.type,
      role: l.role ?? '',
      name: l.name ?? '',
      thickness: asText(l.thickness),
      thicknessU: RECORD_UNIT,
      toleranceMode: mode,
      tolA: asText(mode === TOL_MINMAX ? l.minimumThickness : l.toleranceMinus),
      tolB: asText(mode === TOL_MINMAX ? l.maximumThickness : l.tolerancePlus),
      dk: asText(l.dielectricConstant),
      coverage: asText(l.copperCoveragePercent),
    }
  })
}

/**
 * Kontrollü empedans aracına aktarılacak veri. Mevcut mimariye en az müdahale
 * eden yol seçildi: ekran bu nesneden okunabilir bir JSON üretir, kullanıcı
 * kopyalar. Yeni bir router state kanalı ya da paylaşılan depo açılmaz.
 */
export function buildTransferPayload(r, signalIndex, stackName = '') {
  if (!r.ok) return null
  const signal = r.signals.find((sg) => sg.index === signalIndex)
  if (!signal) return null

  return {
    schema: 'alp-stackup-transfer',
    schemaVersion: 1,
    stackup: stackName,
    layerName: signal.name,
    layerIndex: signal.index,
    outer: signal.outer,
    copperThickness: signal.thickness,
    H: signal.H,
    H1: signal.H1,
    H2: signal.H2,
    dielectricConstantUpper: signal.dkUpper,
    dielectricConstantLower: signal.dkLower,
    referenceUpperIndex: signal.upper?.index ?? null,
    referenceLowerIndex: signal.lower?.index ?? null,
    unit: 'm',
  }
}

export function buildSweep(r, sweep, layerIndex) {
  if (!r.ok) return null

  if (sweep === SWEEP_TOLERANCE) {
    const rows = buildToleranceSweep(r.engineInput, 0, 20, 41)
    if (rows.length === 0) return null
    return {
      rows,
      sweep,
      points: rows.map((p) => [p.x, p.yMin]),
      maxPoints: rows.map((p) => [p.x, p.yMax]),
      nominalPoints: rows.map((p) => [p.x, p.y]),
    }
  }

  const layers = r.engineInput.layers
  const idx = Number.isInteger(layerIndex) && layers[layerIndex] ? layerIndex : 0
  const nominal = layers[idx].thickness
  const rows = buildStackupSweep(r.engineInput, idx, nominal * 0.2, nominal * 2, 41)
  if (rows.length === 0) return null

  return {
    rows,
    sweep,
    layerIndex: idx,
    points: rows.map((p) => [p.x, p.y]),
    minPoints: rows.map((p) => [p.x, p.yMin]),
    maxPoints: rows.map((p) => [p.x, p.yMax]),
    marker: { x: nominal, y: r.results.totalNominal },
  }
}

export {
  LAYER_COPPER, LAYER_CORE, LAYER_PREPREG, LAYER_SOLDERMASK, LAYER_COATING, LAYER_ADHESIVE,
  ROLE_SIGNAL, ROLE_GROUND, ROLE_POWER, ROLE_MIXED_PLANE, ROLE_DIELECTRIC, ROLE_COATING,
  TOL_ABSOLUTE, TOL_PERCENT, TOL_MINMAX,
}
