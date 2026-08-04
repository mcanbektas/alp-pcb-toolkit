// Buck dönüştürücü PCB ön tasarım aracı ekranının hesap modeli (REV2 §13).
//
// Saf: React ve DOM bilmez, gösterim biçimi üretmez. Form nesnesini alır,
// SI'ye çevirir, lib/buck.js motorunu çağırır, sonucu ve hata kodunu döner.
// Kullanıcıya gösterilecek metin text.js içindedir.
//
// Bu araçta da (Adım 2'nin diğer beş kardeş motorunda olduğu gibi) findings
// yok — buck.js dosya başı notu §13.14 Yerleşim değerlendirmesini bilinçli
// olarak ekran katmanına bırakıyor (bağlama duyarlı metin üretimi bir
// "findings" işlevidir, motor dosyalarına eklenmez). Yerleşim alanları bu
// yüzden motora hiç gönderilmez, yalnızca text.js'in commentary(r)'sinde
// kullanılır.
//
// REV2 §13.2 üç ayrı input voltage (min/nominal/maks) ve iki ayrı output
// current (nominal/maks) listeler; motor tek `vIn`/`iOut` alır. Nominal
// değerler tek-nokta compute()'a gider; min/maks yalnızca §13.15'in Vin-tabanlı
// iki grafiğinin ve toplam kayıp grafiğinin tarama sınırlarını belirler —
// motora hiç geçmezler (kararlar §7 "yeni bağımsız klasör standardı icat
// edilmez" ilkesiyle aynı gerekçeyle, burada da motora uydurma bir ikinci
// çağrı eklenmez, yalnız ekranın kendi tarama aralığı kurulur).
//
// REV2 §13.2 "MOSFET R_DS(on)", "Diode forward voltage" ve "Thermal
// resistance"i TEKİL yazar ama motor bunları high-side/low-side ayrı ayrı
// alır (rdsOnHs/rdsOnLs, vF/vFBody, thetaJaHs/thetaJaLs/thetaJaInductor) —
// çünkü asenkron/senkron dallanması ve indüktör ısınması fiziksel olarak
// farklı büyüklüklerdir. Ekran bu ikisini `topology` seçimiyle ayırır:
// asenkron modda diode alanları (vF, qrr), senkron modda LS MOSFET + dead-time
// alanları (rdsOnLs, vFBody, tDead) gösterilir — motorun kendi karşılıklı
// dışlayıcı dallanmasıyla birebir.
//
// I_sat / I_RMS rating / I_CIN,RMS rating / T_J,maks: motor bunları hiç almaz
// (buck.js dosya başı notu: "bunlar seçilen bileşenin yeterliliğini gösteren
// birer eşik kontrolüdür, elektriksel hesabı etkilemez"). Ekran bunları saf
// karşılaştırma girdisi olarak taşır, gerçek karşılaştırma text.js'in
// commentary(r)'sinde yapılır (VoltageDivider'daki Prated deseniyle aynı).

import { fieldsFor, readForm, when } from '../../../lib/fields'
import {
  VOLTAGE, CURRENT, RESISTANCE, CAPACITANCE, INDUCTANCE, FREQUENCY, TIME,
  CHARGE, THERMAL_R, AREA, LENGTH,
} from '../../../lib/units'
import {
  buckConverterPlan, dutyCycleIdeal, dutyCycleApprox,
  inductorRippleCurrent, inductorPeakCurrent,
  BUCK_ERR_INVALID, BUCK_ERR_STEP_UP, BUCK_MODE_CCM, BUCK_MODE_DCM,
} from '../../../lib/buck'
import { logspace } from '../../../lib/sweep'

export { BUCK_ERR_INVALID, BUCK_ERR_STEP_UP, BUCK_MODE_CCM, BUCK_MODE_DCM }

export const REASON_INCOMPLETE = 'incomplete'
// Motorun kendi hata kodu dışında, yalnızca bu ekrana özgü bir ön denetim:
// ripple'ı belirleyen iki yoldan (İndüktans, ripple yüzdesi) hiçbiri
// verilmemiş — ReturnPathStitchingVia'daki via sayısı / MosfetGateDriver'daki
// MOSFET sayısı tamsayı denetimiyle aynı yerel-kod deseni.
export const REASON_RIPPLE_METHOD = 'ripple-method'

