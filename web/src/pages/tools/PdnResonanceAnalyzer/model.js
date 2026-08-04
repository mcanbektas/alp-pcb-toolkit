// PDN Rezonans ve Antirezonans Analizörü ekranının hesap modeli (REV2 §10).
//
// Saf: React ve DOM bilmez, gösterim biçimi üretmez. Form nesnesini alır,
// SI'ye çevirir, lib/pdnResonance.js motorunu çağırır, sonucu ve hata kodunu
// döner. Kullanıcıya gösterilecek metin text.js içindedir.
//
// Motor (lib/pdnResonance.js) DEĞİŞTİRİLMEDİ, yalnızca kullanılır. Ana
// toplayıcı `pdnResonanceAnalysis()` REV2 §10.3/§10.6–§10.9/§10.12'yi
// kapsıyor ama §10.10 (worst-case droop) ve §10.11 (tolerans sweep'i) için
// AYRI, motorun kendi export ettiği fonksiyonlar var — toplayıcı bunları
// çağırmıyor (bkz. lib/pdnResonance.js kaynağı). Bu ekran ikisini de
// opsiyonel/hedeften-geriye alt bloklar olarak ayrıca çağırır: yeterli girdi
// yoksa blok atlanır, girildiyse kendi hatası kendi alanında kalır (r.ok
// true kalmaya devam eder) — Adım 5'in beş kardeş ekranında öğrenilen ve bu
// görevin brifinde tekrarlanması istenen desen.
//
// REV2 §10.2'nin "Sistem" girdi listesi yalnızca "Load step" (ΔI) ve
// "Load step rise time" (t_rise) sayar; ama §10.10'un C_min/ΔV_C
// formülü ayrıca bir Δt (load step SÜRESİ, t_rise'dan farklı bir zaman)
// gerektirir ve motor bunu `deltaT` adıyla ayrı bir parametre olarak alır.
// REV2 metninde bu üçüncü zaman değişkeni için ayrı bir girdi maddesi YOK —
// motor onu okuduğu için form alanı burada eklendi (bkz. görev notları).
// Aynı şekilde ΔV_ESR/ΔV_ESL'nin `ESR_eq`/`L_eq` girdileri de §10.2'nin
// listesinde YOK; REV2 §10.10 metni onları yalnızca formülde kullanır. Bu
// ekran onları capGroups'tan TÜRETMEK yerine (REV2'de böyle bir türetme
// tarifi yok — uydurmamak için) motorun kendi varsayılanıyla (0) aynı,
// bağımsız ve opsiyonel iki alan olarak sorar; boş bırakılırsa motorun
// kendi varsayılanına (0) düşer. Bu, spec'in sessiz kaldığı bir noktada
// yapılan bilinçli bir tercihtir — raporda ayrıca belirtilir.

import {
  fieldsFor, readForm, readRows, when,
} from '../../../lib/fields'
import {
  VOLTAGE, CURRENT, TIME, FREQUENCY, CAPACITANCE, RESISTANCE, INDUCTANCE,
} from '../../../lib/units'
import { abs } from '../../../lib/complex'
import {
  pdnResonanceAnalysis, vrmImpedance, capacitorGroupImpedance, planeImpedance,
  minLowFrequencyCapacitance, worstCaseDroopEstimate, pdnToleranceSweep,
} from '../../../lib/pdnResonance'
import { PROMINENCE_DEFAULT_DB, PROMINENCE_MIN_DB, PROMINENCE_MAX_DB } from '../../../lib/peaks'

export { PROMINENCE_DEFAULT_DB, PROMINENCE_MIN_DB, PROMINENCE_MAX_DB }

// Hesap yapılamadığında dönen yerel kodlar; motorun kendi hata kodları
// (PDNR_ERR_*, sweep.js ve peaks.js'in kodları) `errorCode` olarak AYNEN
// taşınır — burada ikinci bir çeviri katmanı açılmaz, text.js ikisini de
// tek switch'te çözer.
export const REASON_INCOMPLETE = 'incomplete'
export const REASON_POINTS = 'points'
export const REASON_COUNT = 'count'

