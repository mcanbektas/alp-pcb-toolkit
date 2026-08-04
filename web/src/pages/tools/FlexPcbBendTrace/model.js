// Flex PCB bükülme ve iz hesaplayıcısı ekranının hesap modeli (REV2 §15).
//
// Saf: React ve DOM bilmez, gösterim biçimi üretmez. Form nesnesini alır,
// SI'ye çevirir, lib/flexPcb.js motorunu çağırır, sonucu ve hata kodunu döner.
// Kullanıcıya gösterilecek metin text.js içindedir.
//
// Bu araçta analiz/sentez modu YOK: REV2 §15 bend radius'u üretici kuralına ve
// strain kuralına göre kıyaslanan bağımsız bir girdi olarak tarif eder (ters
// çözüm — "hedef strain için R bul" gibi — §15'te yok).

import { fieldsFor, readForm, when } from '../../../lib/fields'
import { LENGTH, CURRENT } from '../../../lib/units'
import {
  flexPcbPlan, bendClearanceChecks, VENDOR_BEND_PROFILE_EXAMPLES,
  copperStrain, outerSurfaceStrain, strainPercent,
  minBendRadiusFromStrain, minBendRadiusFromStrainSymmetric, vendorMinBendRadius,
  traceResistance, parallelTraceResistance,
} from '../../../lib/flexPcb'
import { logspace } from '../../../lib/sweep'

export const FLEX_SINGLE = 'single-layer'
export const FLEX_DOUBLE = 'double-layer'
export const FLEX_MULTI = 'multilayer'
export const FLEX_RIGID = 'rigid-flex'
export const FLEX_TYPES = [FLEX_DOUBLE, FLEX_MULTI, FLEX_SINGLE, FLEX_RIGID]

export const BEND_STATIC = 'static'
export const BEND_DYNAMIC = 'dynamic'
export const BEND_MODES = [BEND_STATIC, BEND_DYNAMIC]

// İzin verilen strain gizli bir varsayılan değil — kullanıcı üretici verisi
// girdiğini ya da kendi varsayımını kullandığını burada işaretler (REV2
// §15.4: "Kullanıcı üretici verisi girmeli veya değer 'kullanıcı varsayımı'
// olarak işaretlenmelidir"). Sayının kendisini DEĞİŞTİRMEZ, yalnız etiketler.
export const EPS_SOURCE_VENDOR = 'vendor'
export const EPS_SOURCE_ASSUMPTION = 'assumption'
export const EPS_SOURCES = [EPS_SOURCE_VENDOR, EPS_SOURCE_ASSUMPTION]

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_INVALID = 'invalid'

export const SWEEP_STRAIN = 'strain'
export const SWEEP_THICKNESS = 'thickness'
export const SWEEP_TRACE_WIDTH = 'traceWidth'
export const SWEEP_TEMPERATURE = 'temperature'
export const SWEEP_VENDOR_FACTOR = 'vendorFactor'
// REV2 §15.12'nin beş grafiği, birebir bu sırayla.
export const SWEEP_PARAMS = [
  SWEEP_STRAIN, SWEEP_THICKNESS, SWEEP_TRACE_WIDTH, SWEEP_TEMPERATURE, SWEEP_VENDOR_FACTOR,
]

// Birimsiz/özel tablolar — her ekran kendi kopyasını tutar (ReturnPathStitchingVia
// PLAIN/COUNT deseniyle aynı gerekçe).
const PLAIN = { '': 1 }
const COUNT = { adet: 1 }
const DEG = { '°': 1 }
const CELSIUS = { '°C': 1 }
// DİKKAT: bu, uygulamanın genel "yüzde noktası" kuralından (num.js/uiText.js
// pct deseni, örn. warnPercent'te '%'→1) BİLE İSTE FARKLIDIR. flexPcb.js'in
// epsilonAllow'u HAM ORANDIR (ε_allow=0.02 → %2); ekranda "2" yazan kullanıcı
// 0.02 SI değeri göndermelidir.
const STRAIN_PCT = { '%': 0.01 }
const PCT = { '%': 1 }

export const LEN_UNITS = ['mm', 'µm', 'mil']
export const CURRENT_UNITS = ['mA', 'A']