export const TOPOLOGY_ASYNC = 'async'
export const TOPOLOGY_SYNC = 'sync'

export const GND_JOIN_STAR = 'star'
export const GND_JOIN_PLANE = 'plane'
export const GND_JOIN_SPLIT = 'split'

export const SWEEP_VIN_DUTY = 'vinDuty'
export const SWEEP_VIN_RIPPLE = 'vinRipple'
export const SWEEP_L_PEAK = 'lPeak'
export const SWEEP_FSW_LOSS = 'fswLoss'
export const SWEEP_IOUT_LOSS = 'ioutLoss'
export const SWEEP_PARAMS = [
  SWEEP_VIN_DUTY, SWEEP_VIN_RIPPLE, SWEEP_L_PEAK, SWEEP_FSW_LOSS, SWEEP_IOUT_LOSS,
]

// Birimsiz yüzde ve adet alanları için ekrana özgü tablolar — VoltageDivider'daki
// PCT ve ReturnPathStitchingVia'daki COUNT ile aynı desen, her ekran kendi
// kopyasını tutar (kararlar §7: ortak dosyaya yeni tablo eklenmez).
const PCT = { '%': 1 }
const COUNT = { adet: 1 }
// tAmbient/tjMax için birim dönüşümü yok (tek seçenek); THERMAL_R zaten
// °C/W ve K/W'ı taşıyor ama düz sıcaklık için ayrı, tek satırlık bir tablo
// gerekiyor — units.js'e yeni ortak tablo eklenmedi (kararlar §7).
const TEMP = { '°C': 1 }

