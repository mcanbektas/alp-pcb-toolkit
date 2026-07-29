// PCB stack-up planlayıcı (spec §10.4).
//
// Girişler SI: m. Kalınlıklar, toplamlar ve dielektrik mesafeleri metredir;
// yüzdeler boyutsuzdur.
//
// Modül saftır: React, DOM, depolama ve kullanıcıya görünen metin bilmez.
//
// KAPSAM SINIRI — bu motor bir presleme, reçine akışı ya da warpage
// benzetimi DEĞİLDİR. Simetri ve bakır dağılımı göstergeleri açıkça
// "geometrik ön kontrol" olarak etiketlenir ve sabit bir tehlike eşiği
// taşımaz; sınırı kullanıcı girer.

import {
  checkLimit,
  DIRECTION_MIN, DIRECTION_MAX,
  SOURCE_FAB_PROFILE, SOURCE_USER_RULE, SOURCE_GEOMETRY,
} from './dfmCheck'

export const STACKUP_ERR_EMPTY = 'empty'
export const STACKUP_ERR_NOT_FINITE = 'not-finite'
export const STACKUP_ERR_NON_POSITIVE = 'non-positive'
export const STACKUP_ERR_NEGATIVE = 'negative'
export const STACKUP_ERR_LAYER_TYPE = 'layer-type'
export const STACKUP_ERR_LAYER_ROLE = 'layer-role'
export const STACKUP_ERR_TOLERANCE_MODE = 'tolerance-mode'
export const STACKUP_ERR_TOLERANCE_ORDER = 'tolerance-order'
export const STACKUP_ERR_INVALID_ORDER = 'invalid-order'

export const STACKUP_VARIANT_ADJACENT_COPPER = 'adjacent-copper'

// --- Katman türleri ---
export const LAYER_COPPER = 'copper'
export const LAYER_CORE = 'core'
export const LAYER_PREPREG = 'prepreg'
export const LAYER_SOLDERMASK = 'soldermask'
export const LAYER_COATING = 'coating'
export const LAYER_ADHESIVE = 'adhesive'
export const LAYER_TYPES = [
  LAYER_COPPER, LAYER_CORE, LAYER_PREPREG, LAYER_SOLDERMASK, LAYER_COATING, LAYER_ADHESIVE,
]

// Dielektrik sayılan türler: toplam dielektrik kalınlığına ve iki bakır
// arasındaki mesafeye bunlar girer.
export const DIELECTRIC_TYPES = [LAYER_CORE, LAYER_PREPREG, LAYER_ADHESIVE]
// Yüzey kaplaması: bitmiş kalınlığa girer ama iki bakır arasındaki dielektrik
// mesafeye girmez.
export const SURFACE_TYPES = [LAYER_SOLDERMASK, LAYER_COATING]

// --- Katman rolleri ---
export const ROLE_SIGNAL = 'signal'
export const ROLE_GROUND = 'ground'
export const ROLE_POWER = 'power'
export const ROLE_MIXED_PLANE = 'mixed-plane'
export const ROLE_DIELECTRIC = 'dielectric'
export const ROLE_COATING = 'coating'
export const LAYER_ROLES = [
  ROLE_SIGNAL, ROLE_GROUND, ROLE_POWER, ROLE_MIXED_PLANE, ROLE_DIELECTRIC, ROLE_COATING,
]

// Referans düzlemi sayılan roller. Karışık düzlem (mixed-plane) referans
// sayılır ama bu bir varsayımdır ve sonuçta bildirilir: bölünmüş bir düzlem
// dönüş yolunu kesebilir.
export const PLANE_ROLES = [ROLE_GROUND, ROLE_POWER, ROLE_MIXED_PLANE]

// --- Tolerans kipleri ---
export const TOL_ABSOLUTE = 'absolute'
export const TOL_PERCENT = 'percent'
export const TOL_MINMAX = 'minmax'
export const TOL_MODES = [TOL_ABSOLUTE, TOL_PERCENT, TOL_MINMAX]

export const METHOD_WORST_CASE = 'worst-case-stack'

