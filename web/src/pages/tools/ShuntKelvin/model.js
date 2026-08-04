// Shunt direnci ve Kelvin bağlantı hesaplayıcısı ekranının hesap modeli
// (REV2 §9).
//
// Saf: React ve DOM bilmez, gösterim biçimi üretmez. Form nesnesini alır,
// SI'ye çevirir, lib/shuntKelvin.js motorunu çağırır, sonucu ve hata kodunu
// döner. Kullanıcıya gösterilecek metin text.js içindedir.
//
// Analiz/sentez ayrımı yok — motor tek çağrıda güç, sıcaklık, ölçüm zinciri
// çözünürlüğü ve hata bütçesini (worst-case + RSS) birlikte döner.

import { fieldsFor, readForm, when } from '../../../lib/fields'
import { CURRENT, VOLTAGE, RESISTANCE, POWER, THERMAL_R } from '../../../lib/units'
import {
  shuntKelvinPlan, tcrError, worstCaseError,
  SK_ERR_INVALID, SK_ERR_POWER_EXCEEDED,
} from '../../../lib/shuntKelvin'
import { logspace } from '../../../lib/sweep'

export { SK_ERR_INVALID, SK_ERR_POWER_EXCEEDED }

export const REASON_INCOMPLETE = 'incomplete'
// Motorun kendi hata kodu dışında, yalnızca bu ekrana özgü tamsayı denetimi
// için yerel bir kod — ReturnPathStitchingVia'daki via sayısı deseniyle aynı.
// (`enob` için gerekmiyor: motor onu zaten kendi içinde yuvarlıyor.)
export const REASON_BITS = 'bits'

export const SHUNT_DIRECT = 'direct'
export const SHUNT_FROM_VSENSE = 'fromVsense'

export const SWEEP_CURRENT = 'current'
export const SWEEP_TEMP = 'temperature'
export const SWEEP_PARAMS = [SWEEP_CURRENT, SWEEP_TEMP]

// Yüzde girilen ama motorun birimsiz ORAN (0–1) beklediği alanlar için —
// tcrError/worstCaseError dokümantasyonundaki "bağıl oran, yüzde değil"
// notuyla aynı gerekçe; arayüzde % yazılır, motora 0–1 gider.
const PCT = { '%': 0.01 }

