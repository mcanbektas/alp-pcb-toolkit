// CAN ve RS-485 fiziksel katman hesaplayıcısı ekranının hesap modeli
// (REV2 §8).
//
// Saf: React ve DOM bilmez, gösterim biçimi üretmez. Form nesnesini alır,
// SI'ye çevirir, lib/busPhysical.js motorunu çağırır, sonucu ve hata kodunu
// döner. Kullanıcıya gösterilecek metin text.js içindedir.
//
// Protokol frame çözümlemesi yok — motorun kendisi gibi ekran da yalnız
// fiziksel katmanı (terminasyon, bias, gecikme, stub, yük) değerlendirir.
// CAN ve RS-485 AYRI motor fonksiyonlarıdır (canPhysicalLayer / rs485
// PhysicalLayer); ekran ikisi arasında bir mod anahtarıyla geçer.

import { fieldsFor, readForm, when } from '../../../lib/fields'
import { RESISTANCE, VOLTAGE, LENGTH, TIME, CAPACITANCE } from '../../../lib/units'
import {
  canPhysicalLayer, rs485PhysicalLayer,
  sampleTime, maxBusLength, idleDifferentialVoltage,
  BUS_ERR_INVALID, BUS_ERR_FIXED_DELAY, BUS_ERR_DELAY_BUDGET, BUS_ERR_BIAS_UNREACHABLE,
} from '../../../lib/busPhysical'
import { logspace } from '../../../lib/sweep'

export { BUS_ERR_INVALID, BUS_ERR_FIXED_DELAY, BUS_ERR_DELAY_BUDGET, BUS_ERR_BIAS_UNREACHABLE }

export const REASON_INCOMPLETE = 'incomplete'

export const MODE_CAN = 'can'
export const MODE_RS485 = 'rs485'
export const MODES = [MODE_CAN, MODE_RS485]

// Ekrana özgü tablolar — ReturnPathStitchingVia'daki PLAIN/COUNT ile aynı
// desen, motor bu birimleri bilmez.
const BITRATE = { bps: 1, kbps: 1e3, Mbps: 1e6 }
const DELAY_PER_M = { 'ns/m': 1e-9, 'ps/m': 1e-12, 'µs/m': 1e-6 }
const PLAIN = { '': 1 }

