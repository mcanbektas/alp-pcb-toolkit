// dB, kazanç ve dBm dönüştürücü ekranının hesap modeli (spec §11.4).
// Saf: React, DOM ve gösterim bilmez. Hata durumunda kod döner, metni
// text.js çevirir.

import { fieldsFor, readForm, when } from '../../../lib/fields'
import { POWER, VOLTAGE, RESISTANCE } from '../../../lib/units'
import {
  powerRatioToDb, dbToPowerRatio,
  voltageRatioToDb, dbToVoltageRatio,
  powerRatioFromVoltageRatio,
  wattToDbm, dbmToWatt, rmsVoltage,
  DBM_REF_W, DB_ERR_RANGE,
} from '../../../lib/convertDecibel'

// --- Mod ve yön ---
export const MODE_POWER = 'power'
export const MODE_VOLTAGE = 'voltage'
export const MODE_DBM = 'dbm'
export const MODES = [MODE_POWER, MODE_VOLTAGE, MODE_DBM]

// İleri yön: fiziksel büyüklükten dB'ye. Ters yön: dB'den büyüklüğe.
export const DIR_FORWARD = 'forward'
export const DIR_REVERSE = 'reverse'
export const DIRS = [DIR_FORWARD, DIR_REVERSE]

// --- Hesap yapılamadığında dönen kodlar ---
export const REASON_INCOMPLETE = 'incomplete'
export const REASON_RATIO = 'ratio'
export const REASON_POWER = 'power'
// Girişler geçerli ama sonuç kayan nokta aralığının dışına taşıyor
export const REASON_RANGE = 'range'

// Motor kodunu ekran koduna çevirir; taşma her modda ayrı anlatılır.
const reasonFor = (error, fallback) => (error === DB_ERR_RANGE ? REASON_RANGE : fallback)

export const POWER_UNITS = ['W', 'mW', 'µW', 'kW']
export const VOLTAGE_UNITS = ['V', 'mV', 'µV', 'kV']

// units.js tablolarında bulunmayan birimler ekran düzeyinde tanımlanır
const DB = { dB: 1 }
const DBM = { dBm: 1 }

export const INITIAL_FORM = {
  mode: MODE_POWER,
  dir: DIR_FORWARD,

  // Güç oranı modu
  P1: '1', P1u: 'mW',
  P2: '100', P2u: 'mW',

  // Gerilim oranı modu
  V1: '1', V1u: 'V',
  V2: '10', V2u: 'V',

  // Ters yönde ortak giriş
  dB: '20',

  // dBm modu
  P: '1', Pu: 'mW',
  dBm: '0',
  Z: '50',
}