export const INITIAL_FORM = {
  // Varsayılanlar REV2 §9.11 referans testiyle birebir örtüşür:
  // shunt 5 mΩ, güç 0.5 W, akım çözünürlüğü ≈ 3.22 mA.
  iMax: '10', iMaxu: 'A',
  shuntMode: SHUNT_FROM_VSENSE,
  shunt: '5', shuntu: 'mΩ',
  vSenseFs: '50', vSenseFsu: 'mV',

  iRms: '', iRmsu: 'A',
  iPeak: '', iPeaku: 'A',
  iNominal: '', iNominalu: 'A',

  tolerance: '', // %
  tcrPpm: '', // ppm/°C
  referenceTemp: '25', // °C
  ambient: '25', // °C

  hasThermal: false,
  thermalResistance: '', thermalResistanceu: '°C/W',
  ratedPower: '', ratedPoweru: 'W',
  derating: '', // %

  gain: '50',
  gainTolerance: '', // %
  vos: '50', vosu: 'µV',

  hasAdc: true,
  vRef: '3.3', vRefu: 'V',
  bits: '12',
  enob: '',

  sharedResistance: '0', sharedResistanceu: 'mΩ',
  kelvin: true,
}

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// `lib/` bunları bilmez. Etiket verilmezse alan anahtarı gösterilir.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'iMax', label: L('iMax'), unitKey: 'iMaxu', table: CURRENT, min: 0 },
    ],
    f.shuntMode === SHUNT_DIRECT
      ? [{ key: 'shunt', label: L('shunt'), unitKey: 'shuntu', table: RESISTANCE, min: 0 }]
      : [{ key: 'vSenseFs', label: L('vSenseFs'), unitKey: 'vSenseFsu', table: VOLTAGE, min: 0 }],
    [
      { key: 'iRms', label: L('iRms'), unitKey: 'iRmsu', table: CURRENT, min: 0, optional: true },
      { key: 'iPeak', label: L('iPeak'), unitKey: 'iPeaku', table: CURRENT, min: 0, optional: true },
      { key: 'iNominal', label: L('iNominal'), unitKey: 'iNominalu', table: CURRENT, min: 0, optional: true },
    ],
    [
      { key: 'tolerance', label: L('tolerance'), unit: '%', table: PCT, min: 0, optional: true, allowZero: true },
      { key: 'tcrPpm', label: L('tcrPpm'), min: 0, optional: true, allowZero: true },
      { key: 'referenceTemp', label: L('referenceTemp'), optional: true, allowZero: true },
      { key: 'ambient', label: L('ambient'), optional: true, allowZero: true },
      { key: 'gain', label: L('gain'), min: 0 },
      { key: 'gainTolerance', label: L('gainTolerance'), unit: '%', table: PCT, min: 0, optional: true, allowZero: true },
      { key: 'vos', label: L('vos'), unitKey: 'vosu', table: VOLTAGE, min: 0, optional: true, allowZero: true },
      {
        key: 'sharedResistance', label: L('sharedResistance'), unitKey: 'sharedResistanceu', table: RESISTANCE,
        min: 0, optional: true, allowZero: true,
      },
    ],
    when(f.hasThermal, [
      { key: 'thermalResistance', label: L('thermalResistance'), unitKey: 'thermalResistanceu', table: THERMAL_R, min: 0 },
      { key: 'ratedPower', label: L('ratedPower'), unitKey: 'ratedPoweru', table: POWER, min: 0, optional: true },
      { key: 'derating', label: L('derating'), unit: '%', table: PCT, min: 0, optional: true },
    ]),
    when(f.hasAdc, [
      { key: 'vRef', label: L('vRef'), unitKey: 'vRefu', table: VOLTAGE, min: 0, optional: true },
      { key: 'bits', label: L('bits'), min: 1, optional: true },
      { key: 'enob', label: L('enob'), min: 0, optional: true },
    ]),
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values

  if (v.bits != null && !Number.isInteger(v.bits)) {
    return { ok: false, reason: REASON_BITS }
  }

  const plan = shuntKelvinPlan({
    iMax: v.iMax,
    iRms: v.iRms ?? null,
    iPeak: v.iPeak ?? null,
    iNominal: v.iNominal ?? null,
    vSenseFs: f.shuntMode === SHUNT_FROM_VSENSE ? v.vSenseFs : null,
    shunt: f.shuntMode === SHUNT_DIRECT ? v.shunt : null,
    tolerance: v.tolerance ?? 0,
    tcrPpm: v.tcrPpm ?? 0,
    referenceTemp: v.referenceTemp ?? 25,
    ambient: v.ambient ?? 25,
    thermalResistance: f.hasThermal ? (v.thermalResistance ?? null) : null,
    ratedPower: f.hasThermal ? (v.ratedPower ?? null) : null,
    derating: f.hasThermal ? (v.derating ?? 1) : 1,
    gain: v.gain,
    gainTolerance: v.gainTolerance ?? 0,
    vos: v.vos ?? 0,
    vRef: f.hasAdc ? (v.vRef ?? null) : null,
    bits: f.hasAdc ? (v.bits ?? null) : null,
    enob: f.hasAdc ? (v.enob ?? null) : null,
    sharedResistance: v.sharedResistance ?? 0,
    kelvin: f.kelvin,
  })
  if (plan.error) return { ok: false, reason: plan.error }

  return {
    ok: true,
    kelvin: f.kelvin,
    // Motor bu ham girdileri geri döndürmez; sweep ve rapor için taşınır.
    iMaxInput: v.iMax,
    iNominalInput: v.iNominal ?? v.iMax,
    toleranceInput: v.tolerance ?? 0,
    tcrPpmInput: v.tcrPpm ?? 0,
    referenceTempInput: v.referenceTemp ?? 25,
    ambientInput: v.ambient ?? 25,
    gainToleranceInput: v.gainTolerance ?? 0,
    ...plan,
  }
}

// Amplifikatör offset'i sabit bir akım hatasıdır (|v_os|/R_shunt); işletme
// akımı düştükçe bu sabit hatanın BAĞIL payı büyür. Aralık I_maks/100'den
// I_maks'a kadar log ekseninde.
function currentSweep(r) {
  const { values } = logspace(r.iMaxInput / 100, r.iMaxInput, 100)
  return (values ?? []).map((i) => ({ x: i, y: r.offsetCurrentError / i }))
}

// Sıcaklık sweep'i yalnız TCR bileşenini yeniden hesaplar; tolerans, gain
// toleransı, offset ve paylaşılan yol hatası sabit tutulur (bunlar sıcaklığa
// bağlı değildir).
function temperatureSweep(r) {
  const center = r.ambientInput
  const rows = []
  const n = 100
  for (let i = 0; i <= n; i++) {
    const temperature = center - 100 + (200 * i) / n
    const eTcr = tcrError({ ppm: r.tcrPpmInput, temperature, reference: r.referenceTempInput })
    const total = worstCaseError([r.toleranceInput, eTcr, r.gainToleranceInput, r.offsetError, r.sharedError])
    rows.push({ x: temperature, y: total })
  }
  return rows
}

export function buildSweep(r, param) {
  if (!r.ok) return null

  if (param === SWEEP_TEMP) {
    const rows = temperatureSweep(r)
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.temperature, y: r.worstCaseError },
    }
  }

  const rows = currentSweep(r)
  return {
    param: SWEEP_CURRENT,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    marker: { x: r.iNominalInput, y: r.offsetError },
  }
}