export const ASSUMPTION_WORST_CASE_SAME_DIRECTION = 'worst-case-same-direction'
export const ASSUMPTION_SYMMETRY_HEURISTIC = 'symmetry-heuristic'
export const ASSUMPTION_COPPER_PROXY = 'copper-proxy'
export const ASSUMPTION_DK_WEIGHTED = 'dk-weighted'
export const ASSUMPTION_MIXED_PLANE_AS_REFERENCE = 'mixed-plane-as-reference'
export const ASSUMPTION_NO_FAB_PROFILE = 'no-fab-profile'

export const STACKUP_WARN_NO_REFERENCE = 'no-reference'
export const STACKUP_WARN_OUTER_DIELECTRIC = 'outer-dielectric'
export const STACKUP_WARN_ADJACENT_COPPER = 'adjacent-copper'
export const STACKUP_WARN_ODD_COPPER_SPLIT = 'odd-copper-split'
export const STACKUP_WARN_NO_COVERAGE = 'no-coverage'

export const CHECK_LAYER_COUNT = 'layerCount'
export const CHECK_TOTAL_THICKNESS = 'totalThickness'
export const CHECK_TOTAL_THICKNESS_MAX = 'totalThicknessMax'
export const CHECK_ASPECT_RATIO = 'aspectRatio'
export const CHECK_SYMMETRY = 'symmetry'
export const CHECK_COPPER_BALANCE = 'copperBalance'
export const CHECK_REFERENCES = 'references'

// Simetri oranında paydanın sıfıra düşmesini engelleyen taban. İki eş katmanın
// ortalaması bundan küçükse oran zaten anlamını yitirir; sıfıra bölmek yerine
// taban kullanılır. 1 nm, üretimdeki hiçbir katman kalınlığından küçüktür.
export const SYMMETRY_EPSILON = 1e-9

function isNum(x) {
  return typeof x === 'number' && Number.isFinite(x)
}

/**
 * Tek bir katmanın kalınlık uçlarını çözer.
 *
 *   mutlak:  h_min = h − tolMinus,  h_max = h + tolPlus
 *   yüzde:   h_min = h·(1 − p_minus/100),  h_max = h·(1 + p_plus/100)
 *   min/max: doğrudan girilen uçlar
 *
 * Tolerans verilmemişse uçlar nominale eşittir — sessizce bir pay uydurulmaz.
 */
export function layerBounds(layer, index) {
  const h = layer.thickness
  if (!isNum(h)) return { error: STACKUP_ERR_NOT_FINITE, index, field: 'thickness' }
  if (!(h > 0)) return { error: STACKUP_ERR_NON_POSITIVE, index, field: 'thickness' }

  const mode = layer.toleranceMode ?? TOL_ABSOLUTE
  if (!TOL_MODES.includes(mode)) {
    return { error: STACKUP_ERR_TOLERANCE_MODE, index, allowed: TOL_MODES }
  }

  if (mode === TOL_MINMAX) {
    const lo = isNum(layer.minimumThickness) ? layer.minimumThickness : h
    const hi = isNum(layer.maximumThickness) ? layer.maximumThickness : h
    if (lo < 0 || hi < 0) return { error: STACKUP_ERR_NEGATIVE, index, field: 'minimumThickness' }
    if (lo > hi) return { error: STACKUP_ERR_TOLERANCE_ORDER, index }
    return { min: lo, nominal: h, max: hi }
  }

  const plus = isNum(layer.tolerancePlus) ? layer.tolerancePlus : 0
  const minus = isNum(layer.toleranceMinus) ? layer.toleranceMinus : 0
  if (plus < 0 || minus < 0) return { error: STACKUP_ERR_NEGATIVE, index, field: 'tolerance' }

  if (mode === TOL_PERCENT) {
    if (plus > 100 || minus > 100) {
      return { error: STACKUP_ERR_NEGATIVE, index, field: 'tolerance' }
    }
    return { min: h * (1 - minus / 100), nominal: h, max: h * (1 + plus / 100) }
  }

  const min = h - minus
  if (min < 0) return { error: STACKUP_ERR_NEGATIVE, index, field: 'toleranceMinus' }
  return { min, nominal: h, max: h + plus }
}