// Birimsiz alanlar için ekrana özgü tablolar (ReturnPathStitchingVia'daki
// PLAIN/COUNT ile aynı desen — her ekran kendi kopyasını tutar).
const PLAIN = { '': 1 }
const COUNT = { adet: 1 }
const PCT = { '%': 1 }
const DB = { dB: 1 }

export const INITIAL_FORM = {
  // --- Sistem (REV2 §10.2 "Sistem") ---
  Vrail: '1', Vrailu: 'V',
  ripplePct: '5',
  deltaVAllowed: '', deltaVAllowedu: 'mV',
  deltaI: '5', deltaIu: 'A',
  fMin: '1', fMinu: 'kHz',
  fMax: '100', fMaxu: 'MHz',
  points: '400',
  threshold: '3',

  // --- VRM (REV2 §10.2 "VRM"; opsiyonel dal) ---
  hasVrm: false,
  vrmR: '10', vrmRu: 'mΩ',
  vrmL: '50', vrmLu: 'nH',
  vrmC: '', vrmCu: 'µF',

  // --- Plane (REV2 §10.2 "Plane"; opsiyonel dal) ---
  hasPlane: false,
  planeR: '1', planeRu: 'mΩ',
  planeL: '50', planeLu: 'pH',
  planeC: '1', planeCu: 'nF',

  // --- Kondansatör grupları (REV2 §10.2 "Her kondansatör grubu") ---
  // Varsayılan iki grup, motorun kendi test dosyasındaki bulk/MLCC referans
  // örneğiyle birebir aynı (kararlar §1'de bu araca özel satır yok; görev
  // notu bu varsayılanı kullanmaya izin veriyor).
  capGroups: [
    {
      label: 'Bulk',
      Ceffective: '100', Ceffectiveu: 'µF',
      count: '1',
      ESR: '10', ESRu: 'mΩ',
      eslComponent: '5', eslComponentu: 'nH',
      Lmount: '0', Lmountu: 'nH',
      LviaEq: '0', LviaEqu: 'nH',
      Cnominal: '100', Cnominalu: 'µF',
      tolerancePct: '20',
      kDcBias: '1',
      kTemperature: '1',
    },
    {
      label: 'MLCC',
      Ceffective: '100', Ceffectiveu: 'nF',
      count: '1',
      ESR: '20', ESRu: 'mΩ',
      eslComponent: '0.5', eslComponentu: 'nH',
      Lmount: '0', Lmountu: 'nH',
      LviaEq: '0', LviaEqu: 'nH',
      Cnominal: '100', Cnominalu: 'nF',
      tolerancePct: '10',
      kDcBias: '1',
      kTemperature: '1',
    },
  ],

  // --- Tolerans / derating sweep'i (REV2 §10.11; opsiyonel dal) ---
  hasTolerance: false,

  // --- Worst-case droop tahmini (REV2 §10.10; opsiyonel dal) ---
  // ΔI System bölümündeki deltaI'den yeniden kullanılır (tekrar sorulmaz).
  deltaT: '', deltaTu: 'µs',
  tRise: '', tRiseu: 'ns',
  dropC: '', dropCu: 'µF',
  dropESReq: '', dropESRequ: 'mΩ',
  dropLeq: '', dropLequ: 'nH',
}

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// `lib/` bunları bilmez. Etiket verilmezse alan anahtarı gösterilir.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'Vrail', label: L('Vrail'), unitKey: 'Vrailu', table: VOLTAGE, min: 0 },
      { key: 'ripplePct', label: L('ripplePct'), unit: '%', table: PCT, min: 0, optional: true },
      {
        key: 'deltaVAllowed', label: L('deltaVAllowed'), unitKey: 'deltaVAllowedu',
        table: VOLTAGE, min: 0, optional: true,
      },
      { key: 'deltaI', label: L('deltaI'), unitKey: 'deltaIu', table: CURRENT, min: 0 },
      { key: 'fMin', label: L('fMin'), unitKey: 'fMinu', table: FREQUENCY, min: 0 },
      { key: 'fMax', label: L('fMax'), unitKey: 'fMaxu', table: FREQUENCY, min: 0 },
      { key: 'points', label: L('points'), unit: '', table: PLAIN, min: 2 },
      { key: 'threshold', label: L('threshold'), unit: 'dB', table: DB, min: PROMINENCE_MIN_DB, max: PROMINENCE_MAX_DB, optional: true },
    ],

    when(f.hasVrm, [
      { key: 'vrmR', label: L('vrmR'), unitKey: 'vrmRu', table: RESISTANCE, min: 0, allowZero: true },
      { key: 'vrmL', label: L('vrmL'), unitKey: 'vrmLu', table: INDUCTANCE, min: 0, allowZero: true },
      { key: 'vrmC', label: L('vrmC'), unitKey: 'vrmCu', table: CAPACITANCE, min: 0, optional: true },
    ]),

    when(f.hasPlane, [
      { key: 'planeR', label: L('planeR'), unitKey: 'planeRu', table: RESISTANCE, min: 0, allowZero: true },
      { key: 'planeL', label: L('planeL'), unitKey: 'planeLu', table: INDUCTANCE, min: 0, allowZero: true },
      { key: 'planeC', label: L('planeC'), unitKey: 'planeCu', table: CAPACITANCE, min: 0 },
    ]),

    [
      { key: 'deltaT', label: L('deltaT'), unitKey: 'deltaTu', table: TIME, min: 0, optional: true },
      { key: 'tRise', label: L('tRise'), unitKey: 'tRiseu', table: TIME, min: 0, optional: true },
      { key: 'dropC', label: L('dropC'), unitKey: 'dropCu', table: CAPACITANCE, min: 0, optional: true },
      {
        key: 'dropESReq', label: L('dropESReq'), unitKey: 'dropESRequ',
        table: RESISTANCE, min: 0, optional: true, allowZero: true,
      },
      { key: 'dropLeq', label: L('dropLeq'), unitKey: 'dropLequ', table: INDUCTANCE, min: 0, optional: true, allowZero: true },
    ],
  ])
}