export const INITIAL_FORM = {
  flexType: FLEX_DOUBLE,
  bendMode: BEND_STATIC,

  // REV2 §15.13 referans testiyle birebir aynı: t_total=0.2 mm, K_b=12 →
  // R_min,vendor=2.4 mm; R=2.4 mm'de simetrik strain ≈ %4.17.
  tTotal: '0.2', tTotalu: 'mm',
  R: '2.4', Ru: 'mm',
  thetaDeg: '90',
  y: '', yu: 'mm',

  epsilonAllow: '', epsilonAllowSource: EPS_SOURCE_ASSUMPTION,
  Kb: '12',

  l: '', lu: 'mm',
  w: '', wu: 'mm',
  t: '', tu: 'mm',
  n: '1',
  T: '20',
  current: '', currentu: 'mA',

  viaDistance: '', viaDistanceu: 'mm',
  viaMinDistance: '', viaMinDistanceu: 'mm',
  padDistance: '', padDistanceu: 'mm',
  padMinDistance: '', padMinDistanceu: 'mm',
  stiffenerDistance: '', stiffenerDistanceu: 'mm',
  stiffenerMinDistance: '', stiffenerMinDistanceu: 'mm',
  warnPercent: '10',

  cycleA: '', cycleB: '', targetCycles: '',
}

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// `lib/` bunları bilmez. Etiket verilmezse alan anahtarı gösterilir.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'tTotal', label: L('tTotal'), unitKey: 'tTotalu', table: LENGTH, min: 0 },
      { key: 'R', label: L('R'), unitKey: 'Ru', table: LENGTH, min: 0 },
    ],
    [
      { key: 'thetaDeg', label: L('thetaDeg'), unit: '°', table: DEG, optional: true, min: 0 },
      { key: 'y', label: L('y'), unitKey: 'yu', table: LENGTH, optional: true, allowZero: true, min: 0 },
    ],
    [
      { key: 'epsilonAllow', label: L('epsilonAllow'), unit: '%', table: STRAIN_PCT, optional: true, min: 0 },
      { key: 'Kb', label: L('Kb'), unit: '', table: PLAIN, optional: true, min: 0 },
    ],
    [
      { key: 'l', label: L('l'), unitKey: 'lu', table: LENGTH, optional: true, min: 0 },
      { key: 'w', label: L('w'), unitKey: 'wu', table: LENGTH, optional: true, min: 0 },
      { key: 't', label: L('t'), unitKey: 'tu', table: LENGTH, optional: true, min: 0 },
      { key: 'n', label: L('n'), unit: 'adet', table: COUNT, optional: true, min: 1 },
      { key: 'T', label: L('T'), unit: '°C', table: CELSIUS, optional: true, allowZero: true },
      { key: 'current', label: L('current'), unitKey: 'currentu', table: CURRENT, optional: true, min: 0 },
    ],
    [
      {
        key: 'viaDistance', label: L('viaDistance'), unitKey: 'viaDistanceu',
        table: LENGTH, optional: true, allowZero: true, min: 0,
      },
      { key: 'viaMinDistance', label: L('viaMinDistance'), unitKey: 'viaMinDistanceu', table: LENGTH, optional: true, min: 0 },
      {
        key: 'padDistance', label: L('padDistance'), unitKey: 'padDistanceu',
        table: LENGTH, optional: true, allowZero: true, min: 0,
      },
      { key: 'padMinDistance', label: L('padMinDistance'), unitKey: 'padMinDistanceu', table: LENGTH, optional: true, min: 0 },
      {
        key: 'stiffenerDistance', label: L('stiffenerDistance'), unitKey: 'stiffenerDistanceu',
        table: LENGTH, optional: true, allowZero: true, min: 0,
      },
      {
        key: 'stiffenerMinDistance', label: L('stiffenerMinDistance'), unitKey: 'stiffenerMinDistanceu',
        table: LENGTH, optional: true, min: 0,
      },
      {
        key: 'warnPercent', label: L('warnPercent'), unit: '%', table: PCT,
        optional: true, allowZero: true, min: 0, max: 100,
      },
    ],
    when(f.bendMode === BEND_DYNAMIC, [
      { key: 'cycleA', label: L('cycleA'), unit: '', table: PLAIN, optional: true, min: 0 },
      { key: 'cycleB', label: L('cycleB'), unit: '', table: PLAIN, optional: true, min: 0 },
      { key: 'targetCycles', label: L('targetCycles'), unit: '', table: PLAIN, optional: true, min: 0 },
    ]),
  ])
}