const isCopper = (l) => l.type === LAYER_COPPER
const isDielectric = (l) => DIELECTRIC_TYPES.includes(l.type)
const isSurface = (l) => SURFACE_TYPES.includes(l.type)
const isPlane = (l) => isCopper(l) && PLANE_ROLES.includes(l.role)
const isSignal = (l) => isCopper(l) && l.role === ROLE_SIGNAL

/**
 * Bir sinyal katmanının en yakın geçerli referans düzlemlerini bulur.
 *
 * Kural: sinyal ile referans arasında **başka bir bakır katman varsa** o ikili
 * doğrudan referans çifti sayılmaz. Aradaki bakır alanı böler; mesafe artık
 * tek bir dielektrik yığını değildir.
 *
 * Döner: { upper, lower } — her biri
 *   { index, distance, dielectrics: [...], dkWeighted } ya da null.
 */
export function findReferences(layers, signalIndex) {
  const scan = (step) => {
    const dielectrics = []
    let distance = 0
    for (let i = signalIndex + step; i >= 0 && i < layers.length; i += step) {
      const l = layers[i]
      if (isCopper(l)) {
        // İlk karşılaşılan bakır düzlemse referanstır; sinyalse yol kapanır.
        if (!isPlane(l)) return null
        return {
          index: i,
          distance,
          dielectrics,
          dkWeighted: weightedDk(dielectrics),
        }
      }
      if (isDielectric(l)) {
        distance += l.thickness
        dielectrics.push(l)
      }
      // Yüzey katmanları (mask, kaplama) iki bakır arasındaki dielektrik
      // mesafeye girmez; dış yüzeyde dururlar.
    }
    return null
  }

  return { upper: scan(-1), lower: scan(1) }
}

/**
 * Kalınlık ağırlıklı dielektrik sabiti.
 *
 *   Dk_weighted = Σ(Dk_i · h_i) / Σh_i
 *
 * Bu **gerçek elektromanyetik etkin dielektrik sabiti değildir**. Seri duran
 * farklı malzemeler için yalnızca kaba bir gösterge verir; alan çözümü
 * yerine geçmez. Dk girilmemiş katman varsa sonuç üretilmez (null) — eksik
 * veriyle ortalama uydurulmaz.
 */
export function weightedDk(dielectrics) {
  if (!dielectrics || dielectrics.length === 0) return null
  let num = 0
  let den = 0
  for (const l of dielectrics) {
    if (!isNum(l.dielectricConstant) || !(l.dielectricConstant > 0)) return null
    num += l.dielectricConstant * l.thickness
    den += l.thickness
  }
  if (!(den > 0)) return null
  return num / den
}

/**
 * Katman simetrisi göstergesi — merkeze göre eş katmanların kalınlık farkı.
 *
 *   E_i = |h_i − h_mirror| / max((h_i + h_mirror)/2, ε)
 *   E_sym,max = max(E_i)
 *   E_sym,weighted = Σ|h_i − h_mirror| / Σ((h_i + h_mirror)/2)
 *
 * Geometrik ön kontroldür: presleme davranışını, reçine akışını ya da
 * warpage miktarını temsil etmez.
 */
export function symmetryError(layers) {
  const n = layers.length
  if (n < 2) return { max: 0, weighted: 0, pairs: [] }

  const pairs = []
  let sumDiff = 0
  let sumMean = 0
  let max = 0

  for (let i = 0; i < Math.floor(n / 2); i += 1) {
    const a = layers[i]
    const b = layers[n - 1 - i]
    const diff = Math.abs(a.thickness - b.thickness)
    const mean = (a.thickness + b.thickness) / 2
    const e = diff / Math.max(mean, SYMMETRY_EPSILON)
    pairs.push({ top: i, bottom: n - 1 - i, diff, mean, error: e, typeMismatch: a.type !== b.type })
    sumDiff += diff
    sumMean += mean
    if (e > max) max = e
  }

  return {
    max,
    weighted: sumMean > 0 ? sumDiff / sumMean : 0,
    pairs,
  }
}

