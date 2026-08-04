// MOSFET gate sürücü ve gate direnci hesaplayıcısı ekranının hesap modeli
// (REV2 §6).
//
// Saf: React ve DOM bilmez, gösterim biçimi üretmez. Form nesnesini alır,
// SI'ye çevirir, lib/gateDriver.js motorunu çağırır, sonucu ve hata kodunu
// döner. Kullanıcıya gösterilecek metin text.js içindedir.
//
// Analiz/sentez ayrımı yok — motor tek çağrıda hem turn-on/turn-off Miller
// akımını hem opsiyonel hedef-süreden harici direnç önerisini hem de
// opsiyonel switching/C_oss kayıplarını döner.

import { fieldsFor, readForm, when } from '../../../lib/fields'
import { CHARGE, VOLTAGE, RESISTANCE, CURRENT, FREQUENCY, TIME, CAPACITANCE, ENERGY } from '../../../lib/units'
import {
  gateDriverPlan, millerCurrent, gateDrivePower, totalResistance,
  GD_ERR_INVALID, GD_ERR_NEGATIVE_RESISTANCE, GD_ERR_DRIVER_CURRENT,
} from '../../../lib/gateDriver'
import { logspace } from '../../../lib/sweep'

export { GD_ERR_INVALID, GD_ERR_NEGATIVE_RESISTANCE, GD_ERR_DRIVER_CURRENT }

export const REASON_INCOMPLETE = 'incomplete'
// Motorun kendi hata kodu dışında, yalnızca bu ekrana özgü tamsayı denetimi
// için yerel bir kod — ReturnPathStitchingVia'daki via sayısı deseniyle aynı.
export const REASON_COUNT = 'count'

export const SWEEP_RESISTANCE = 'resistance'
export const SWEEP_FSW = 'fsw'
export const SWEEP_PARAMS = [SWEEP_RESISTANCE, SWEEP_FSW]

// MOSFET sayısı (N) birimsiz bir adettir — ReturnPathStitchingVia'daki
// stitchingViaCount ile aynı desen.
const COUNT = { adet: 1 }