// §15.5 örnek üretici BAŞLANGIÇ profili yalnız double-layer+static ve
// multilayer+static için tanımlı (VENDOR_BEND_PROFILE_EXAMPLES'ta dynamic
// satırı bilinçli olarak yok — "Dynamic flex için sabit bir K_b varsayılmaz").
// Eşleşme yoksa null: ekran hiçbir ipucu göstermez, gizli bir sayı uydurmaz.
export function vendorProfileHint(flexType, bendMode) {
  return VENDOR_BEND_PROFILE_EXAMPLES[`${flexType}-${bendMode}`] ?? null
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const isDynamic = f.bendMode === BEND_DYNAMIC

  const plan = flexPcbPlan({
    tTotal: v.tTotal,
    R: v.R,
    thetaDeg: v.thetaDeg,
    y: v.y,
    epsilonAllow: v.epsilonAllow,
    Kb: v.Kb,
    l: v.l,
    w: v.w,
    t: v.t,
    // flexPcbPlan'ın kendi varsayılanları (T=20, n=1) yalnız argüman hiç
    // GEÇİRİLMEZSE (undefined) devreye girer; boş bırakılan opsiyonel alan
    // burada `null` döner ve `null` bu varsayılanı TETİKLEMEZ. Varsayılan
    // burada elle uygulanır, yoksa boş T alanı motora null gider ve
    // traceResistance sessizce NaN döner.
    T: v.T ?? 20,
    n: v.n ?? 1,
    current: v.current,
    viaDistance: v.viaDistance,
    viaMinDistance: v.viaMinDistance,
    padDistance: v.padDistance,
    padMinDistance: v.padMinDistance,
    stiffenerDistance: v.stiffenerDistance,
    stiffenerMinDistance: v.stiffenerMinDistance,
    cycleA: isDynamic ? v.cycleA : null,
    cycleB: isDynamic ? v.cycleB : null,
  })
  if (plan.error) return { ok: false, reason: REASON_INVALID }

  // flexPcbPlan §15.9 clearance bloğunu warnPercent OLMADAN kurar (fonksiyon
  // imzasında bu alan yok — flexPcb.js'e DOKUNULMADI, bu bilinçli bir motor
  // kararı). dfmCheck.js'in "uyarı marjı çağıran açıkça geçirir" kuralını
  // karşılamak için aynı üç kontrol `bendClearanceChecks` ile warnPercent
  // vererek burada YENİDEN kurulur ve plan'ın clearance alanı bununla
  // değiştirilir — ReturnPathStitchingVia'nın returnPathPlan'ın yanında
  // viaReactance/parallelViaInductance/capacitorBranch'i ayrıca çağırmasıyla
  // aynı kompozisyon deseni, motorun kendisi değişmiyor.
  const clearance = bendClearanceChecks({
    viaDistance: v.viaDistance,
    viaMinDistance: v.viaMinDistance,
    padDistance: v.padDistance,
    padMinDistance: v.padMinDistance,
    stiffenerDistance: v.stiffenerDistance,
    stiffenerMinDistance: v.stiffenerMinDistance,
    warnPercent: v.warnPercent ?? null,
  })

  return {
    ok: true,
    flexType: f.flexType,
    bendMode: f.bendMode,
    epsilonAllowSource: f.epsilonAllowSource,
    // Statik modda cycleA/cycleB/targetCycles formFields'ta hiç yok (when() ile
    // dışlanıyor), bu yüzden `v.targetCycles` `undefined` olur — `null` DEĞİL.
    // Aşağıdaki `!== null` denetimleri (text.js/schematic) bu farkı ayırt
    // etmemeli; `?? null` ikisini de aynı "girilmedi" durumuna indirger.
    targetCycles: v.targetCycles ?? null,
    warnPercent: v.warnPercent ?? null,
    // Ham girdiler saklanır: grafik taraması (buildSweep) ve rapor bunları
    // yeniden kullanır, motora ikinci bir kopya yazılmaz.
    tTotal: v.tTotal,
    R: v.R,
    thetaDeg: v.thetaDeg,
    y: v.y,
    epsilonAllow: v.epsilonAllow,
    Kb: v.Kb,
    l: v.l,
    w: v.w,
    t: v.t,
    T: v.T ?? 20,
    n: v.n ?? 1,
    current: v.current,
    ...plan,
    clearance,
  }
}

const hasTraceInputs = (r) => r.l !== null && r.w !== null && r.t !== null