/**
 * Bakır dağılımı göstergesi (areal copper proxy).
 *
 *   M_top    = Σ(t_copper,i · coverage_i)  üst yarı
 *   M_bottom = Σ(t_copper,j · coverage_j)  alt yarı
 *   B_copper = 100·|M_top − M_bottom| / (M_top + M_bottom)
 *
 * Yalnızca kullanıcı bakır doluluk yüzdesi girdiyse hesaplanır. Mekanik
 * gerilme, reçine akışı ya da warpage miktarı DEĞİLDİR.
 *
 * Bakır katman sayısı tekse ortadaki katman iki yarıya da yazılmaz ve durum
 * bildirilir; onu bir tarafa saymak göstergeyi sessizce kaydırırdı.
 */
export function copperBalance(layers) {
  const coppers = layers
    .map((l, i) => ({ layer: l, index: i }))
    .filter(({ layer }) => isCopper(layer))

  if (coppers.length === 0) return { value: null, top: null, bottom: null, oddSplit: false }

  const missing = coppers.some(({ layer }) => !isNum(layer.copperCoveragePercent))
  if (missing) return { value: null, top: null, bottom: null, oddSplit: false, missingCoverage: true }

  const half = Math.floor(coppers.length / 2)
  const oddSplit = coppers.length % 2 === 1

  const mass = ({ layer }) => layer.thickness * (layer.copperCoveragePercent / 100)
  const top = coppers.slice(0, half).reduce((acc, c) => acc + mass(c), 0)
  const bottom = coppers.slice(coppers.length - half).reduce((acc, c) => acc + mass(c), 0)

  const total = top + bottom
  if (!(total > 0)) return { value: null, top, bottom, oddSplit }

  return { value: (100 * Math.abs(top - bottom)) / total, top, bottom, oddSplit }
}

/**
 * Stack-up hesabı.
 *
 * @param {object}  arg
 * @param {Array}   arg.layers  üstten alta sıralı katmanlar (SI kalınlık)
 * @returns {object} { valid, results, layers, signals, checks, warnings,
 *                     assumptions, method } veya { error, ... }
 */