export const INITIAL_FORM = {
  // Varsayılanlar REV2 §6.12 referans testiyle birebir örtüşür:
  // I_avg = 4 mA, P_gate = 40 mW, I_miller = 0.5 A, t_miller = 20 ns.
  qg: '40', qgu: 'nC',
  qgd: '10', qgdu: 'nC',
  vDrive: '10', vDriveu: 'V',
  vPlateau: '5', vPlateauu: 'V',
  vOff: '0', vOffu: 'V',
  fsw: '100', fswu: 'kHz',
  count: '1',

  rDriverSource: '0', rDriverSourceu: 'Ω',
  rDriverSink: '0', rDriverSinku: 'Ω',
  rGateInternal: '0', rGateInternalu: 'Ω',
  rExtOn: '10', rExtOnu: 'Ω',
  rExtOff: '10', rExtOffu: 'Ω',
  rTrace: '0', rTraceu: 'Ω',

  driverPeakSource: '', driverPeakSourceu: 'A',
  driverPeakSink: '', driverPeakSinku: 'A',

  hasTarget: false,
  targetOnTime: '', targetOnTimeu: 'ns',
  targetOffTime: '', targetOffTimeu: 'ns',

  hasLoss: false,
  vds: '', vdsu: 'V',
  id: '', idu: 'A',
  tr: '', tru: 'ns',
  tf: '', tfu: 'ns',
  coss: '', cossu: 'pF',
  eoss: '', eossu: 'nJ',
}

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// `lib/` bunları bilmez. Etiket verilmezse alan anahtarı gösterilir.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'qg', label: L('qg'), unitKey: 'qgu', table: CHARGE, min: 0 },
      { key: 'qgd', label: L('qgd'), unitKey: 'qgdu', table: CHARGE, min: 0 },
      { key: 'vDrive', label: L('vDrive'), unitKey: 'vDriveu', table: VOLTAGE, min: 0 },
      { key: 'vPlateau', label: L('vPlateau'), unitKey: 'vPlateauu', table: VOLTAGE, min: 0 },
      // vOff negatif olabilir (negatif kapama gerilimi) — min BİLEREK verilmez.
      { key: 'vOff', label: L('vOff'), unitKey: 'vOffu', table: VOLTAGE, optional: true, allowZero: true },
      { key: 'fsw', label: L('fsw'), unitKey: 'fswu', table: FREQUENCY, min: 0 },
      { key: 'count', label: L('count'), unit: 'adet', table: COUNT, min: 1 },
    ],
    [
      {
        key: 'rDriverSource', label: L('rDriverSource'), unitKey: 'rDriverSourceu', table: RESISTANCE,
        min: 0, optional: true, allowZero: true,
      },
      {
        key: 'rDriverSink', label: L('rDriverSink'), unitKey: 'rDriverSinku', table: RESISTANCE,
        min: 0, optional: true, allowZero: true,
      },
      {
        key: 'rGateInternal', label: L('rGateInternal'), unitKey: 'rGateInternalu', table: RESISTANCE,
        min: 0, optional: true, allowZero: true,
      },
      {
        key: 'rExtOn', label: L('rExtOn'), unitKey: 'rExtOnu', table: RESISTANCE,
        min: 0, optional: true, allowZero: true,
      },
      {
        key: 'rExtOff', label: L('rExtOff'), unitKey: 'rExtOffu', table: RESISTANCE,
        min: 0, optional: true, allowZero: true,
      },
      {
        key: 'rTrace', label: L('rTrace'), unitKey: 'rTraceu', table: RESISTANCE,
        min: 0, optional: true, allowZero: true,
      },
      { key: 'driverPeakSource', label: L('driverPeakSource'), unitKey: 'driverPeakSourceu', table: CURRENT, min: 0, optional: true },
      { key: 'driverPeakSink', label: L('driverPeakSink'), unitKey: 'driverPeakSinku', table: CURRENT, min: 0, optional: true },
    ],
    when(f.hasTarget, [
      { key: 'targetOnTime', label: L('targetOnTime'), unitKey: 'targetOnTimeu', table: TIME, min: 0, optional: true },
      { key: 'targetOffTime', label: L('targetOffTime'), unitKey: 'targetOffTimeu', table: TIME, min: 0, optional: true },
    ]),
    when(f.hasLoss, [
      { key: 'vds', label: L('vds'), unitKey: 'vdsu', table: VOLTAGE, min: 0 },
      { key: 'id', label: L('id'), unitKey: 'idu', table: CURRENT, min: 0, optional: true },
      { key: 'tr', label: L('tr'), unitKey: 'tru', table: TIME, min: 0, optional: true, allowZero: true },
      { key: 'tf', label: L('tf'), unitKey: 'tfu', table: TIME, min: 0, optional: true, allowZero: true },
      { key: 'coss', label: L('coss'), unitKey: 'cossu', table: CAPACITANCE, min: 0, optional: true, allowZero: true },
      { key: 'eoss', label: L('eoss'), unitKey: 'eossu', table: ENERGY, min: 0, optional: true, allowZero: true },
    ]),
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values

  // fields.js tamsayı zorlamaz — MOSFET sayısı burada denetlenir.
  if (!Number.isInteger(v.count) || v.count < 1) {
    return { ok: false, reason: REASON_COUNT }
  }

  const plan = gateDriverPlan({
    qg: v.qg,
    qgd: v.qgd,
    vDrive: v.vDrive,
    vPlateau: v.vPlateau,
    vOff: v.vOff ?? 0,
    rDriverSource: v.rDriverSource ?? 0,
    rDriverSink: v.rDriverSink ?? 0,
    rGateInternal: v.rGateInternal ?? 0,
    rExtOn: v.rExtOn ?? 0,
    rExtOff: v.rExtOff ?? 0,
    rTrace: v.rTrace ?? 0,
    driverPeakSource: v.driverPeakSource ?? null,
    driverPeakSink: v.driverPeakSink ?? null,
    fsw: v.fsw,
    count: v.count,
    targetOnTime: f.hasTarget ? (v.targetOnTime ?? null) : null,
    targetOffTime: f.hasTarget ? (v.targetOffTime ?? null) : null,
    vds: f.hasLoss ? (v.vds ?? null) : null,
    id: f.hasLoss ? (v.id ?? null) : null,
    tr: f.hasLoss ? (v.tr ?? null) : null,
    tf: f.hasLoss ? (v.tf ?? null) : null,
    coss: f.hasLoss ? (v.coss ?? null) : null,
    eoss: f.hasLoss ? (v.eoss ?? null) : null,
  })
  if (plan.error) return { ok: false, reason: plan.error }

  return {
    ok: true,
    count: v.count,
    // Motor bu ham girdileri geri döndürmez (yalnız türetilmiş sonucu döner);
    // sweep, şematik ve rapor etiketleri için burada taşınır.
    qg: v.qg,
    qgd: v.qgd,
    vDrive: v.vDrive,
    vPlateau: v.vPlateau,
    vOff: v.vOff ?? 0,
    fsw: v.fsw,
    // Taban dirençler (harici hariç) burada toplanmaz — sweep, taranan her
    // noktada toplam direnci gateDriver.js'in totalResistance()'ıyla kurar
    // (kopya toplama mantığı yerine motor fonksiyonu yeniden kullanılıyor).
    rDriverSourceInput: v.rDriverSource ?? 0,
    rDriverSinkInput: v.rDriverSink ?? 0,
    rGateInternalInput: v.rGateInternal ?? 0,
    rTraceInput: v.rTrace ?? 0,
    rExtOnInput: v.rExtOn ?? 0,
    rExtOffInput: v.rExtOff ?? 0,
    driverPeakSourceInput: v.driverPeakSource ?? null,
    driverPeakSinkInput: v.driverPeakSink ?? null,
    cossSource: v.eoss != null ? 'eoss' : (v.coss != null ? 'coss' : null),
    ...plan,
  }
}