export const INITIAL_FORM = {
  // Girdi/çıkış gerilim-akım-frekans üçlüsü. Varsayılanlar REV2 §13.16
  // referans testiyle birebir örtüşür: V_in=24 V, V_out=12 V, I_out=5 A,
  // f_sw=200 kHz. vInMin/vInMax REV2'de sayısal bir referans taşımadığı için
  // nominalle aynı bırakıldı (uydurma bir marj girilmedi) — kullanıcı kendi
  // tasarım aralığını girer; §13.15'in iki Vin-grafiği o zaman düz bir
  // noktadan gerçek bir aralığa döner.
  vInMin: '24', vInMinu: 'V',
  vInNom: '24', vInNomu: 'V',
  vInMax: '24', vInMaxu: 'V',
  vOut: '12', vOutu: 'V',
  iOutNom: '5', iOutNomu: 'A',
  // iOutMax yalnız §13.15'in "output current'a karşı toplam kayıp" grafiğinin
  // üst sınırını belirler; REV2 ayrı bir referans değeri vermediği için
  // nominalle aynı bırakıldı.
  iOutMax: '5', iOutMaxu: 'A',
  fsw: '200', fswu: 'kHz',

  etaPct: '', etaPctu: '%',

  // Ripple'ı belirleyen iki yoldan biri zorunlu (motor önceliği: ripple
  // yüzdesi > İndüktans). Varsayılan İndüktans = 20 µH — REV2 §13.16
  // referans testindeki L değeriyle birebir, ΔI_L = 1.5 A'yı yeniden üretir.
  lVal: '20', lValu: 'µH',
  ripplePct: '', ripplePctu: '%',

  dcr: '', dcru: 'Ω',
  iSat: '', iSatu: 'A',
  iRmsRating: '', iRmsRatingu: 'A',

  cOut: '', cOutu: 'µF',
  esrCOut: '', esrCOutu: 'Ω',
  // 50 mV — REV2 §13.16'nın "50 mV kapasitif ripple için C_out,min≈18.75 µF"
  // örneğiyle birebir.
  deltaVTarget: '50', deltaVTargetu: 'mV',
  iCinRmsRating: '', iCinRmsRatingu: 'A',

  topology: TOPOLOGY_ASYNC,
  rdsOnHs: '', rdsOnHsu: 'Ω',
  rdsOnLs: '', rdsOnLsu: 'Ω',
  vF: '', vFu: 'V',
  qrr: '', qrru: 'nC',
  vFBody: '', vFBodyu: 'V',
  tDead: '', tDeadu: 'ns',

  tr: '', tru: 'ns',
  tf: '', tfu: 'ns',
  vg: '', vgu: 'V',
  qgHs: '', qgHsu: 'nC',
  qgLs: '', qgLsu: 'nC',

  hasThermal: false,
  thetaJaHs: '', thetaJaHsu: '°C/W',
  thetaJaLs: '', thetaJaLsu: '°C/W',
  thetaJaInductor: '', thetaJaInductoru: '°C/W',
  tAmbient: '25', tAmbientu: '°C',
  tjMax: '', tjMaxu: '°C',

  // §13.14 Yerleşim değerlendirmesi — motora hiç gönderilmez, yalnızca
  // text.js'in commentary(r)'sinde bağlama duyarlı öneri üretmek için
  // kullanılır (bkz. dosya başı notu).
  hotLoopPerimeter: '', hotLoopPerimeteru: 'mm',
  switchNodeArea: '', switchNodeAreau: 'mm²',
  capToFetDistance: '', capToFetDistanceu: 'mm',
  gateLoopLength: '', gateLoopLengthu: 'mm',
  feedbackDistance: '', feedbackDistanceu: 'mm',
  powerViaCount: '',
  gndJoin: GND_JOIN_STAR,
}

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// `lib/` bunları bilmez. Etiket verilmezse alan anahtarı gösterilir.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'vInMin', label: L('vInMin'), unitKey: 'vInMinu', table: VOLTAGE, min: 0 },
      { key: 'vInNom', label: L('vInNom'), unitKey: 'vInNomu', table: VOLTAGE, min: 0 },
      { key: 'vInMax', label: L('vInMax'), unitKey: 'vInMaxu', table: VOLTAGE, min: 0 },
      { key: 'vOut', label: L('vOut'), unitKey: 'vOutu', table: VOLTAGE, min: 0 },
      { key: 'iOutNom', label: L('iOutNom'), unitKey: 'iOutNomu', table: CURRENT, min: 0 },
      { key: 'iOutMax', label: L('iOutMax'), unitKey: 'iOutMaxu', table: CURRENT, min: 0 },
      { key: 'fsw', label: L('fsw'), unitKey: 'fswu', table: FREQUENCY, min: 0 },
      { key: 'etaPct', label: L('etaPct'), unitKey: 'etaPctu', table: PCT, min: 0, max: 100, optional: true },
    ],
    [
      { key: 'lVal', label: L('lVal'), unitKey: 'lValu', table: INDUCTANCE, min: 0, optional: true },
      { key: 'ripplePct', label: L('ripplePct'), unitKey: 'ripplePctu', table: PCT, min: 0, optional: true },
      { key: 'dcr', label: L('dcr'), unitKey: 'dcru', table: RESISTANCE, min: 0, optional: true, allowZero: true },
      { key: 'iSat', label: L('iSat'), unitKey: 'iSatu', table: CURRENT, min: 0, optional: true },
      { key: 'iRmsRating', label: L('iRmsRating'), unitKey: 'iRmsRatingu', table: CURRENT, min: 0, optional: true },
    ],
    [
      { key: 'cOut', label: L('cOut'), unitKey: 'cOutu', table: CAPACITANCE, min: 0, optional: true },
      { key: 'esrCOut', label: L('esrCOut'), unitKey: 'esrCOutu', table: RESISTANCE, min: 0, optional: true, allowZero: true },
      { key: 'deltaVTarget', label: L('deltaVTarget'), unitKey: 'deltaVTargetu', table: VOLTAGE, min: 0, optional: true },
      { key: 'iCinRmsRating', label: L('iCinRmsRating'), unitKey: 'iCinRmsRatingu', table: CURRENT, min: 0, optional: true },
    ],
    [
      { key: 'rdsOnHs', label: L('rdsOnHs'), unitKey: 'rdsOnHsu', table: RESISTANCE, min: 0, optional: true },
    ],
    when(f.topology === TOPOLOGY_ASYNC, [
      { key: 'vF', label: L('vF'), unitKey: 'vFu', table: VOLTAGE, min: 0, optional: true },
      { key: 'qrr', label: L('qrr'), unitKey: 'qrru', table: CHARGE, min: 0, optional: true, allowZero: true },
    ]),
    when(f.topology === TOPOLOGY_SYNC, [
      { key: 'rdsOnLs', label: L('rdsOnLs'), unitKey: 'rdsOnLsu', table: RESISTANCE, min: 0, optional: true },
      { key: 'vFBody', label: L('vFBody'), unitKey: 'vFBodyu', table: VOLTAGE, min: 0, optional: true },
      { key: 'tDead', label: L('tDead'), unitKey: 'tDeadu', table: TIME, min: 0, optional: true, allowZero: true },
    ]),
    [
      { key: 'tr', label: L('tr'), unitKey: 'tru', table: TIME, min: 0, optional: true, allowZero: true },
      { key: 'tf', label: L('tf'), unitKey: 'tfu', table: TIME, min: 0, optional: true, allowZero: true },
      { key: 'vg', label: L('vg'), unitKey: 'vgu', table: VOLTAGE, min: 0, optional: true },
      { key: 'qgHs', label: L('qgHs'), unitKey: 'qgHsu', table: CHARGE, min: 0, optional: true },
    ],
    when(f.topology === TOPOLOGY_SYNC, [
      { key: 'qgLs', label: L('qgLs'), unitKey: 'qgLsu', table: CHARGE, min: 0, optional: true },
    ]),
    when(f.hasThermal, [
      { key: 'thetaJaHs', label: L('thetaJaHs'), unitKey: 'thetaJaHsu', table: THERMAL_R, min: 0, optional: true },
      { key: 'thetaJaInductor', label: L('thetaJaInductor'), unitKey: 'thetaJaInductoru', table: THERMAL_R, min: 0, optional: true },
      { key: 'tAmbient', label: L('tAmbient'), unitKey: 'tAmbientu', table: TEMP, optional: true, allowZero: true },
      { key: 'tjMax', label: L('tjMax'), unitKey: 'tjMaxu', table: TEMP, optional: true },
    ]),
    when(f.hasThermal && f.topology === TOPOLOGY_SYNC, [
      { key: 'thetaJaLs', label: L('thetaJaLs'), unitKey: 'thetaJaLsu', table: THERMAL_R, min: 0, optional: true },
    ]),
    [
      { key: 'hotLoopPerimeter', label: L('hotLoopPerimeter'), unitKey: 'hotLoopPerimeteru', table: LENGTH, min: 0, optional: true },
      { key: 'switchNodeArea', label: L('switchNodeArea'), unitKey: 'switchNodeAreau', table: AREA, min: 0, optional: true },
      { key: 'capToFetDistance', label: L('capToFetDistance'), unitKey: 'capToFetDistanceu', table: LENGTH, min: 0, optional: true },
      { key: 'gateLoopLength', label: L('gateLoopLength'), unitKey: 'gateLoopLengthu', table: LENGTH, min: 0, optional: true },
      { key: 'feedbackDistance', label: L('feedbackDistance'), unitKey: 'feedbackDistanceu', table: LENGTH, min: 0, optional: true },
      { key: 'powerViaCount', label: L('powerViaCount'), unit: 'adet', table: COUNT, min: 0, optional: true },
    ],
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values

  // Ripple'ı belirleyen iki yoldan (İndüktans, ripple yüzdesi) hiçbiri
  // verilmemişse motoru hiç çağırmadan bildir — buckConverterPlan bu durumda
  // zaten BUCK_ERR_INVALID döner ama bu, "temel girdi eksik/geçersiz" ile aynı
  // koddur; ekran daha isabetli bir neden göstermek için burada ayırır.
  if (v.lVal == null && v.ripplePct == null) {
    return { ok: false, reason: REASON_RIPPLE_METHOD }
  }

  const isSync = f.topology === TOPOLOGY_SYNC
  const etaFraction = v.etaPct != null ? v.etaPct / 100 : null
  const rippleTargetRatio = v.ripplePct != null ? v.ripplePct / 100 : null

  const engineArgs = {
    vIn: v.vInNom, vOut: v.vOut, iOut: v.iOutNom, fsw: v.fsw,
    eta: etaFraction,
    l: v.lVal, deltaIL: null, rippleTargetRatio,
    dcr: v.dcr ?? 0,
    cOut: v.cOut, esrCOut: v.esrCOut ?? 0,
    deltaVTarget: v.deltaVTarget,
    rdsOnHs: v.rdsOnHs,
    rdsOnLs: isSync ? v.rdsOnLs : null,
    vg: v.vg, qgHs: v.qgHs, qgLs: isSync ? v.qgLs : null,
    tr: v.tr, tf: v.tf,
    vF: !isSync ? v.vF : null, qrr: !isSync ? v.qrr : null,
    vFBody: isSync ? v.vFBody : null, tDead: isSync ? v.tDead : null,
    thetaJaHs: f.hasThermal ? v.thetaJaHs : null,
    thetaJaLs: f.hasThermal && isSync ? v.thetaJaLs : null,
    thetaJaInductor: f.hasThermal ? v.thetaJaInductor : null,
    tAmbient: f.hasThermal ? v.tAmbient : null,
  }

  const plan = buckConverterPlan(engineArgs)
  if (plan.error) return { ok: false, reason: plan.error }

  return {
    ok: true,
    topology: f.topology,
    isSync,
    vInMin: v.vInMin,
    vInNom: v.vInNom,
    vInMax: v.vInMax,
    vOut: v.vOut,
    iOutNom: v.iOutNom,
    iOutMax: v.iOutMax,
    fsw: v.fsw,
    etaFraction,
    // Motor bu ham girdileri geri döndürmez (yalnız türetilmiş sonucu döner);
    // sweep'in fsw/iOut'u tek başına değiştirip motoru yeniden çağırabilmesi
    // için orijinal argümanlar burada taşınır (MosfetGateDriver'daki
    // rDriverSourceInput deseniyle aynı gerekçe).
    engineArgs,
    // Motora hiç gönderilmeyen, yalnız ekranda karşılaştırma/öneri üretmek
    // için taşınan ham değerler (bkz. dosya başı notu).
    iSat: v.iSat, iRmsRating: v.iRmsRating, iCinRmsRating: v.iCinRmsRating,
    tjMax: f.hasThermal ? v.tjMax : null,
    hasThermal: f.hasThermal,
    layout: {
      hotLoopPerimeter: v.hotLoopPerimeter,
      switchNodeArea: v.switchNodeArea,
      capToFetDistance: v.capToFetDistance,
      gateLoopLength: v.gateLoopLength,
      feedbackDistance: v.feedbackDistance,
      powerViaCount: v.powerViaCount,
      gndJoin: f.gndJoin,
    },
    ...plan,
  }
}

