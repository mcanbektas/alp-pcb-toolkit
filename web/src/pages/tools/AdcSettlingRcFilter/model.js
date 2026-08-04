// ADC giriş yerleşme süresi ve RC filtre hesaplayıcısı ekranının hesap modeli
// (REV2 §7).
//
// Saf: React ve DOM bilmez, gösterim biçimi üretmez. Form nesnesini alır,
// SI'ye çevirir, lib/adcSettling.js motorunu çağırır, sonucu ve hata kodunu
// döner. Kullanıcıya gösterilecek metin text.js içindedir.
//
// Analiz/sentez ayrımı yok — motor tek çağrıda hem yerleşme değerlendirmesini
// hem izin verilen maksimum kaynak direncini hem de opsiyonel RC filtre
// yanıtını döner.

import { fieldsFor, readForm, when } from '../../../lib/fields'
import { VOLTAGE, CAPACITANCE, RESISTANCE, TIME, FREQUENCY } from '../../../lib/units'
import {
  adcSettlingPlan, relativeError, filterResponse,
  ADC_ERR_INVALID, ADC_ERR_BUFFER_REQUIRED, ADC_ERR_SETTLING_FAILED,
} from '../../../lib/adcSettling'
import { logspace } from '../../../lib/sweep'

export { ADC_ERR_INVALID, ADC_ERR_BUFFER_REQUIRED, ADC_ERR_SETTLING_FAILED }

export const REASON_INCOMPLETE = 'incomplete'
// Motorun kendi hata kodu dışında, yalnızca bu ekrana özgü tamsayı denetimi
// için yerel bir kod — ReturnPathStitchingVia'daki via sayısı deseniyle aynı.
export const REASON_BITS = 'bits'

export const ACQ_DIRECT = 'direct'
export const ACQ_CYCLES = 'cycles'

export const SWEEP_SETTLING = 'settling'
export const SWEEP_FILTER = 'filter'
export const SWEEP_PARAMS = [SWEEP_SETTLING, SWEEP_FILTER]

// Bit sayısı birimsiz bir tam sayıdır — ReturnPathStitchingVia'daki
// stitchingViaCount ile aynı desen.
const BITS_UNIT = { bit: 1 }