// Her kondansatör grubu satırı için alan tanımları — readRows ile kullanılır.
// Tolerans alanları (Cnominal/tolerancePct/kDcBias/kTemperature) `hasTolerance`
// kapalıyken de tanımlıdır (satırlar hep aynı yapıyı taşır) ama `optional`
// olduğu için o durumda boş kalmaları hesabı bloklamaz.
export function capGroupFields(labels = {}) {
  const L = (key) => labels[key] ?? key
  return [
    { key: 'Ceffective', label: L('Ceffective'), unitKey: 'Ceffectiveu', table: CAPACITANCE, min: 0 },
    { key: 'count', label: L('count'), unit: 'adet', table: COUNT, min: 1 },
    { key: 'ESR', label: L('ESR'), unitKey: 'ESRu', table: RESISTANCE, min: 0, optional: true, allowZero: true },
    {
      key: 'eslComponent', label: L('eslComponent'), unitKey: 'eslComponentu',
      table: INDUCTANCE, min: 0, optional: true, allowZero: true,
    },
    { key: 'Lmount', label: L('Lmount'), unitKey: 'Lmountu', table: INDUCTANCE, min: 0, optional: true, allowZero: true },
    { key: 'LviaEq', label: L('LviaEq'), unitKey: 'LviaEqu', table: INDUCTANCE, min: 0, optional: true, allowZero: true },
    { key: 'Cnominal', label: L('Cnominal'), unitKey: 'Cnominalu', table: CAPACITANCE, min: 0, optional: true },
    { key: 'tolerancePct', label: L('tolerancePct'), unit: '%', table: PCT, min: 0, optional: true, allowZero: true },
    { key: 'kDcBias', label: L('kDcBias'), unit: '', table: PLAIN, min: 0, max: 1, optional: true, allowZero: true },
    {
      key: 'kTemperature', label: L('kTemperature'), unit: '', table: PLAIN,
      min: 0, max: 1, optional: true, allowZero: true,
    },
  ]
}