// Basit doğrusal aralık — frekans/endüktans gibi ondalık gerektiren
// büyüklükler için lib/sweep.js'teki logspace kullanılır; gerilim/akım gibi
// dar, doğrusal aralıklarda taranan büyüklükler için burada yerel bir
// yardımcı yeterli (VoltageDivider'daki yerel sweepRange deseniyle aynı
// gerekçe — ortak dosyaya yeni bir fonksiyon eklenmedi, kararlar §7).
function linspace(min, max, n) {
  if (!(max > min) || n < 2) return [min]
  const step = (max - min) / (n - 1)
  return Array.from({ length: n }, (_, i) => min + step * i)
}

function finite(rows) {
  return rows.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
}

function vinDutySweep(r) {
  const lo = Math.min(r.vInMin, r.vInNom)
  const hi = Math.max(r.vInMax, r.vInNom)
  const rows = linspace(lo, hi, 100).map((vIn) => ({
    x: vIn,
    y: dutyCycleIdeal({ vIn, vOut: r.vOut }),
    yApprox: r.etaFraction != null ? dutyCycleApprox({ vIn, vOut: r.vOut, eta: r.etaFraction }) : null,
  }))
  return finite(rows)
}

function vinRippleSweep(r) {
  const lo = Math.min(r.vInMin, r.vInNom)
  const hi = Math.max(r.vInMax, r.vInNom)
  const l = r.inductor.chosen ?? r.inductor.required
  const rows = linspace(lo, hi, 100).map((vIn) => {
    const d = dutyCycleIdeal({ vIn, vOut: r.vOut })
    return { x: vIn, y: inductorRippleCurrent({ vIn, vOut: r.vOut, d, l, fsw: r.fsw }) }
  })
  return finite(rows)
}