export function computeStackup(input = {}) {
  const {
    layers = [],
    drillDiameter = null,
    symmetryLimitPercent = null,
    copperBalanceLimitPercent = null,
    limits = {},
    warnPercent = null,
    hasProfile = false,
  } = input

  if (!Array.isArray(layers) || layers.length === 0) {
    return { error: STACKUP_ERR_EMPTY }
  }

  // --- Katman doğrulama ve tolerans uçları ---
  const bounds = []
  for (let i = 0; i < layers.length; i += 1) {
    const l = layers[i]
    if (!LAYER_TYPES.includes(l.type)) {
      return { error: STACKUP_ERR_LAYER_TYPE, index: i, allowed: LAYER_TYPES }
    }
    if (l.role !== undefined && l.role !== null && !LAYER_ROLES.includes(l.role)) {
      return { error: STACKUP_ERR_LAYER_ROLE, index: i, allowed: LAYER_ROLES }
    }
    const b = layerBounds(l, i)
    if (b.error) return b
    bounds.push(b)
  }

  // İki bakır katman arada hiç dielektrik olmadan arka arkaya duramaz.
  for (let i = 1; i < layers.length; i += 1) {
    if (isCopper(layers[i]) && isCopper(layers[i - 1])) {
      return {
        error: STACKUP_ERR_INVALID_ORDER,
        variant: STACKUP_VARIANT_ADJACENT_COPPER,
        index: i,
      }
    }
  }

  // --- Toplamlar ---
  const sumBy = (pred, key) => layers.reduce(
    (acc, l, i) => (pred(l) ? acc + bounds[i][key] : acc), 0,
  )

  const dielectricTotal = sumBy(isDielectric, 'nominal')
  const copperTotal = sumBy(isCopper, 'nominal')
  const surfaceTotal = sumBy(isSurface, 'nominal')
  const finishedTotal = dielectricTotal + copperTotal + surfaceTotal

  const totalMin = bounds.reduce((acc, b) => acc + b.min, 0)
  const totalNominal = bounds.reduce((acc, b) => acc + b.nominal, 0)
  const totalMax = bounds.reduce((acc, b) => acc + b.max, 0)

  // --- Sinyal katmanları ve referansları ---
  const signals = []
  for (let i = 0; i < layers.length; i += 1) {
    if (!isSignal(layers[i])) continue
    const refs = findReferences(layers, i)

    // Dış katman (üstünde hiç bakır yok) microstrip'tir: tek referans yeter.
    const copperAbove = layers.slice(0, i).some(isCopper)
    const copperBelow = layers.slice(i + 1).some(isCopper)
    const outer = !copperAbove || !copperBelow

    signals.push({
      index: i,
      name: layers[i].name ?? null,
      thickness: layers[i].thickness,
      outer,
      upper: refs.upper,
      lower: refs.lower,
      // Microstrip H: tek geçerli referansa olan dielektrik mesafe.
      // Stripline: H1 (üst) ve H2 (alt) ayrı tutulur, tek sayıya indirgenmez.
      H: outer ? (refs.upper?.distance ?? refs.lower?.distance ?? null) : null,
      H1: refs.upper?.distance ?? null,
      H2: refs.lower?.distance ?? null,
      dkUpper: refs.upper?.dkWeighted ?? null,
      dkLower: refs.lower?.dkWeighted ?? null,
      hasReference: refs.upper !== null || refs.lower !== null,
    })
  }

  const signalsWithoutReference = signals.filter((sg) => !sg.hasReference)

  // --- Heuristik göstergeler ---
  const symmetry = symmetryError(layers)
  const balance = copperBalance(layers)

  // --- Kontroller ---
  const L = limits ?? {}
  const copperCount = layers.filter(isCopper).length

  // Kart kalınlığı ve üreticinin en küçük matkabıyla ulaşılabilen en büyük
  // aspect ratio. Kullanıcı bir matkap çapı girmişse o kullanılır.
  const arDrill = isNum(drillDiameter) && drillDiameter > 0
    ? drillDiameter
    : (L.minMechanicalDrill ?? null)
  const achievableAspect = arDrill !== null && arDrill > 0 ? finishedTotal / arDrill : null

  const checks = [
    checkLimit({
      id: CHECK_LAYER_COUNT,
      actual: copperCount,
      required: L.maxLayerCount ?? null,
      direction: DIRECTION_MAX,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
      detail: { minLayerCount: L.minLayerCount ?? null },
    }),
    checkLimit({
      id: CHECK_TOTAL_THICKNESS,
      actual: totalNominal,
      required: L.minBoardThickness ?? null,
      direction: DIRECTION_MIN,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_TOTAL_THICKNESS_MAX,
      actual: totalMax,
      required: L.maxBoardThickness ?? null,
      direction: DIRECTION_MAX,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_ASPECT_RATIO,
      actual: achievableAspect,
      required: L.maxPthAspectRatio ?? null,
      direction: DIRECTION_MAX,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
      detail: { drillDiameter: arDrill },
    }),
    // Simetri ve bakır dengesi kesin DFM kuralı değildir: sınırı kullanıcı
    // girer, girmezse kontrol `unknown` kalır.
    checkLimit({
      id: CHECK_SYMMETRY,
      actual: symmetry.max * 100,
      required: symmetryLimitPercent,
      direction: DIRECTION_MAX,
      source: SOURCE_USER_RULE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_COPPER_BALANCE,
      actual: balance.value,
      required: copperBalanceLimitPercent,
      direction: DIRECTION_MAX,
      source: SOURCE_USER_RULE,
      warnPercent,
    }),
    // Referans kontrolü geometriktir: her sinyal katmanının en az bir
    // referans düzlemi olmalı.
    checkLimit({
      id: CHECK_REFERENCES,
      actual: signals.length === 0 ? null : signals.length - signalsWithoutReference.length,
      required: signals.length === 0 ? null : signals.length,
      direction: DIRECTION_MIN,
      source: SOURCE_GEOMETRY,
      warnPercent: null,
    }),
  ]

  // --- Uyarılar ---
  const warnings = []
  if (signalsWithoutReference.length > 0) {
    warnings.push({
      code: STACKUP_WARN_NO_REFERENCE,
      indexes: signalsWithoutReference.map((sg) => sg.index),
    })
  }
  // Dış yüzeyde beklenmeyen core/prepreg: dizilim genelde bakır ya da
  // yüzey kaplamasıyla biter.
  if (isDielectric(layers[0]) || isDielectric(layers[layers.length - 1])) {
    warnings.push({ code: STACKUP_WARN_OUTER_DIELECTRIC })
  }
  if (balance.oddSplit) warnings.push({ code: STACKUP_WARN_ODD_COPPER_SPLIT })
  if (balance.missingCoverage) warnings.push({ code: STACKUP_WARN_NO_COVERAGE })

  const assumptions = [ASSUMPTION_WORST_CASE_SAME_DIRECTION, ASSUMPTION_SYMMETRY_HEURISTIC]
  if (balance.value !== null) assumptions.push(ASSUMPTION_COPPER_PROXY)
  if (signals.some((sg) => sg.dkUpper !== null || sg.dkLower !== null)) {
    assumptions.push(ASSUMPTION_DK_WEIGHTED)
  }
  if (layers.some((l) => l.role === ROLE_MIXED_PLANE)) {
    assumptions.push(ASSUMPTION_MIXED_PLANE_AS_REFERENCE)
  }
  if (!hasProfile) assumptions.push(ASSUMPTION_NO_FAB_PROFILE)

  const results = {
    dielectricTotal,
    copperTotal,
    surfaceTotal,
    finishedTotal,
    totalMin,
    totalNominal,
    totalMax,
    copperCount,
    layerCount: layers.length,
    symmetryMax: symmetry.max,
    symmetryWeighted: symmetry.weighted,
    copperBalance: balance.value,
    copperTop: balance.top,
    copperBottom: balance.bottom,
    achievableAspect,
    aspectDrill: arDrill,
  }

  for (const [key, value] of Object.entries(results)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return { error: STACKUP_ERR_NOT_FINITE, field: key }
    }
  }

  return {
    valid: true,
    results,
    bounds,
    signals,
    symmetryPairs: symmetry.pairs,
    checks,
    warnings,
    assumptions,
    method: METHOD_WORST_CASE,
  }
}