export const INITIAL_FORM = {
  // Varsayılanlar REV2 §7.12 referans testiyle birebir örtüşür:
  // N = 12, C_s = 20 pF, t_acq = 1 µs → R_eq,maks ≈ 5.55 kΩ.
  bits: '12',
  vFullScale: '3.3', vFullScaleu: 'V',
  cs: '20', csu: 'pF',

  acqMode: ACQ_DIRECT,
  tAcq: '1', tAcqu: 'µs',
  cycles: '', clock: '', clocku: 'MHz', acqFixed: '', acqFixedu: 'ns',

  rSource: '0', rSourceu: 'Ω',
  rSeries: '0', rSeriesu: 'Ω',
  // Dört direncin TAMAMI sıfırsa lib/adcSettling.js'teki `timeConstant`
  // rEq > 0 şartını sağlamadığı için τ (ve dolayısıyla `settles`) NaN döner
  // (motor davranışı — burada değiştirilmez). Gerçekçi bir ADC anahtar
  // direnci varsayılanı bu dejenere durumu baştan önler.
  rSwitch: '300', rSwitchu: 'Ω',
  rDriver: '0', rDriveru: 'Ω',

  cFilter: '', cFilteru: 'nF',
  rFilter: '', rFilteru: 'Ω',
  noiseFreq: '', noiseFrequ: 'MHz',

  vStep: '', vStepu: 'V',
  tempC: '',
}

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// `lib/` bunları bilmez. Etiket verilmezse alan anahtarı gösterilir.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'bits', label: L('bits'), unit: 'bit', table: BITS_UNIT, min: 1 },
      { key: 'vFullScale', label: L('vFullScale'), unitKey: 'vFullScaleu', table: VOLTAGE, min: 0 },
      { key: 'cs', label: L('cs'), unitKey: 'csu', table: CAPACITANCE, min: 0 },
    ],
    f.acqMode === ACQ_CYCLES
      ? [
        // Çevrim sayısı birimsiz — tempC ile aynı gerekçeyle `table` verilmez.
        { key: 'cycles', label: L('cycles'), min: 0 },
        { key: 'clock', label: L('clock'), unitKey: 'clocku', table: FREQUENCY, min: 0 },
        { key: 'acqFixed', label: L('acqFixed'), unitKey: 'acqFixedu', table: TIME, min: 0, optional: true, allowZero: true },
      ]
      : [
        { key: 'tAcq', label: L('tAcq'), unitKey: 'tAcqu', table: TIME, min: 0 },
      ],
    [
      { key: 'rSource', label: L('rSource'), unitKey: 'rSourceu', table: RESISTANCE, min: 0, optional: true, allowZero: true },
      { key: 'rSeries', label: L('rSeries'), unitKey: 'rSeriesu', table: RESISTANCE, min: 0, optional: true, allowZero: true },
      { key: 'rSwitch', label: L('rSwitch'), unitKey: 'rSwitchu', table: RESISTANCE, min: 0, optional: true, allowZero: true },
      { key: 'rDriver', label: L('rDriver'), unitKey: 'rDriveru', table: RESISTANCE, min: 0, optional: true, allowZero: true },
    ],
    [
      { key: 'cFilter', label: L('cFilter'), unitKey: 'cFilteru', table: CAPACITANCE, min: 0, optional: true },
      { key: 'rFilter', label: L('rFilter'), unitKey: 'rFilteru', table: RESISTANCE, min: 0, optional: true },
      { key: 'noiseFreq', label: L('noiseFreq'), unitKey: 'noiseFrequ', table: FREQUENCY, min: 0, optional: true },
    ],
    [
      { key: 'vStep', label: L('vStep'), unitKey: 'vStepu', table: VOLTAGE, min: 0, optional: true },
      // Sıcaklık burada BİLEREK birim tablosuz: °C → K dönüşümü ofsetlidir
      // (çarpansal değil), fields.js'in `table` sözleşmesine uymaz. Ham
      // Celsius değeri compute() içinde elle 273.15 eklenerek çevrilir.
      { key: 'tempC', label: L('tempC'), optional: true, allowZero: true, min: -273.15 },
    ],
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values

  if (!Number.isInteger(v.bits) || v.bits < 1) {
    return { ok: false, reason: REASON_BITS }
  }

  const plan = adcSettlingPlan({
    bits: v.bits,
    vFullScale: v.vFullScale,
    cs: v.cs,
    tAcq: f.acqMode === ACQ_DIRECT ? v.tAcq ?? null : null,
    cycles: f.acqMode === ACQ_CYCLES ? (v.cycles ?? null) : null,
    clock: f.acqMode === ACQ_CYCLES ? (v.clock ?? null) : null,
    acqFixed: f.acqMode === ACQ_CYCLES ? (v.acqFixed ?? 0) : 0,
    rSource: v.rSource ?? 0,
    rSeries: v.rSeries ?? 0,
    rSwitch: v.rSwitch ?? 0,
    rDriver: v.rDriver ?? 0,
    cFilter: v.cFilter ?? 0,
    rFilter: v.rFilter ?? null,
    noiseFreq: v.noiseFreq ?? null,
    vStep: v.vStep ?? null,
    tempK: v.tempC != null ? v.tempC + 273.15 : 298.15,
  })
  if (plan.error) return { ok: false, reason: plan.error }

  return {
    ok: true,
    bits: v.bits,
    // Motor bu ham girdiyi geri döndürmez (yalnız türetilmiş `filter`/
    // `cutoffFrequency`i döner); sweep işaretçisi ve rapor için taşınır.
    noiseFreqInput: v.noiseFreq ?? null,
    ...plan,
  }
}

// Yerleşme eğrisi: ε(t) = e^(−t/τ) — log-y eksende düz çizgi. Aralık 0'dan
// 8τ'ye kadar (pratikte 8τ'de hata ~3e−4, görsel olarak sıfıra yaklaşmış).
function settlingSweep(r) {
  const n = 120
  const tMax = r.tau * 8
  const rows = []
  for (let i = 0; i <= n; i++) {
    const tt = (tMax * i) / n
    rows.push({ x: tt, y: relativeError({ t: tt, tau: r.tau }) })
  }
  return rows
}

// RC filtre yanıtı: yalnızca kesim frekansı hesaplanabiliyorsa (r_filter ve
// c_filter verilmiş) veri döner — ReturnPathStitchingVia'daki kondansatör
// sweep'iyle aynı "opsiyonel girdi yoksa null" deseni.
function filterSweep(r) {
  const { values } = logspace(r.cutoffFrequency / 100, r.cutoffFrequency * 100, 120)
  return (values ?? []).map((f) => ({
    x: f,
    y: filterResponse({ f, fc: r.cutoffFrequency }).attenuationDb,
  }))
}

export function buildSweep(r, param) {
  if (!r.ok) return null

  if (param === SWEEP_FILTER) {
    if (r.cutoffFrequency == null) return null
    const rows = filterSweep(r)
    const markerX = r.noiseFreqInput ?? r.cutoffFrequency
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: {
        x: markerX,
        y: r.filter ? r.filter.attenuationDb : filterResponse({ f: markerX, fc: r.cutoffFrequency }).attenuationDb,
      },
    }
  }

  const rows = settlingSweep(r)
  return {
    param: SWEEP_SETTLING,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    marker: { x: r.acquisitionTime, y: r.relativeError },
  }
}