// RowList sütun tanımları — capGroupFields'in DOĞRULAMA alan tanımlarından
// ayrı, yalnız GÖSTERİM/girdi şeklini taşır (Pdn'nin capColumnsA/capColumnsB
// deseniyle aynı gerekçe: tek RowList'e sığmayan geniş satırlar birkaç
// RowList'e bölünür, hepsi aynı `capGroups` dizisine yazar). `cols` çağıran
// ekranın `text.capCols`'udur.
export function capColumnsCore(cols = {}) {
  const L = (key) => cols[key] ?? key
  return [
    { key: 'label', label: L('label'), text: true },
    { key: 'Ceffective', unitKey: 'Ceffectiveu', label: L('Ceffective'), units: ['µF', 'nF', 'pF'] },
    { key: 'count', label: L('count') },
  ]
}

export function capColumnsParasitics(cols = {}) {
  const L = (key) => cols[key] ?? key
  return [
    { key: 'ESR', unitKey: 'ESRu', label: L('ESR'), units: ['mΩ', 'Ω'] },
    { key: 'eslComponent', unitKey: 'eslComponentu', label: L('eslComponent'), units: ['nH', 'pH', 'µH'] },
    { key: 'Lmount', unitKey: 'Lmountu', label: L('Lmount'), units: ['nH', 'pH', 'µH'] },
    { key: 'LviaEq', unitKey: 'LviaEqu', label: L('LviaEq'), units: ['nH', 'pH', 'µH'] },
  ]
}

export function capColumnsTolerance(cols = {}) {
  const L = (key) => cols[key] ?? key
  return [
    { key: 'Cnominal', unitKey: 'Cnominalu', label: L('Cnominal'), units: ['µF', 'nF', 'pF'] },
    { key: 'tolerancePct', label: L('tolerancePct') },
    { key: 'kDcBias', label: L('kDcBias') },
    { key: 'kTemperature', label: L('kTemperature') },
  ]
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  const rows = readRows(f.capGroups, capGroupFields(labels), labels.capGroupRow ?? 'capGroup')

  const ambiguous = [...read.ambiguous, ...rows.ambiguous]
  if (ambiguous.length) return { ok: false, ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }
  if (!rows.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: rows.invalid }

  const v = read.values

  if (!Number.isInteger(v.points)) {
    return { ok: false, reason: REASON_POINTS }
  }

  for (const row of rows.rows) {
    if (!Number.isInteger(row.count)) {
      return { ok: false, reason: REASON_COUNT }
    }
  }

  const vrm = f.hasVrm ? { R: v.vrmR ?? 0, L: v.vrmL ?? 0, C: v.vrmC ?? null } : null
  const plane = f.hasPlane ? { R: v.planeR ?? 0, L: v.planeL ?? 0, C: v.planeC } : null

  const capGroups = rows.rows.map((row, i) => ({
    label: f.capGroups[i]?.label || null,
    Ceffective: row.Ceffective,
    count: row.count,
    ESR: row.ESR ?? 0,
    eslComponent: row.eslComponent ?? 0,
    Lmount: row.Lmount ?? 0,
    LviaEq: row.LviaEq ?? 0,
    Cnominal: row.Cnominal,
    tolerancePct: row.tolerancePct ?? 0,
    kDcBias: row.kDcBias ?? 1,
    kTemperature: row.kTemperature ?? 1,
  }))

  const analysis = pdnResonanceAnalysis({
    fMin: v.fMin,
    fMax: v.fMax,
    points: v.points,
    Vrail: v.Vrail,
    ripplePct: v.ripplePct,
    deltaVAllowed: v.deltaVAllowed,
    deltaI: v.deltaI,
    vrm,
    capGroups,
    plane,
    threshold: v.threshold ?? PROMINENCE_DEFAULT_DB,
  })
  // Motorun kendi hata kodu (PDNR_ERR_*, sweep.js/peaks.js kodları) AYNEN
  // `reason` alanında taşınır — ResultPanel `reason(r.reason)` çağırır, bu
  // yüzden ikinci bir alan adı (örn. errorCode) ResultPanel'e hiç ulaşmaz.
  if (analysis.error) return { ok: false, reason: analysis.error }

  // §10.10 — opsiyonel, hedeften-geriye alt blok. Δt ve C girilmediyse blok
  // hiç denenmez (ReturnPathStitchingVia'daki `hasCapacitor` kapısıyla aynı
  // gerekçe); girildiyse kendi hatası kendi alanında kalır, r.ok true kalır.
  const droop = (v.deltaT != null && v.dropC != null)
    ? worstCaseDroopEstimate({
      deltaI: v.deltaI, deltaT: v.deltaT, tRise: v.tRise, C: v.dropC,
      ESReq: v.dropESReq ?? 0, Leq: v.dropLeq ?? 0,
    })
    : null

  // C_min hedefi ΔV_allowed'ı motorun zaten hesapladığı target.deltaVAllowed'tan
  // alır — ikinci bir ΔV girişi açılmaz.
  const minLowFreqC = v.deltaT != null
    ? minLowFrequencyCapacitance({ deltaI: v.deltaI, deltaT: v.deltaT, deltaV: analysis.target.deltaVAllowed })
    : null

  // §10.11 — opsiyonel tolerans/derating sweep'i. Her grubun Cnominal'i şart;
  // biri eksikse ya da aralık dışıysa blok kendi `.error`'unda kalır.
  const toleranceSweep = f.hasTolerance
    ? pdnToleranceSweep({
      fMin: v.fMin,
      fMax: v.fMax,
      points: v.points,
      vrm,
      capGroups,
      plane,
      threshold: v.threshold ?? PROMINENCE_DEFAULT_DB,
      Ztarget: analysis.target.Ztarget,
    })
    : null

  return {
    ok: true,
    ...analysis,
    hasVrm: f.hasVrm,
    vrm,
    hasPlane: f.hasPlane,
    plane,
    capGroups,
    hasTolerance: f.hasTolerance,
    toleranceSweep,
    droop,
    minLowFreqC,
  }
}