function lPeakSweep(r) {
  const l0 = r.inductor.chosen ?? r.inductor.required
  const { values } = logspace(l0 / 10, l0 * 10, 120)
  const rows = (values ?? []).map((l) => {
    const deltaIL = inductorRippleCurrent({ vIn: r.vInNom, vOut: r.vOut, d: r.duty.ideal, l, fsw: r.fsw })
    return { x: l, y: inductorPeakCurrent({ iOut: r.iOutNom, deltaIL }) }
  })
  return finite(rows)
}

// Switching kaybı P_sw = ½·V_in·I_out·(t_r+t_f)·f_sw yalnızca bu dört
// büyüklüğe bağlıdır — ama motor bu formülü ayrı bir saf fonksiyon olarak
// dışa aktarmıyor (gateDriver.js'ten alınan switchingLoss yalnızca
// buckConverterPlan içinde kullanılıyor). Bu yüzden tarama, buck.js'in
// kendi compute() çıktısını her noktada yeniden okuyarak kurulur — ekran
// gateDriver.js'e doğrudan dokunmaz, yalnız buck.js'in compute sonucunu
// tüketir.
function fswLossSweep(r) {
  if (!r.switching) return null
  const { values } = logspace(r.fsw / 10, r.fsw * 10, 100)
  const rows = (values ?? []).map((fsw) => {
    const plan = buckConverterPlan({ ...r.engineArgs, fsw })
    return { x: fsw, y: plan.ok ? plan.switching?.loss ?? NaN : NaN }
  })
  return finite(rows)
}