// R, t_total, tel genişliği ve K_b — dördü de centre/10..centre*10 ya da eşdeğer
// çok-dekatlı bir aralıkta taranır (tehlikeli küçük-R/yüksek-strain bölgesi ile
// düz üst uç arasında iki dekat fark var). ReturnPathStitchingVia/VoltageDivider
// ile aynı gerekçeyle logspace() kullanılır: doğrusal örnekleme alt dekadı 1-2
// noktayla temsil eder ve düz kuyruğu aşırı örnekler. `values ?? []` güvencesi
// ReturnPathStitchingVia'daki `freqRange`le aynı desen — centre uç sınırda
// (örn. çok küçük K_b) from/to sıralaması bozulursa grafik çizilmez, uydurulmaz.
function strainSweepRows(r) {
  const centre = r.R
  const { values } = logspace(centre / 10, centre * 10, 61)
  return (values ?? []).map((R) => {
    const epsilon = r.y !== null
      ? copperStrain({ y: r.y, R })
      : outerSurfaceStrain({ tTotal: r.tTotal, R })
    return { x: R, y: strainPercent({ epsilon }) }
  })
}

function thicknessSweepRows(r) {
  const centre = r.tTotal
  const { values } = logspace(centre / 10, centre * 10, 61)
  return (values ?? []).map((tTotal) => {
    const vendor = r.Kb !== null ? vendorMinBendRadius({ Kb: r.Kb, tTotal }) : null
    const strainBased = r.epsilonAllow === null ? null : (r.y !== null
      ? minBendRadiusFromStrain({ y: r.y, epsilonAllow: r.epsilonAllow })
      : minBendRadiusFromStrainSymmetric({ tTotal, epsilonAllow: r.epsilonAllow }))
    return { x: tTotal, vendor, strainBased }
  })
}

function traceWidthSweepRows(r) {
  const centre = r.w
  const { values } = logspace(centre / 10, centre * 10, 61)
  return (values ?? []).map((w) => {
    const rSingle = traceResistance({ l: r.l, w, t: r.t, T: r.T })
    return { x: w, y: parallelTraceResistance({ rSingle, n: r.n }) }
  })
}

// İSTİSNA: sıcaklık aralığı mutlak ve dar (-40..105°C, iki dekat değil) —
// diğer dört taramanın aksine bu tarama doğrusal kalır.
function temperatureSweepRows(r) {
  const from = -40
  const to = 105
  const steps = 60
  const rows = []
  for (let i = 0; i <= steps; i++) {
    const T = from + ((to - from) * i) / steps
    const rSingle = traceResistance({ l: r.l, w: r.w, t: r.t, T })
    rows.push({ x: T, y: parallelTraceResistance({ rSingle, n: r.n }) })
  }
  return rows
}

function vendorFactorSweepRows(r) {
  const centre = r.Kb !== null ? r.Kb : 12
  const from = Math.max(1, centre / 4)
  const to = centre * 4
  const { values } = logspace(from, to, 61)
  return (values ?? []).map((Kb) => ({ x: Kb, y: vendorMinBendRadius({ Kb, tTotal: r.tTotal }) }))
}

/**
 * Grafik verisi — REV2 §15.12'nin beş grafiği. Girdi yetersizse (örn. trace
 * alanları boşken tel genişliği/sıcaklık taraması) null döner; uydurulmuş
 * veriyle doldurulmaz (ReturnPathStitchingVia'daki kondansatör taraması ile
 * aynı desen).
 */
export function buildSweep(r, param) {
  if (!r.ok) return null

  if (param === SWEEP_STRAIN) {
    const rows = strainSweepRows(r)
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.R, y: r.strainPercent },
    }
  }

  if (param === SWEEP_THICKNESS) {
    if (r.Kb === null && r.epsilonAllow === null) return null
    const rows = thicknessSweepRows(r)
    return {
      param,
      rows,
      hasVendor: r.Kb !== null,
      hasStrain: r.epsilonAllow !== null,
      points: rows.filter((p) => p.vendor !== null).map((p) => [p.x, p.vendor]),
      pointsStrain: rows.filter((p) => p.strainBased !== null).map((p) => [p.x, p.strainBased]),
      marker: { x: r.tTotal, y: r.vendorMinRadius ?? r.strainMinRadius },
    }
  }

  if (param === SWEEP_TRACE_WIDTH) {
    if (!hasTraceInputs(r)) return null
    const rows = traceWidthSweepRows(r)
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.w, y: r.traceResistance },
    }
  }

  if (param === SWEEP_TEMPERATURE) {
    if (!hasTraceInputs(r)) return null
    const rows = temperatureSweepRows(r)
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.T, y: r.traceResistance },
    }
  }

  // SWEEP_VENDOR_FACTOR — tTotal her zaman zorunlu girdi olduğu için bu
  // grafik Kb girilmemiş olsa bile her zaman üretilebilir.
  const rows = vendorFactorSweepRows(r)
  return {
    param,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    marker: r.Kb !== null ? { x: r.Kb, y: r.vendorMinRadius } : null,
  }
}
