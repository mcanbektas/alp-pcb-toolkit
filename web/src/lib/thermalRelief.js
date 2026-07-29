// Thermal relief spoke geometrisi — elektriksel ve bir boyutlu termal model
// (spec §10.5).
//
// Girişler SI: m, A, °C, K/W, Ω, W. Modül saftır: React, DOM, depolama ve
// kullanıcıya görünen metin bilmez.
//
// KAPSAM SINIRI — buradaki termal direnç **yalnızca spoke bakırının bir
// boyutlu iletimidir**. Pad içindeki yayılım, plane spreading direnci, via
// etkisi, lehim ve komponent termal direnci, konveksiyon, radyasyon ve PCB
// malzemesi üzerinden üç boyutlu yayılım kapsam dışıdır. Bu yüzden sonuç
// "sistemin toplam termal direnci" olarak adlandırılmaz.
//
// Bakır özdirenci ve termal iletkenlik `units.js`'ten gelir; bu dosyada
// yeniden tanımlanmaz.

import { rhoCuAt, K_CU } from './units'
import {
  checkLimit,
  DIRECTION_MIN, DIRECTION_MAX,
  SOURCE_FAB_PROFILE, SOURCE_USER_RULE, SOURCE_GEOMETRY,
} from './dfmCheck'

export const TR_ERR_REQUIRED = 'required'
export const TR_ERR_NOT_FINITE = 'not-finite'
export const TR_ERR_NON_POSITIVE = 'non-positive'
export const TR_ERR_NEGATIVE = 'negative'
export const TR_ERR_NOT_INTEGER = 'not-integer'
export const TR_ERR_GEOMETRY = 'geometry'
export const TR_ERR_SPOKE_MODE = 'spoke-mode'
export const TR_ERR_NO_SPOKES = 'no-spokes'

export const TR_VARIANT_CLEARANCE_UNDER_PAD = 'clearance-under-pad'

// Spoke geometrisi
export const SPOKE_UNIFORM = 'uniform'
export const SPOKE_TAPER = 'taper'
export const SPOKE_CUSTOM = 'custom'
export const SPOKE_MODES = [SPOKE_UNIFORM, SPOKE_TAPER, SPOKE_CUSTOM]

export const METHOD_ELECTRICAL = 'electrical-resistance'
export const METHOD_THERMAL_1D = 'one-dimensional-thermal'

export const ASSUMPTION_EQUAL_SHARING = 'equal-sharing'
export const ASSUMPTION_ONE_DIMENSIONAL = 'one-dimensional'
export const ASSUMPTION_SPOKE_LENGTH_FROM_GAP = 'spoke-length-from-gap'
export const ASSUMPTION_INDEPENDENT_HEATING = 'independent-heating'
export const ASSUMPTION_GEOMETRIC_PRECHECK = 'geometric-precheck'
export const ASSUMPTION_NO_FAB_PROFILE = 'no-fab-profile'

export const TR_WARN_SPOKE_OVERLAP = 'spoke-overlap'
export const TR_WARN_UNBALANCED_SHARING = 'unbalanced-sharing'
export const TR_WARN_SINGLE_SPOKE = 'single-spoke'

export const CHECK_SPOKE_WIDTH = 'spokeWidth'
export const CHECK_THERMAL_GAP = 'thermalGap'
export const CHECK_VOLTAGE_DROP = 'voltageDrop'
export const CHECK_POWER_LOSS = 'powerLoss'
export const CHECK_CURRENT_DENSITY = 'currentDensity'
export const CHECK_THERMAL_RESISTANCE = 'thermalResistance'
export const CHECK_SPOKE_OVERLAP = 'spokeOverlap'