function ioutLossSweep(r) {
  const hi = Math.max(r.iOutMax, r.iOutNom)
  const lo = hi / 20
  const rows = linspace(lo, hi, 100).map((iOut) => {
    const plan = buckConverterPlan({ ...r.engineArgs, iOut })
    return { x: iOut, y: plan.ok ? plan.totalLossApprox : NaN }
  })
  return finite(rows)
}

export function buildSweep(r, param) {
  if (!r.ok) return null

  if (param === SWEEP_VIN_DUTY) {
    const rows = vinDutySweep(r)
    if (rows.length === 0) return null
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      pointsApprox: r.etaFraction != null ? rows.map((p) => [p.x, p.yApprox]) : null,
      marker: { x: r.vInNom, y: r.duty.ideal },
    }
  }

  if (param === SWEEP_VIN_RIPPLE) {
    const rows = vinRippleSweep(r)
    if (rows.length === 0) return null
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.vInNom, y: r.inductor.deltaIL },
    }
  }

  if (param === SWEEP_L_PEAK) {
    const rows = lPeakSweep(r)
    if (rows.length === 0) return null
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.inductor.chosen ?? r.inductor.required, y: r.inductor.peak },
    }
  }

  if (param === SWEEP_FSW_LOSS) {
    const rows = fswLossSweep(r)
    if (!rows || rows.length === 0) return null
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.fsw, y: r.switching.loss },
    }
  }

  const rows = ioutLossSweep(r)
  if (rows.length === 0) return null
  return {
    param: SWEEP_IOUT_LOSS,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    marker: { x: r.iOutNom, y: r.totalLossApprox },
  }
}