// Harici direnç ↔ Miller akımı: I = (V_sürüş − V_plato)/R_toplam, driver
// limitiyle kırpılır. Aralık 0.1–200 Ω log ekseninde — alt sınır 0.1 (asla 0
// değil) bilinçli: totalResistance() toplamı sıfır ya da altındaysa NaN döner
// (gateDriver.js'teki fiziksel-olmayan sıfır toplam direnç koruması), taranan
// her noktada R_ext bu toplama girdiği için toplam asla sıfırlanmaz.
function resistanceSweep(r) {
  const { values } = logspace(0.1, 200, 100)
  return (values ?? []).map((rExt) => {
    const on = millerCurrent({
      vDrive: r.vDrive, vPlateau: r.vPlateau,
      rTotal: totalResistance({
        driver: r.rDriverSourceInput, internal: r.rGateInternalInput, external: rExt, trace: r.rTraceInput,
      }),
      driverLimit: r.driverPeakSourceInput,
    })
    const off = millerCurrent({
      vDrive: r.vPlateau, vPlateau: r.vOff,
      rTotal: totalResistance({
        driver: r.rDriverSinkInput, internal: r.rGateInternalInput, external: rExt, trace: r.rTraceInput,
      }),
      driverLimit: r.driverPeakSinkInput,
    })
    return {
      x: rExt,
      y: on.error ? null : on.actual,
      yOff: off.error ? null : off.actual,
    }
  })
}

// Gate sürme gücü anahtarlama frekansıyla doğrusaldır: P = N·Q_g·ΔV·f_sw.
function fswSweep(r) {
  const lo = Math.max(r.fsw / 100, 1e3)
  const hi = r.fsw * 100
  const { values } = logspace(lo, hi, 100)
  return (values ?? []).map((fsw) => ({
    x: fsw,
    y: gateDrivePower({ qg: r.qg, vOn: r.vDrive, vOff: r.vOff, fsw, count: r.count }),
  }))
}

export function buildSweep(r, param) {
  if (!r.ok) return null

  if (param === SWEEP_FSW) {
    const rows = fswSweep(r)
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.fsw, y: r.gatePower },
    }
  }

  const rows = resistanceSweep(r)
  return {
    param: SWEEP_RESISTANCE,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    pointsOff: rows.map((p) => [p.x, p.yOff]),
    marker: { x: r.rExtOnInput, y: r.on.current },
  }
}