/**
 * Taper kapalı formunun kullanılabildiği en küçük göreli genişlik farkı.
 *
 *   R_s = ρ·L / [t·(W₂ − W₁)] · ln(W₂/W₁)
 *
 * `W₂ → W₁` limitinde pay ve payda birlikte sıfıra gider; bu ifade sayısal
 * olarak kararsızdır (0/0 ve ln(1) = 0). Göreli fark bu eşiğin altındaysa
 * doğrudan dikdörtgen bağıntıya geçilir. Eşik, çift duyarlıklı aritmetikte
 * ln(1+x) ≈ x yaklaşımının bağıl hatasının ~1e-10 kaldığı bölgede seçildi:
 * geçiş noktasında iki formülün sonucu sürekli kalır.
 */
export const TAPER_MIN_RELATIVE_DIFF = 1e-6

// Akım paylaşımının "dengesiz" sayıldığı göreli fark. Kesin bir DFM kuralı
// değildir; yalnızca kullanıcıya bakılmaya değer bir asimetri olduğunu
// bildirir ve sonuçta bu şekilde etiketlenir.
export const SHARING_IMBALANCE = 0.05

function isNum(x) {
  return typeof x === 'number' && Number.isFinite(x)
}

function needPositive(value, field) {
  if (value === null || value === undefined || value === '') {
    return { error: TR_ERR_REQUIRED, field }
  }
  if (!isNum(value)) return { error: TR_ERR_NOT_FINITE, field }
  if (!(value > 0)) return { error: TR_ERR_NON_POSITIVE, field }
  return null
}

function optionalPositive(value, field) {
  if (value === null || value === undefined || value === '') return { value: null }
  if (!isNum(value)) return { error: TR_ERR_NOT_FINITE, field }
  if (!(value > 0)) return { error: TR_ERR_NON_POSITIVE, field }
  return { value }
}

/**
 * Dikdörtgen kesitli tek spoke elektriksel direnci.
 *
 *   R_s = ρ(T)·L / (W·t)
 */
export function uniformSpokeResistance({ length, width, thickness, rho }) {
  if (!(length > 0) || !(width > 0) || !(thickness > 0) || !(rho > 0)) return null
  return (rho * length) / (width * thickness)
}

/**
 * Doğrusal taper spoke elektriksel direnci.
 *
 *   W(x) = W₁ + (W₂ − W₁)·x/L
 *   R_s  = ρ/t · ∫₀ᴸ dx/W(x) = ρ·L / [t·(W₂ − W₁)] · ln(W₂/W₁)
 *
 * Genişlikler birbirine çok yakınsa kapalı form sayısal olarak kararsızdır;
 * dikdörtgen bağıntıya geçilir (bkz. TAPER_MIN_RELATIVE_DIFF).
 */
export function taperSpokeResistance({ length, widthIn, widthOut, thickness, rho }) {
  if (!(length > 0) || !(widthIn > 0) || !(widthOut > 0) || !(thickness > 0) || !(rho > 0)) {
    return null
  }
  const rel = Math.abs(widthOut - widthIn) / Math.max(widthIn, widthOut)
  if (rel < TAPER_MIN_RELATIVE_DIFF) {
    // Limit hâli: iki genişliğin ortalaması dikdörtgen kesit gibi davranır.
    return uniformSpokeResistance({
      length, width: (widthIn + widthOut) / 2, thickness, rho,
    })
  }
  return ((rho * length) / (thickness * (widthOut - widthIn))) * Math.log(widthOut / widthIn)
}

/**
 * Termal iletim direnci — elektriksel bağıntının termal eşleniği.
 *
 *   R_th,s = L / (k_Cu·W·t)                      (dikdörtgen)
 *   R_th,s = L / [k_Cu·t·(W₂ − W₁)] · ln(W₂/W₁)  (taper)
 *
 * Yalnızca spoke bakırının bir boyutlu iletimidir.
 */
export function spokeThermalResistance({ length, widthIn, widthOut, thickness, k }) {
  if (!(length > 0) || !(thickness > 0) || !(k > 0)) return null
  const wIn = widthIn
  const wOut = widthOut ?? widthIn
  if (!(wIn > 0) || !(wOut > 0)) return null
  const rel = Math.abs(wOut - wIn) / Math.max(wIn, wOut)
  if (rel < TAPER_MIN_RELATIVE_DIFF) {
    return length / (k * ((wIn + wOut) / 2) * thickness)
  }
  return (length / (k * thickness * (wOut - wIn))) * Math.log(wOut / wIn)
}