// Oran alanları sıfır ve negatif değeri alan doğrulamasında geçirir
// (allowZero), çünkü "log tanımsız" durumu ayrı bir hata koduyla
// bildirilir; "alanı doldur" mesajı bu durumu doğru anlatmaz.
export function formFields(f, labels = {}) {
  const power = f.mode === MODE_POWER
  const volt = f.mode === MODE_VOLTAGE
  const dbm = f.mode === MODE_DBM
  const fwd = f.dir === DIR_FORWARD
  const L = (key) => labels[key] ?? key

  return fieldsFor([
    when(power && fwd, [
      { key: 'P1', label: L('P1'), unitKey: 'P1u', table: POWER, allowZero: true },
      { key: 'P2', label: L('P2'), unitKey: 'P2u', table: POWER, allowZero: true },
    ]),
    when(power && !fwd, [
      { key: 'dB', label: L('dB'), unit: 'dB', table: DB, allowZero: true },
      { key: 'P1', label: L('P1'), unitKey: 'P1u', table: POWER, allowZero: true, optional: true },
    ]),
    when(volt && fwd, [
      { key: 'V1', label: L('V1'), unitKey: 'V1u', table: VOLTAGE, allowZero: true },
      { key: 'V2', label: L('V2'), unitKey: 'V2u', table: VOLTAGE, allowZero: true },
    ]),
    when(volt && !fwd, [
      { key: 'dB', label: L('dB'), unit: 'dB', table: DB, allowZero: true },
      { key: 'V1', label: L('V1'), unitKey: 'V1u', table: VOLTAGE, allowZero: true, optional: true },
    ]),
    when(dbm && fwd, [
      { key: 'P', label: L('P'), unitKey: 'Pu', table: POWER, allowZero: true },
    ]),
    when(dbm && !fwd, [
      { key: 'dBm', label: L('dBm'), unit: 'dBm', table: DBM, allowZero: true },
    ]),
    when(dbm, [
      { key: 'Z', label: L('Z'), unit: 'Ω', table: RESISTANCE, min: 0 },
    ]),
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const mode = f.mode
  const dir = f.dir
  const fwd = dir === DIR_FORWARD

  // --- dBm: 1 mW referansına göre mutlak seviye ---
  if (mode === MODE_DBM) {
    const level = fwd ? wattToDbm(v.P) : dbmToWatt(v.dBm)
    if (level.error) return { ok: false, reason: reasonFor(level.error, REASON_POWER) }

    const volt = rmsVoltage(level.W, v.Z)
    if (volt.error) return { ok: false, reason: reasonFor(volt.error, REASON_POWER) }

    return {
      ok: true,
      mode, dir,
      dBm: level.dBm,
      W: level.W,
      mW: level.mW,
      Z: v.Z,
      Vrms: volt.V,
      refW: DBM_REF_W,
      // dBm de bir orandır: referansı 1 mW olan güç oranı
      powerRatio: level.mW,
    }
  }

  // --- Güç oranı ↔ dB ---
  if (mode === MODE_POWER) {
    if (fwd) {
      const g = powerRatioToDb(v.P2 / v.P1)
      if (g.error) return { ok: false, reason: reasonFor(g.error, REASON_RATIO) }
      const vr = dbToVoltageRatio(g.dB)
      if (vr.error) return { ok: false, reason: reasonFor(vr.error, REASON_RATIO) }
      return {
        ok: true,
        mode, dir,
        dB: g.dB,
        powerRatio: g.ratio,
        voltageRatio: vr.ratio,
        P1: v.P1, P2: v.P2,
        V1: null, V2: null,
      }
    }

    // Referans güç isteğe bağlıdır; verilmişse pozitif olmak zorunda
    if (v.P1 !== null && !(v.P1 > 0)) return { ok: false, reason: REASON_RATIO }
    const p = dbToPowerRatio(v.dB)
    if (p.error) return { ok: false, reason: reasonFor(p.error, REASON_INCOMPLETE) }
    const vr = dbToVoltageRatio(v.dB)
    if (vr.error) return { ok: false, reason: reasonFor(vr.error, REASON_INCOMPLETE) }
    return {
      ok: true,
      mode, dir,
      dB: v.dB,
      powerRatio: p.ratio,
      voltageRatio: vr.ratio,
      P1: v.P1,
      P2: v.P1 !== null ? v.P1 * p.ratio : null,
      V1: null, V2: null,
    }
  }

  // --- Gerilim oranı ↔ dB (empedanslar eşitken) ---
  if (fwd) {
    const g = voltageRatioToDb(v.V2 / v.V1)
    if (g.error) return { ok: false, reason: reasonFor(g.error, REASON_RATIO) }
    const pr = powerRatioFromVoltageRatio(g.ratio)
    if (pr.error) return { ok: false, reason: reasonFor(pr.error, REASON_RATIO) }
    return {
      ok: true,
      mode, dir,
      dB: g.dB,
      voltageRatio: g.ratio,
      powerRatio: pr.powerRatio,
      V1: v.V1, V2: v.V2,
      P1: null, P2: null,
    }
  }

  if (v.V1 !== null && !(v.V1 > 0)) return { ok: false, reason: REASON_RATIO }
  const vr = dbToVoltageRatio(v.dB)
  if (vr.error) return { ok: false, reason: reasonFor(vr.error, REASON_INCOMPLETE) }
  const pr = dbToPowerRatio(v.dB)
  if (pr.error) return { ok: false, reason: reasonFor(pr.error, REASON_INCOMPLETE) }
  return {
    ok: true,
    mode, dir,
    dB: v.dB,
    voltageRatio: vr.ratio,
    powerRatio: pr.ratio,
    V1: v.V1,
    V2: v.V1 !== null ? v.V1 * vr.ratio : null,
    P1: null, P2: null,
  }
}

// Grafik iki biçimde çizilir:
//   'ratio' — x: oran (log), y: dB. İki eğri: 10·log₁₀ ve 20·log₁₀.
//   'dbm'   — x: güç (mW, log), y: dBm seviyesi.
export function buildSweep(r) {
  if (!r.ok) return null

  const steps = 61

  if (r.mode === MODE_DBM) {
    const center = r.mW
    if (!Number.isFinite(center) || !(center > 0)) return null

    const from = center / 1000
    const to = center * 1000
    const rows = []
    for (let i = 0; i < steps; i++) {
      const mW = Math.pow(10, Math.log10(from) + ((Math.log10(to) - Math.log10(from)) * i) / (steps - 1))
      const d = wattToDbm(mW * DBM_REF_W)
      rows.push({ x: mW, y: d.error ? NaN : d.dBm })
    }

    return {
      kind: 'dbm',
      rows,
      points: rows.map((p) => [p.x, p.y]),
      voltagePoints: null,
      refs: [],
      marker: { x: r.mW, y: r.dBm },
    }
  }

  // Çalışma noktası hangi orandan okunuyorsa tarama onun çevresine kurulur
  const center = r.mode === MODE_VOLTAGE ? r.voltageRatio : r.powerRatio
  if (!Number.isFinite(center) || !(center > 0)) return null

  const from = center / 100
  const to = center * 100
  const rows = []
  for (let i = 0; i < steps; i++) {
    const x = Math.pow(10, Math.log10(from) + ((Math.log10(to) - Math.log10(from)) * i) / (steps - 1))
    const p = powerRatioToDb(x)
    const q = voltageRatioToDb(x)
    rows.push({ x, y: p.error ? NaN : p.dB, y2: q.error ? NaN : q.dB })
  }

  return {
    kind: 'ratio',
    rows,
    points: rows.map((p) => [p.x, p.y]),
    voltagePoints: rows.map((p) => [p.x, p.y2]),
    refs: [],
    marker: { x: center, y: r.dB },
  }
}
