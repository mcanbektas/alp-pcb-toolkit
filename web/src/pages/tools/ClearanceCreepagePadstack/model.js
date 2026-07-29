// Clearance, creepage ve padstack ekranının hesap modeli (spec §10.1, §10.2).
// Saf: React, DOM ve gösterim bilmez. Kullanıcı metni içermez; alan
// etiketlerini `labels` parametresiyle dışarıdan alır.
//
// Üç sekme tek ekranda durur ama hesap motorları ayrı saf modüllerdir:
//   clearance / creepage → lib/clearanceCreepage.js  (tablo tabanlı karar)
//   padstack             → lib/padstack.js           (tam geometrik bağıntı)

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { LENGTH, VOLTAGE } from '../../../lib/units'
import {
  computeClearance, computeCreepage,
  buildClearanceAltitudeSweep, buildVoltageSweep,
  CHECK_CREEPAGE,
} from '../../../lib/clearanceCreepage'
import {
  computePadstack, buildPadstackSweep,
  MODE_SYNTHESIS as PAD_SYNTHESIS, MODE_ANALYSIS as PAD_ANALYSIS,
  HOLE_PTH, HOLE_NPTH, ASPECT_BASIS_DRILL, ASPECT_BASIS_FINISHED,
} from '../../../lib/padstack'

export const TAB_CLEARANCE = 'clearance'
export const TAB_CREEPAGE = 'creepage'
export const TAB_PADSTACK = 'padstack'
export const TABS = [TAB_CLEARANCE, TAB_CREEPAGE, TAB_PADSTACK]

export const MODE_SYNTHESIS = PAD_SYNTHESIS
export const MODE_ANALYSIS = PAD_ANALYSIS

export const SWEEP_ALTITUDE = 'altitude'
export const SWEEP_VOLTAGE = 'voltage'
export const SWEEP_REGISTRATION = 'registration'
export const SWEEP_DRILL_TOL = 'drillTol'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_ENGINE = 'engine'

export const LEN_UNITS = ['mm', 'µm', 'mil']
export const VOLT_UNITS = ['V', 'kV']

const LEN = { mm: LENGTH.mm, 'µm': LENGTH['µm'], um: LENGTH.um, mil: LENGTH.mil }
const ALT = { m: 1 }
const PCT = { '%': 1 }

export const INITIAL_FORM = {
  // --- Clearance ---
  workingVoltage: '', workingVoltageU: 'V',
  peakVoltage: '', peakVoltageU: 'V',
  impulseVoltage: '', impulseVoltageU: 'V',
  altitude: '', altitudeU: 'm',
  pollutionDegree: '',
  insulationType: '',
  coating: '',
  clearFab: '', clearFabU: 'mm',
  clearUser: '', clearUserU: 'mm',
  clearActual: '', clearActualU: 'mm',

  // --- Creepage ---
  creepVoltage: '', creepVoltageU: 'V',
  creepPollution: '',
  creepInsulation: '',
  creepCoating: '',
  materialGroup: '',
  cti: '',
  creepFab: '', creepFabU: 'mm',
  creepUser: '', creepUserU: 'mm',
  creepActual: '', creepActualU: 'mm',

  // --- Padstack ---
  holeType: HOLE_PTH,
  Dfinished: '0.3', DfinishedU: 'mm',
  tPlating: '25', tPlatingU: 'µm',
  Aprocess: '0.05', AprocessU: 'mm',
  targetRing: '0.15', targetRingU: 'mm',
  Ddrill: '0.4', DdrillU: 'mm',
  Dpad: '0.7', DpadU: 'mm',
  drillTolPlus: '0.025', drillTolPlusU: 'mm',
  drillTolMinus: '0.025', drillTolMinusU: 'mm',
  padTolPlus: '0.025', padTolPlusU: 'mm',
  padTolMinus: '0.025', padTolMinusU: 'mm',
  registrationTol: '0.05', registrationTolU: 'mm',
  planeClearance: '0.2', planeClearanceU: 'mm',
  maskExpansion: '0.05', maskExpansionU: 'mm',
  padPitch: '1.0', padPitchU: 'mm',
  neighbourPad: '', neighbourPadU: 'mm',
  holePitch: '', holePitchU: 'mm',
  neighbourDrill: '', neighbourDrillU: 'mm',
  boardThickness: '1.6', boardThicknessU: 'mm',
  aspectBasis: ASPECT_BASIS_DRILL,

  // --- Ortak ---
  warnPercent: '10',
}