/**
 * Eşit açılı N spoke için örtüşmesiz en büyük iç genişlik — geometrik ön
 * kontrol.
 *
 *   W_limit = 2r·sin(π/N) = D_pad·sin(π/N)
 *
 * Gerçek bakır polygon çözümü değildir; iç genişlik bu değere yaklaştıkça
 * thermal relief bağlantısı katı plane bağlantısına benzemeye başlar.
 */
export function overlapWidthLimit(padDiameter, spokeCount) {
  if (!(padDiameter > 0) || !Number.isInteger(spokeCount) || spokeCount < 1) return null
  return padDiameter * Math.sin(Math.PI / spokeCount)
}

/**
 * Pad çevresinin bakır spoke ile köprülenen oranı — gösterge.
 *
 *   F_bridge = N·W_inner / (π·D_pad)
 *
 * Lehimlenebilirlik ölçütü değildir.
 */
export function bridgeFraction(padDiameter, spokeCount, innerWidth) {
  if (!(padDiameter > 0) || !(innerWidth > 0)) return null
  if (!Number.isInteger(spokeCount) || spokeCount < 1) return null
  return (spokeCount * innerWidth) / (Math.PI * padDiameter)
}

/**
 * Thermal relief hesabı.
 *
 * @returns {object} { valid, results, spokes, checks, warnings, assumptions,
 *                     method } veya { error, ... }
 */