// Grafik: REV2 §10.13 — toplam PDN, VRM kolu, her kondansatör grubu, plane
// kolu ve (varsa) tolerans min/maks zarfı. Dallar `r.sweep.freqs` İLE AYNI
// frekans dizisi üzerinde yeniden hesaplanır (motor bu dalları ayrı ayrı
// döndürmüyor, yalnız toplamı) — ReturnPathStitchingVia'nın kondansatör
// taramasını ayrı çağırmasıyla aynı gerekçe. En fazla 4 kondansatör grubu
// ayrı seri olarak çizilir (Decoupling'teki MAX_SERIES ile aynı sınır);
// fazlası "N grup daha gizli" notuyla belirtilir.
export const MAX_GROUP_SERIES = 4

export function buildChartData(r) {
  if (!r.ok) return null
  const { freqs } = r.sweep

  const vrmPoints = r.hasVrm
    ? freqs.map((f) => [f, abs(vrmImpedance({ f, R: r.vrm.R, L: r.vrm.L, C: r.vrm.C }))])
    : null

  const planePoints = r.hasPlane
    ? freqs.map((f) => [f, abs(planeImpedance({ f, R: r.plane.R, L: r.plane.L, C: r.plane.C }))])
    : null

  const shown = Math.min(r.capGroups.length, MAX_GROUP_SERIES)
  const groupSeries = []
  for (let i = 0; i < shown; i++) {
    const g = r.capGroups[i]
    groupSeries.push({
      index: i,
      label: g.label,
      points: freqs.map((f) => [f, abs(capacitorGroupImpedance({
        f, ESR: g.ESR, eslComponent: g.eslComponent, Lmount: g.Lmount, LviaEq: g.LviaEq,
        Ceffective: g.Ceffective, count: g.count,
      }))]),
    })
  }

  const toleranceBand = (r.toleranceSweep && !r.toleranceSweep.error)
    ? freqs.map((f, i) => [f, r.toleranceSweep.min.magnitudes[i], r.toleranceSweep.max.magnitudes[i]])
    : null

  return {
    totalPoints: freqs.map((f, i) => [f, r.sweep.magnitudes[i]]),
    vrmPoints,
    planePoints,
    groupSeries,
    hiddenGroupCount: r.capGroups.length - shown,
    toleranceBand,
    targetLine: Number.isFinite(r.target.Ztarget) ? r.target.Ztarget : null,
    marker: r.worstAntiresonance
      ? { x: r.worstAntiresonance.freq, y: r.worstAntiresonance.magnitude }
      : null,
  }
}