export const INITIAL_FORM = {
  mode: MODE_CAN,

  term1: '120', term1u: 'Ω',
  term2: '120', term2u: 'Ω',

  // CAN varsayılanları REV2 kararlar §3.4 örneğiyle (busPhysical.test.js
  // referansı) birebir örtüşür: t_fixed = 130 ns, gidiş-dönüş 400 ns,
  // marj 345 ns, maksimum uzunluk 74.5 m.
  bitrate: '1', bitrateu: 'Mbps',
  samplePoint: '0.875',
  busLength: '40', busLengthu: 'm',
  delayPerMeter: '5', delayPerMeteru: 'ns/m',
  controllerDelay: '10', controllerDelayu: 'ns',
  txDelay: '60', txDelayu: 'ns',
  rxDelay: '60', rxDelayu: 'ns',
  isolatorTxDelay: '', isolatorTxDelayu: 'ns',
  isolatorRxDelay: '', isolatorRxDelayu: 'ns',

  hasSplit: false,
  r1: '60', r1u: 'Ω',
  r2: '60', r2u: 'Ω',
  cSplit: '', cSplitu: 'nF',

  hasStub: false,
  stubLength: '', stubLengthu: 'm',
  riseTime: '', riseTimeu: 'ns',

  // RS-485 varsayılanları busPhysical.test.js'teki bias referansıyla
  // örtüşür: V_CC = 5 V, R_AB = 60 Ω → 470 Ω standart direnç, 0.3 V idle.
  vcc: '5', vccu: 'V',
  receiverEq: '', receiverEqu: 'kΩ',
  rPullUp: '', rPullUpu: 'Ω',
  rPullDown: '', rPullDownu: 'Ω',
  receiverThreshold: '0.2', receiverThresholdu: 'V',
  unitLoad: '',

  // RS-485'in kendi bus uzunluğu/gecikme/bit hızı alanları — CAN'ın busLength/
  // delayPerMeter/bitrate alanlarıyla PAYLAŞILMAZ (REV2 §8.9 RS-485 girdileri CAN'ın
  // §8.2 girdilerinden ayrı sayılır; brif-rev2-ilerleme.md "Araç 2–6" notu yalnız
  // terminasyonun ortak olduğunu söyler). Opsiyonel: yalnız doldurulursa kablo
  // gecikmesi / bit süresi sonuçları hesaplanır.
  rs485Bitrate: '', rs485Bitrateu: 'Mbps',
  rs485BusLength: '', rs485BusLengthu: 'm',
  rs485DelayPerMeter: '', rs485DelayPerMeteru: 'ns/m',

  hasTarget: false,
  targetIdle: '', targetIdleu: 'V',
}

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// `lib/` bunları bilmez. Etiket verilmezse alan anahtarı gösterilir.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key
  const isCan = f.mode === MODE_CAN

  return fieldsFor([
    [
      { key: 'term1', label: L('term1'), unitKey: 'term1u', table: RESISTANCE, min: 0 },
      { key: 'term2', label: L('term2'), unitKey: 'term2u', table: RESISTANCE, min: 0 },
    ],
    when(isCan, [
      { key: 'bitrate', label: L('bitrate'), unitKey: 'bitrateu', table: BITRATE, min: 0 },
      { key: 'samplePoint', label: L('samplePoint'), unit: '', table: PLAIN, min: 0, max: 1 },
      { key: 'busLength', label: L('busLength'), unitKey: 'busLengthu', table: LENGTH, min: 0, allowZero: true },
      { key: 'delayPerMeter', label: L('delayPerMeter'), unitKey: 'delayPerMeteru', table: DELAY_PER_M, min: 0 },
      {
        key: 'controllerDelay', label: L('controllerDelay'), unitKey: 'controllerDelayu', table: TIME,
        min: 0, optional: true, allowZero: true,
      },
      { key: 'txDelay', label: L('txDelay'), unitKey: 'txDelayu', table: TIME, min: 0, optional: true, allowZero: true },
      { key: 'rxDelay', label: L('rxDelay'), unitKey: 'rxDelayu', table: TIME, min: 0, optional: true, allowZero: true },
      {
        key: 'isolatorTxDelay', label: L('isolatorTxDelay'), unitKey: 'isolatorTxDelayu', table: TIME,
        min: 0, optional: true, allowZero: true,
      },
      {
        key: 'isolatorRxDelay', label: L('isolatorRxDelay'), unitKey: 'isolatorRxDelayu', table: TIME,
        min: 0, optional: true, allowZero: true,
      },
    ]),
    when(isCan && f.hasSplit, [
      { key: 'r1', label: L('r1'), unitKey: 'r1u', table: RESISTANCE, min: 0 },
      { key: 'r2', label: L('r2'), unitKey: 'r2u', table: RESISTANCE, min: 0 },
      { key: 'cSplit', label: L('cSplit'), unitKey: 'cSplitu', table: CAPACITANCE, min: 0, optional: true },
    ]),
    when(isCan && f.hasStub, [
      { key: 'stubLength', label: L('stubLength'), unitKey: 'stubLengthu', table: LENGTH, min: 0, allowZero: true },
      { key: 'riseTime', label: L('riseTime'), unitKey: 'riseTimeu', table: TIME, min: 0, optional: true },
    ]),
    when(!isCan, [
      { key: 'vcc', label: L('vcc'), unitKey: 'vccu', table: VOLTAGE, min: 0 },
      { key: 'receiverEq', label: L('receiverEq'), unitKey: 'receiverEqu', table: RESISTANCE, min: 0, optional: true },
      { key: 'rPullUp', label: L('rPullUp'), unitKey: 'rPullUpu', table: RESISTANCE, min: 0, optional: true },
      { key: 'rPullDown', label: L('rPullDown'), unitKey: 'rPullDownu', table: RESISTANCE, min: 0, optional: true },
      {
        key: 'receiverThreshold', label: L('receiverThreshold'), unitKey: 'receiverThresholdu', table: VOLTAGE,
        min: 0, optional: true, allowZero: true,
      },
      { key: 'unitLoad', label: L('unitLoad'), min: 0, optional: true },
      // CAN'ın bitrate/busLength/delayPerMeter alanlarıyla PAYLAŞILMAZ — bkz. INITIAL_FORM notu.
      {
        key: 'rs485Bitrate', label: L('rs485Bitrate'), unitKey: 'rs485Bitrateu', table: BITRATE,
        min: 0, optional: true,
      },
      {
        key: 'rs485BusLength', label: L('rs485BusLength'), unitKey: 'rs485BusLengthu', table: LENGTH,
        min: 0, optional: true, allowZero: true,
      },
      {
        key: 'rs485DelayPerMeter', label: L('rs485DelayPerMeter'), unitKey: 'rs485DelayPerMeteru', table: DELAY_PER_M,
        min: 0, optional: true,
      },
    ]),
    when(!isCan && f.hasTarget, [
      { key: 'targetIdle', label: L('targetIdle'), unitKey: 'targetIdleu', table: VOLTAGE, min: 0 },
    ]),
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values

  if (f.mode === MODE_CAN) {
    const plan = canPhysicalLayer({
      bitrate: v.bitrate,
      samplePoint: v.samplePoint,
      busLength: v.busLength,
      delayPerMeter: v.delayPerMeter,
      controllerDelay: v.controllerDelay ?? 0,
      txDelay: v.txDelay ?? 0,
      rxDelay: v.rxDelay ?? 0,
      isolatorTxDelay: v.isolatorTxDelay ?? 0,
      isolatorRxDelay: v.isolatorRxDelay ?? 0,
      terminations: [v.term1, v.term2],
      split: f.hasSplit ? { r1: v.r1, r2: v.r2, cSplit: v.cSplit ?? null } : null,
      stubLength: f.hasStub ? (v.stubLength ?? null) : null,
      riseTime: f.hasStub ? (v.riseTime ?? null) : null,
    })
    if (plan.error) return { ok: false, reason: plan.error }

    return {
      ok: true,
      mode: MODE_CAN,
      // Motor bu ham girdileri geri döndürmez; sweep işaretçisi ve rapor
      // için burada taşınır.
      bitrateInput: v.bitrate,
      samplePointInput: v.samplePoint,
      delayPerMeterInput: v.delayPerMeter,
      ...plan,
    }
  }

  const plan = rs485PhysicalLayer({
    vcc: v.vcc,
    terminations: [v.term1, v.term2],
    receiverEq: v.receiverEq ?? null,
    rPullUp: v.rPullUp ?? null,
    rPullDown: v.rPullDown ?? null,
    targetIdle: f.hasTarget ? (v.targetIdle ?? null) : null,
    series: 'E24',
    receiverThreshold: v.receiverThreshold ?? 0.2,
    unitLoad: v.unitLoad ?? null,
    // RS-485'in kendi alanlarından okunur (CAN'ın v.busLength/v.delayPerMeter/v.bitrate
    // DEĞİL) — aksi hâlde CAN modunda girilmiş/varsayılan değerler ekranda hiç
    // görünmeden RS-485 hesabına sızar.
    busLength: v.rs485BusLength ?? null,
    delayPerMeter: v.rs485DelayPerMeter ?? null,
    bitrate: v.rs485Bitrate ?? null,
  })
  if (plan.error) return { ok: false, reason: plan.error }

  return {
    ok: true,
    mode: MODE_RS485,
    vccInput: v.vcc,
    rPullUpInput: v.rPullUp ?? null,
    rPullDownInput: v.rPullDown ?? null,
    ...plan,
  }
}

// CAN: maksimum bus uzunluğu bit hızıyla ters ilişkilidir (yüksek hız → daha
// az sample time bütçesi). Diğer gecikmeler sabit tutulup yalnız bitrate
// taranır.
function canLengthSweep(r) {
  const { values } = logspace(r.bitrateInput / 20, r.bitrateInput * 20, 100)
  // t_fixed sabit kalıp bitrate arttıkça sample time bütçesi daralır ve bir
  // noktadan sonra bütçe negatif olur — o noktadan sonrası grafiğe hiç
  // gönderilmez (uydurma/negatif uzunluk çizilmez).
  return (values ?? [])
    .map((bitrate) => {
      const ts = sampleTime({ bitrate, samplePoint: r.samplePointInput })
      const lm = maxBusLength({ tSample: ts, tFixed: r.fixedDelay, delayPerMeter: r.delayPerMeterInput })
      return { x: bitrate, y: lm.error ? null : lm.length }
    })
    .filter((p) => p.y != null)
}

// RS-485: simetrik bias direnci arttıkça idle diferansiyel gerilim düşer
// (aynı akım daha büyük bir seri dirence bölünür).
function rs485BiasSweep(r) {
  const { values } = logspace(20, 20000, 100)
  return (values ?? []).map((rr) => ({
    x: rr,
    y: idleDifferentialVoltage({ vcc: r.vccInput, rPullUp: rr, rAB: r.differentialLoad, rPullDown: rr }),
  }))
}

// Tek grafik, moda göre — iki motorun sonuç şekli o kadar farklı ki ortak bir
// "taranan parametre" seçici anlamlı olmazdı; her modun kendi tek grafiği var.
export function buildSweep(r) {
  if (!r.ok) return null

  if (r.mode === MODE_CAN) {
    const rows = canLengthSweep(r)
    return {
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: r.maxLength != null ? { x: r.bitrateInput, y: r.maxLength } : null,
    }
  }

  const rows = rs485BiasSweep(r)
  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    marker: r.bias ? { x: r.rPullUpInput, y: r.bias.idleVoltage } : null,
  }
}