/**
 * Sweep: seçilen katmanın kalınlığına göre toplam bitmiş kalınlık, ya da
 * tolerans yüzdesine göre minimum/maksimum toplam.
 */
export function buildStackupSweep(base, layerIndex, from, to, steps = 41) {
  if (!isNum(from) || !isNum(to) || !Number.isInteger(steps) || steps < 2) return []
  const layers = base.layers ?? []
  if (!layers[layerIndex]) return []

  const points = []
  for (let i = 0; i < steps; i += 1) {
    const x = from + ((to - from) * i) / (steps - 1)
    if (!(x > 0)) continue
    const patched = layers.map((l, idx) => (idx === layerIndex ? { ...l, thickness: x } : l))
    const r = computeStackup({ ...base, layers: patched })
    if (r.error) continue
    points.push({
      x,
      y: r.results.totalNominal,
      yMin: r.results.totalMin,
      yMax: r.results.totalMax,
    })
  }
  return points
}

/** Sweep: tolerans yüzdesine göre minimum ve maksimum toplam kalınlık. */
export function buildToleranceSweep(base, from, to, steps = 41) {
  if (!isNum(from) || !isNum(to) || !Number.isInteger(steps) || steps < 2) return []
  const layers = base.layers ?? []
  const points = []
  for (let i = 0; i < steps; i += 1) {
    const p = from + ((to - from) * i) / (steps - 1)
    if (p < 0) continue
    const patched = layers.map((l) => ({
      ...l, toleranceMode: TOL_PERCENT, tolerancePlus: p, toleranceMinus: p,
    }))
    const r = computeStackup({ ...base, layers: patched })
    if (r.error) continue
    points.push({ x: p, y: r.results.totalNominal, yMin: r.results.totalMin, yMax: r.results.totalMax })
  }
  return points
}