// Uyarı marjı bütün sekmelerde ortaktır ve kullanıcı tercihidir.
const warnField = (L) => ({
  key: 'warnPercent', label: L('warnPercent'), unit: '%', table: PCT,
  optional: true, allowZero: true, min: 0, max: 100,
})

export function formFields(tab, mode, labels = {}) {
  const L = (key) => labels[key] ?? key

  if (tab === TAB_CLEARANCE) {
    return fieldsFor([
      [
        { key: 'workingVoltage', label: L('workingVoltage'), unitKey: 'workingVoltageU', table: VOLTAGE, optional: true, allowZero: true, min: 0 },
        { key: 'peakVoltage', label: L('peakVoltage'), unitKey: 'peakVoltageU', table: VOLTAGE, optional: true, allowZero: true, min: 0 },
        { key: 'impulseVoltage', label: L('impulseVoltage'), unitKey: 'impulseVoltageU', table: VOLTAGE, optional: true, allowZero: true, min: 0 },
        { key: 'altitude', label: L('altitude'), unitKey: 'altitudeU', table: ALT, optional: true, allowZero: true, min: 0 },
        { key: 'clearFab', label: L('clearFab'), unitKey: 'clearFabU', table: LEN, optional: true, min: 0 },
        { key: 'clearUser', label: L('clearUser'), unitKey: 'clearUserU', table: LEN, optional: true, min: 0 },
        { key: 'clearActual', label: L('clearActual'), unitKey: 'clearActualU', table: LEN, optional: true, min: 0 },
        warnField(L),
      ],
    ])
  }

  if (tab === TAB_CREEPAGE) {
    return fieldsFor([
      [
        { key: 'creepVoltage', label: L('creepVoltage'), unitKey: 'creepVoltageU', table: VOLTAGE, optional: true, allowZero: true, min: 0 },
        { key: 'cti', label: L('cti'), unit: 'V', table: { V: 1 }, optional: true, allowZero: true, min: 0 },
        { key: 'creepFab', label: L('creepFab'), unitKey: 'creepFabU', table: LEN, optional: true, min: 0 },
        { key: 'creepUser', label: L('creepUser'), unitKey: 'creepUserU', table: LEN, optional: true, min: 0 },
        { key: 'creepActual', label: L('creepActual'), unitKey: 'creepActualU', table: LEN, optional: true, min: 0 },
        warnField(L),
      ],
    ])
  }

  return fieldsFor([
    when(mode === MODE_SYNTHESIS, [
      { key: 'Dfinished', label: L('Dfinished'), unitKey: 'DfinishedU', table: LEN, min: 0 },
      { key: 'targetRing', label: L('targetRing'), unitKey: 'targetRingU', table: LEN, min: 0 },
      { key: 'Aprocess', label: L('Aprocess'), unitKey: 'AprocessU', table: LEN, optional: true, allowZero: true, min: 0 },
    ]),
    when(mode === MODE_ANALYSIS, [
      { key: 'Ddrill', label: L('Ddrill'), unitKey: 'DdrillU', table: LEN, min: 0 },
      { key: 'Dpad', label: L('Dpad'), unitKey: 'DpadU', table: LEN, min: 0 },
      { key: 'Dfinished', label: L('Dfinished'), unitKey: 'DfinishedU', table: LEN, optional: true, min: 0 },
    ]),
    [
      { key: 'tPlating', label: L('tPlating'), unitKey: 'tPlatingU', table: LEN, optional: true, allowZero: true, min: 0 },
      { key: 'drillTolPlus', label: L('drillTolPlus'), unitKey: 'drillTolPlusU', table: LEN, optional: true, allowZero: true, min: 0 },
      { key: 'drillTolMinus', label: L('drillTolMinus'), unitKey: 'drillTolMinusU', table: LEN, optional: true, allowZero: true, min: 0 },
      { key: 'padTolPlus', label: L('padTolPlus'), unitKey: 'padTolPlusU', table: LEN, optional: true, allowZero: true, min: 0 },
      { key: 'padTolMinus', label: L('padTolMinus'), unitKey: 'padTolMinusU', table: LEN, optional: true, allowZero: true, min: 0 },
      { key: 'registrationTol', label: L('registrationTol'), unitKey: 'registrationTolU', table: LEN, optional: true, allowZero: true, min: 0 },
      { key: 'planeClearance', label: L('planeClearance'), unitKey: 'planeClearanceU', table: LEN, optional: true, allowZero: true, min: 0 },
      // Mask genişlemesi negatif olabilir (mask ile tanımlı pad), bu yüzden
      // alt sınır konmaz.
      { key: 'maskExpansion', label: L('maskExpansion'), unitKey: 'maskExpansionU', table: LEN, optional: true, allowZero: true },
      { key: 'padPitch', label: L('padPitch'), unitKey: 'padPitchU', table: LEN, optional: true, min: 0 },
      { key: 'neighbourPad', label: L('neighbourPad'), unitKey: 'neighbourPadU', table: LEN, optional: true, min: 0 },
      { key: 'holePitch', label: L('holePitch'), unitKey: 'holePitchU', table: LEN, optional: true, min: 0 },
      { key: 'neighbourDrill', label: L('neighbourDrill'), unitKey: 'neighbourDrillU', table: LEN, optional: true, min: 0 },
      { key: 'boardThickness', label: L('boardThickness'), unitKey: 'boardThicknessU', table: LEN, optional: true, min: 0 },
      warnField(L),
    ],
  ])
}