export function computeThermalRelief(input = {}) {
  const {
    current,
    temperature = 20,
    copperThickness,
    spokeCount = 4,
    spokeMode = SPOKE_UNIFORM,
    spokeLength,
    innerWidth,
    outerWidth,
    customSpokes = [],
    padDiameter,
    thermalGap,
    clearanceDiameter,
    deltaT = null,
    k = K_CU,
    maxVoltageDrop = null,
    maxPowerLoss = null,
    maxCurrentDensity = null,
    maxThermalResistance = null,
    limits = {},
    warnPercent = null,
    hasProfile = false,
  } = input

  if (!SPOKE_MODES.includes(spokeMode)) {
    return { error: TR_ERR_SPOKE_MODE, field: 'spokeMode', allowed: SPOKE_MODES }
  }

  const iBad = needPositive(current, 'current')
  if (iBad) return iBad
  if (!isNum(temperature)) return { error: TR_ERR_NOT_FINITE, field: 'temperature' }
  if (!isNum(k) || !(k > 0)) return { error: TR_ERR_NON_POSITIVE, field: 'k' }

  const rho = rhoCuAt(temperature)
  if (!isNum(rho) || !(rho > 0)) return { error: TR_ERR_NOT_FINITE, field: 'temperature' }

  // --- Geometri: plane açıklığı ve thermal gap ---
  const pad = optionalPositive(padDiameter, 'padDiameter')
  if (pad.error) return pad
  const gapIn = optionalPositive(thermalGap, 'thermalGap')
  if (gapIn.error) return gapIn
  const clearIn = optionalPositive(clearanceDiameter, 'clearanceDiameter')
  if (clearIn.error) return clearIn

  //   D_clear = D_pad + 2·G   ·   G = (D_clear − D_pad)/2
  let gap = gapIn.value
  let clearance = clearIn.value
  if (pad.value !== null && gap !== null && clearance === null) {
    clearance = pad.value + 2 * gap
  } else if (pad.value !== null && clearance !== null && gap === null) {
    if (clearance <= pad.value) {
      return {
        error: TR_ERR_GEOMETRY,
        variant: TR_VARIANT_CLEARANCE_UNDER_PAD,
        field: 'clearanceDiameter',
      }
    }
    gap = (clearance - pad.value) / 2
  } else if (pad.value !== null && clearance !== null && gap !== null && clearance <= pad.value) {
    return {
      error: TR_ERR_GEOMETRY,
      variant: TR_VARIANT_CLEARANCE_UNDER_PAD,
      field: 'clearanceDiameter',
    }
  }

  // Spoke uzunluğu verilmemişse ilk yaklaşım olarak thermal gap kullanılır;
  // bu bir varsayımdır ve sonuçta belirtilir.
  const lengthGiven = spokeLength !== null && spokeLength !== undefined && spokeLength !== ''
  const length = lengthGiven ? spokeLength : gap
  const lBad = needPositive(length, 'spokeLength')
  if (lBad) return lBad

  const tBad = needPositive(copperThickness, 'copperThickness')
  if (tBad) return tBad

  // --- Spoke listesi ---
  //
  // Üç kip de aynı iç gösterime indirgenir: her spoke kendi uzunluk, iç/dış
  // genişlik ve kalınlık değerini taşır. Böylece paralel çözüm tek yerde
  // yazılır ve kipe göre dallanmaz.
  let spokeDefs = []
  if (spokeMode === SPOKE_CUSTOM) {
    if (!Array.isArray(customSpokes) || customSpokes.length === 0) {
      return { error: TR_ERR_NO_SPOKES }
    }
    for (let i = 0; i < customSpokes.length; i += 1) {
      const sp = customSpokes[i]
      const l = sp.length ?? length
      const wi = sp.innerWidth
      const wo = sp.outerWidth ?? sp.innerWidth
      const th = sp.thickness ?? copperThickness
      for (const [value, field] of [[l, 'length'], [wi, 'innerWidth'], [wo, 'outerWidth'], [th, 'thickness']]) {
        if (!isNum(value)) return { error: TR_ERR_NOT_FINITE, index: i, field }
        if (!(value > 0)) return { error: TR_ERR_NON_POSITIVE, index: i, field }
      }
      spokeDefs.push({ length: l, innerWidth: wi, outerWidth: wo, thickness: th })
    }
  } else {
    if (!Number.isInteger(spokeCount) || spokeCount < 1) {
      return { error: TR_ERR_NOT_INTEGER, field: 'spokeCount' }
    }
    const wBad = needPositive(innerWidth, 'innerWidth')
    if (wBad) return wBad
    const wOut = spokeMode === SPOKE_TAPER ? outerWidth : innerWidth
    const oBad = needPositive(wOut, spokeMode === SPOKE_TAPER ? 'outerWidth' : 'innerWidth')
    if (oBad) return oBad

    spokeDefs = Array.from({ length: spokeCount }, () => ({
      length,
      innerWidth,
      outerWidth: wOut,
      thickness: copperThickness,
    }))
  }

  // --- Spoke başına elektriksel ve termal direnç ---
  const spokes = spokeDefs.map((sp) => {
    const R = taperSpokeResistance({
      length: sp.length,
      widthIn: sp.innerWidth,
      widthOut: sp.outerWidth,
      thickness: sp.thickness,
      rho,
    })
    const Rth = spokeThermalResistance({
      length: sp.length,
      widthIn: sp.innerWidth,
      widthOut: sp.outerWidth,
      thickness: sp.thickness,
      k,
    })
    return {
      ...sp,
      minWidth: Math.min(sp.innerWidth, sp.outerWidth),
      area: Math.min(sp.innerWidth, sp.outerWidth) * sp.thickness,
      R,
      Rth,
    }
  })

  if (spokes.some((sp) => !isNum(sp.R) || !(sp.R > 0) || !isNum(sp.Rth) || !(sp.Rth > 0))) {
    return { error: TR_ERR_NOT_FINITE, field: 'spokeResistance' }
  }

  // --- Paralel çözüm ---
  //   1/R_eq = Σ(1/R_i)     I_i = I·(1/R_i)/Σ(1/R_j)     V_i = I_i·R_i
  const sumG = spokes.reduce((acc, sp) => acc + 1 / sp.R, 0)
  const Req = 1 / sumG
  const sumGth = spokes.reduce((acc, sp) => acc + 1 / sp.Rth, 0)
  const RthEq = 1 / sumGth

  const detailed = spokes.map((sp) => {
    const I = (current * (1 / sp.R)) / sumG
    return {
      ...sp,
      current: I,
      voltageDrop: I * sp.R,
      power: I * I * sp.R,
      // Taper spokede en yüksek yerel akım yoğunluğu en dar kesittedir.
      currentDensity: I / sp.area,
    }
  })

  const voltageDrop = current * Req
  const powerTotal = detailed.reduce((acc, sp) => acc + sp.power, 0)
  const totalArea = detailed.reduce((acc, sp) => acc + sp.area, 0)
  const averageCurrentDensity = current / totalArea
  const maxLocalCurrentDensity = detailed.reduce(
    (acc, sp) => Math.max(acc, sp.currentDensity), 0,
  )
  const maxSpokeCurrent = detailed.reduce((acc, sp) => Math.max(acc, sp.current), 0)
  const minSpokeCurrent = detailed.reduce((acc, sp) => Math.min(acc, sp.current), Infinity)

  const thermalConductance = 1 / RthEq
  const heatFlow = isNum(deltaT) && deltaT > 0 ? deltaT / RthEq : null

  // --- Geometrik ön kontroller ---
  const count = detailed.length
  const overlapLimit = pad.value !== null ? overlapWidthLimit(pad.value, count) : null
  const widestInner = detailed.reduce((acc, sp) => Math.max(acc, sp.innerWidth), 0)
  const bridge = pad.value !== null ? bridgeFraction(pad.value, count, widestInner) : null

  // --- Kontroller ---
  const L = limits ?? {}
  const minSpokeWidth = detailed.reduce((acc, sp) => Math.min(acc, sp.minWidth), Infinity)

  const checks = [
    checkLimit({
      id: CHECK_SPOKE_WIDTH,
      actual: minSpokeWidth,
      required: L.minThermalSpokeWidth ?? L.minTraceWidth ?? null,
      direction: DIRECTION_MIN,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_THERMAL_GAP,
      actual: gap,
      required: L.minThermalGap ?? null,
      direction: DIRECTION_MIN,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    // Kullanıcı limit girmemişse bu konuda `ok` denmez: sınır yoksa kontrol
    // değerlendirilemez.
    checkLimit({
      id: CHECK_VOLTAGE_DROP,
      actual: voltageDrop,
      required: maxVoltageDrop,
      direction: DIRECTION_MAX,
      source: SOURCE_USER_RULE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_POWER_LOSS,
      actual: powerTotal,
      required: maxPowerLoss,
      direction: DIRECTION_MAX,
      source: SOURCE_USER_RULE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_CURRENT_DENSITY,
      actual: maxLocalCurrentDensity,
      required: maxCurrentDensity,
      direction: DIRECTION_MAX,
      source: SOURCE_USER_RULE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_THERMAL_RESISTANCE,
      actual: RthEq,
      required: maxThermalResistance,
      direction: DIRECTION_MAX,
      source: SOURCE_USER_RULE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_SPOKE_OVERLAP,
      actual: overlapLimit === null ? null : overlapLimit - widestInner,
      required: overlapLimit === null ? null : 0,
      direction: DIRECTION_MIN,
      source: SOURCE_GEOMETRY,
      warnPercent: null,
      detail: { overlapLimit, widestInner },
    }),
  ]

  // --- Uyarılar ---
  const warnings = []
  if (overlapLimit !== null && widestInner >= overlapLimit) {
    warnings.push({ code: TR_WARN_SPOKE_OVERLAP, limit: overlapLimit, width: widestInner })
  }
  if (count > 1 && maxSpokeCurrent > 0) {
    const spread = (maxSpokeCurrent - minSpokeCurrent) / maxSpokeCurrent
    if (spread > SHARING_IMBALANCE) {
      warnings.push({ code: TR_WARN_UNBALANCED_SHARING, spread })
    }
  }
  if (count === 1) warnings.push({ code: TR_WARN_SINGLE_SPOKE })

  const assumptions = [ASSUMPTION_ONE_DIMENSIONAL, ASSUMPTION_INDEPENDENT_HEATING]
  if (spokeMode !== SPOKE_CUSTOM) assumptions.push(ASSUMPTION_EQUAL_SHARING)
  if (!lengthGiven) assumptions.push(ASSUMPTION_SPOKE_LENGTH_FROM_GAP)
  if (overlapLimit !== null) assumptions.push(ASSUMPTION_GEOMETRIC_PRECHECK)
  if (!hasProfile) assumptions.push(ASSUMPTION_NO_FAB_PROFILE)

  const results = {
    rho,
    k,
    spokeCount: count,
    singleResistance: detailed[0].R,
    parallelResistance: Req,
    voltageDrop,
    powerTotal,
    // Çapraz kontrol: Σ(I_i²R_i) ile I²R_eq aynı olmalı. İkisi ayrı yollardan
    // hesaplanır ve ikisi de döner ki tutarsızlık görünür kalsın.
    powerFromEquivalent: current * current * Req,
    totalArea,
    averageCurrentDensity,
    maxLocalCurrentDensity,
    maxSpokeCurrent,
    minSpokeCurrent,
    singleThermalResistance: detailed[0].Rth,
    thermalResistance: RthEq,
    thermalConductance,
    heatFlow,
    deltaT: isNum(deltaT) ? deltaT : null,
    padDiameter: pad.value,
    thermalGap: gap,
    clearanceDiameter: clearance,
    spokeLength: length,
    overlapLimit,
    widestInnerWidth: widestInner,
    bridgeFraction: bridge,
    minSpokeWidth,
  }

  for (const [key, value] of Object.entries(results)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return { error: TR_ERR_NOT_FINITE, field: key }
    }
  }

  return {
    valid: true,
    spokeMode,
    inputs: {
      current, temperature, copperThickness, spokeCount: count, spokeMode,
      innerWidth, outerWidth, spokeLength: length, k, warnPercent,
    },
    results,
    spokes: detailed,
    checks,
    warnings,
    assumptions,
    method: METHOD_ELECTRICAL,
    thermalMethod: METHOD_THERMAL_1D,
  }
}

/**
 * Sweep: seçilen değişkene göre elektriksel direnç, gerilim düşümü ve termal
 * direnç. Farklı birimlerdeki büyüklükler aynı eksene zorlanmaz; ekran hangi
 * ölçüyü çizeceğini seçer.
 *
 * @param {string} field 'innerWidth' | 'spokeCount' | 'spokeLength' | 'copperThickness'
 */
export function buildThermalReliefSweep(base, field, from, to, steps = 41) {
  if (!isNum(from) || !isNum(to) || !Number.isInteger(steps) || steps < 2) return []
  const points = []
  for (let i = 0; i < steps; i += 1) {
    let x = from + ((to - from) * i) / (steps - 1)
    // Spoke sayısı tam sayıdır; ara değer üretilmez.
    if (field === 'spokeCount') x = Math.round(x)
    if (!(x > 0)) continue
    const patch = { [field]: x }
    // Eşit genişlikli kipte dış genişlik iç genişliği izler.
    if (field === 'innerWidth' && base.spokeMode !== SPOKE_TAPER) patch.outerWidth = x
    const r = computeThermalRelief({ ...base, ...patch })
    if (r.error) continue
    if (points.length > 0 && points[points.length - 1].x === x) continue
    points.push({
      x,
      resistance: r.results.parallelResistance,
      voltageDrop: r.results.voltageDrop,
      thermalResistance: r.results.thermalResistance,
      currentDensity: r.results.maxLocalCurrentDensity,
    })
  }
  return points
}