// Boş bırakılan seçici "kısıt yok" demektir; boş dizeyi motora null olarak
// geçiririz ki eşleştirme onu bir anahtar sanmasın.
const orNull = (s) => (typeof s === 'string' && s.trim() !== '' ? s : null)

export function compute(tab, mode, f, ctx = {}, labels = {}) {
  const read = readForm(f, formFields(tab, mode, labels))
  if (read.ambiguous.length) return { ok: false, tab, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, tab, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const warnPercent = v.warnPercent ?? null
  const { clearanceProfile = null, limits = {}, hasProfile = false } = ctx

  // Süpürme grafiği aynı girdiyi tek bir değişkeni değiştirerek yeniden
  // hesaplar; bu yüzden motora verilen girdi olduğu gibi saklanır. Ekranın
  // form alanlarından ikinci kez türetmek, iki yerin sessizce ayrışması
  // demek olurdu.
  if (tab === TAB_CLEARANCE) {
    const input = {
      profile: clearanceProfile,
      workingVoltage: v.workingVoltage,
      peakVoltage: v.peakVoltage,
      impulseVoltage: v.impulseVoltage,
      altitudeM: v.altitude,
      pollutionDegree: orNull(f.pollutionDegree),
      insulationType: orNull(f.insulationType),
      coating: orNull(f.coating),
      fabMinimum: v.clearFab,
      userMinimum: v.clearUser,
      actual: v.clearActual,
      warnPercent,
    }
    const r = computeClearance(input)
    if (r.error) return { ok: false, tab, reason: REASON_ENGINE, code: r.error, field: r.field }
    return { ok: true, tab, warnPercent, sweepBase: input, ...r }
  }

  if (tab === TAB_CREEPAGE) {
    const input = {
      profile: clearanceProfile,
      workingVoltage: v.creepVoltage,
      pollutionDegree: orNull(f.creepPollution),
      insulationType: orNull(f.creepInsulation),
      coating: orNull(f.creepCoating),
      materialGroup: orNull(f.materialGroup),
      cti: v.cti,
      altitudeM: v.altitude,
      fabMinimum: v.creepFab,
      userMinimum: v.creepUser,
      actual: v.creepActual,
      warnPercent,
    }
    const r = computeCreepage(input)
    if (r.error) return { ok: false, tab, reason: REASON_ENGINE, code: r.error, field: r.field }
    return { ok: true, tab, warnPercent, sweepBase: input, ...r }
  }

  const padInput = {
    mode,
    holeType: f.holeType,
    Dfinished: v.Dfinished,
    tPlating: v.tPlating,
    Aprocess: v.Aprocess,
    Ddrill: v.Ddrill,
    Dpad: v.Dpad,
    targetRing: v.targetRing,
    drillTolerancePlus: v.drillTolPlus,
    drillToleranceMinus: v.drillTolMinus,
    padTolerancePlus: v.padTolPlus,
    padToleranceMinus: v.padTolMinus,
    registrationTolerance: v.registrationTol,
    planeClearance: v.planeClearance,
    maskExpansion: v.maskExpansion,
    padPitch: v.padPitch,
    neighbourPadDiameter: v.neighbourPad,
    holePitch: v.holePitch,
    neighbourDrillDiameter: v.neighbourDrill,
    boardThickness: v.boardThickness,
    aspectBasis: f.aspectBasis,
    limits,
    warnPercent,
    hasProfile,
  }

  const r = computePadstack(padInput)
  if (r.error) {
    return {
      ok: false, tab, reason: REASON_ENGINE, code: r.error, field: r.field, variant: r.variant,
    }
  }
  return { ok: true, tab, warnPercent, padInput, ...r }
}

/**
 * Grafik verisi. Sekme ve seçilen süpürme değişkenine göre değişir.
 *
 * Clearance/creepage profili basamaklıdır — grafik de basamaklı çıkar ve
 * sürekli bir fiziksel eğri gibi sunulmaz. Kapsam dışı noktada nokta hiç
 * üretilmez, uydurulmuş değerle doldurulmaz.
 */
export function buildSweep(r, sweep) {
  if (!r.ok) return null

  if (r.tab === TAB_CLEARANCE || r.tab === TAB_CREEPAGE) {
    const base = r.sweepBase

    // Rakım süpürmesi yalnızca clearance için anlamlıdır: creepage'a rakım
    // katsayısı otomatik uygulanmaz, eğri düz çıkar ve bir bağımlılık varmış
    // izlenimi verirdi.
    const rows = sweep === SWEEP_ALTITUDE && r.tab === TAB_CLEARANCE
      ? buildClearanceAltitudeSweep(base, 0, 5000, 51)
      : buildVoltageSweep(
        base, 0, 1000, 51,
        r.tab === TAB_CREEPAGE ? CHECK_CREEPAGE : undefined,
      )

    if (rows.length === 0) return null
    return {
      rows,
      points: rows.map((p) => [p.x, p.y]),
      refs: [],
      marker: null,
      sweep,
    }
  }

  const field = sweep === SWEEP_DRILL_TOL ? 'drillTolerancePlus' : 'registrationTolerance'
  const current = r.padInput[field] ?? 0
  const to = Math.max(current * 2, 0.2e-3)
  const rows = buildPadstackSweep(r.padInput, field, 0, to, 41)
  if (rows.length === 0) return null

  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    refs: r.results.ringLimit.value !== null
      ? [{ key: 'min', y: r.results.ringLimit.value }]
      : [],
    marker: { x: current, y: r.results.ringWorst },
    sweep,
  }
}

export { HOLE_PTH, HOLE_NPTH, ASPECT_BASIS_DRILL, ASPECT_BASIS_FINISHED }
