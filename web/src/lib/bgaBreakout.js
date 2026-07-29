// BGA breakout geometrisi (spec §10.3).
//
// Bu motor otomatik yol çizen bir yazılım DEĞİLDİR. Yalnızca geometrik
// açıklığı hesaplar: landler arasından kaç iz geçebileceğini, dog-bone via
// yerleşiminin kenar boşluklarını ve mask geometrisini verir. Sonuç
// "route edilir" demez; seçilen geometrinin verilen sınırlar içinde
// geometrik olarak uygulanabilir görünüp görünmediğini söyler.
//
// Girişler SI: m. Çıkışlar SI: m ve boyutsuz oran/sayı.
//
// Modül saftır: React, DOM, depolama ve kullanıcıya görünen metin bilmez.

import {
  checkLimit, checkCapability,
  DIRECTION_MIN, DIRECTION_MAX,
  SOURCE_FAB_PROFILE, SOURCE_GEOMETRY,
} from './dfmCheck'

export const BGA_ERR_REQUIRED = 'required'
export const BGA_ERR_NOT_FINITE = 'not-finite'
export const BGA_ERR_NON_POSITIVE = 'non-positive'
export const BGA_ERR_NEGATIVE = 'negative'
export const BGA_ERR_NOT_INTEGER = 'not-integer'
export const BGA_ERR_GEOMETRY = 'geometry'
export const BGA_ERR_VIA_TYPE = 'via-type'

export const BGA_VARIANT_LAND_OVER_PITCH = 'land-over-pitch'
export const BGA_VARIANT_MASK_CLOSED = 'mask-closed'

// Via türü. Kabiliyet bayrakları üretici profilinden gelir; profilde tanımlı
// değilse ilgili kontrol `unknown` döner, `false` sayılmaz.
export const VIA_THROUGH = 'through'
export const VIA_BLIND = 'blind'
export const VIA_MICROVIA = 'microvia'
export const VIA_IN_PAD = 'via-in-pad'
export const VIA_TYPES = [VIA_THROUGH, VIA_BLIND, VIA_MICROVIA, VIA_IN_PAD]

export const METHOD_GEOMETRIC = 'geometric-exact'

export const ASSUMPTION_ORTHOGONAL_CHANNEL = 'orthogonal-channel'
export const ASSUMPTION_EQUAL_LANDS = 'equal-lands'
export const ASSUMPTION_CENTRED_VIA = 'centred-via'
export const ASSUMPTION_NO_ROUTER = 'no-router'
export const ASSUMPTION_NO_FAB_PROFILE = 'no-fab-profile'

export const BGA_WARN_MASK_WEB_NEGATIVE = 'mask-web-negative'
export const BGA_WARN_CHANNEL_INSUFFICIENT = 'channel-insufficient'
export const BGA_WARN_NECK_NON_POSITIVE = 'neck-non-positive'
export const BGA_WARN_VIA_PAD_OVER_MAX = 'via-pad-over-max'

export const CHECK_TRACE_WIDTH = 'traceWidth'
export const CHECK_TRACE_CLEARANCE = 'traceClearance'
export const CHECK_CHANNEL = 'channel'
export const CHECK_VIA_PAD = 'viaPad'
export const CHECK_VIA_DRILL = 'viaDrill'
export const CHECK_VIA_ASPECT = 'viaAspect'
export const CHECK_LAND_VIA = 'landVia'
export const CHECK_VIA_VIA = 'viaVia'
export const CHECK_MASK_WEB = 'maskWeb'
export const CHECK_NECK = 'neck'
export const CHECK_VIA_IN_PAD = 'viaInPad'

// Kanal sayımı bir `floor` işlemidir ve kayan nokta gürültüsüne duyarlıdır:
// 0.8 − 0.45 çıkarımı 0.35000000000000003 verir, buradan hesaplanan bölüm
// 1.9999999999 yerine 2.0000000001 de çıkabilir. Bağıl pay, tam sınırdaki
// geometriyi doğru tarafa yuvarlar.
const REL_EPS = 1e-9

function isNum(x) {
  return typeof x === 'number' && Number.isFinite(x)
}

function needPositive(value, field) {
  if (value === null || value === undefined || value === '') {
    return { error: BGA_ERR_REQUIRED, field }
  }
  if (!isNum(value)) return { error: BGA_ERR_NOT_FINITE, field }
  if (!(value > 0)) return { error: BGA_ERR_NON_POSITIVE, field }
  return null
}

function optionalNonNegative(value, field, fallback = 0) {
  if (value === null || value === undefined || value === '') return { value: fallback }
  if (!isNum(value)) return { error: BGA_ERR_NOT_FINITE, field }
  if (value < 0) return { error: BGA_ERR_NEGATIVE, field }
  return { value }
}

function optionalPositive(value, field) {
  if (value === null || value === undefined || value === '') return { value: null }
  if (!isNum(value)) return { error: BGA_ERR_NOT_FINITE, field }
  if (!(value > 0)) return { error: BGA_ERR_NON_POSITIVE, field }
  return { value }
}

/**
 * İki land arasındaki koridordan geçebilecek en fazla iz sayısı.
 *
 *   n(W + C) ≤ G − C   →   n_max = floor((G − C) / (W + C))
 *
 * Sonuç negatifse sıfıra sabitlenir: "eksi yol" diye bir şey yoktur.
 */
export function maxTraceCount(gap, traceWidth, clearance) {
  if (!isNum(gap) || !isNum(traceWidth) || !isNum(clearance)) return 0
  const denom = traceWidth + clearance
  if (!(denom > 0)) return 0
  const raw = (gap - clearance) / denom
  // Bağıl pay: 1.9999999997 gibi bir bölüm gerçekte 2'dir.
  const nudged = raw + Math.abs(raw) * REL_EPS
  return Math.max(0, Math.floor(nudged))
}

/**
 * BGA breakout geometrisi.
 *
 * @returns {object} { valid, inputs, results, checks, warnings, assumptions, method }
 *                   veya { error, ... }
 */
export function computeBgaBreakout(input = {}) {
  const {
    pitch,
    landDiameter,
    traceWidth,
    traceClearance,
    traceCount = 1,
    viaType = VIA_THROUGH,
    viaPadDiameter,
    viaDrillDiameter,
    landViaDistance,
    viaPitch,
    maskExpansion,
    viaDepth,
    limits = {},
    warnPercent = null,
    hasProfile = false,
  } = input

  if (!VIA_TYPES.includes(viaType)) {
    return { error: BGA_ERR_VIA_TYPE, field: 'viaType', allowed: VIA_TYPES }
  }

  for (const [value, field] of [
    [pitch, 'pitch'], [landDiameter, 'landDiameter'],
    [traceWidth, 'traceWidth'], [traceClearance, 'traceClearance'],
  ]) {
    const bad = needPositive(value, field)
    if (bad) return bad
  }

  if (!Number.isInteger(traceCount) || traceCount < 0) {
    return { error: BGA_ERR_NOT_INTEGER, field: 'traceCount' }
  }

  // Land, adımdan büyükse landler zaten üst üste biner; bu bir geometri
  // hatasıdır, negatif koridor olarak raporlanmaz.
  if (landDiameter >= pitch) {
    return {
      error: BGA_ERR_GEOMETRY,
      variant: BGA_VARIANT_LAND_OVER_PITCH,
      field: 'landDiameter',
      pitch,
      landDiameter,
    }
  }

  const viaPad = optionalPositive(viaPadDiameter, 'viaPadDiameter')
  if (viaPad.error) return viaPad
  const viaDrill = optionalPositive(viaDrillDiameter, 'viaDrillDiameter')
  if (viaDrill.error) return viaDrill
  const vPitch = optionalPositive(viaPitch, 'viaPitch')
  if (vPitch.error) return vPitch
  const depth = optionalPositive(viaDepth, 'viaDepth')
  if (depth.error) return depth

  let maskExp = 0
  if (maskExpansion !== null && maskExpansion !== undefined && maskExpansion !== '') {
    if (!isNum(maskExpansion)) return { error: BGA_ERR_NOT_FINITE, field: 'maskExpansion' }
    maskExp = maskExpansion
  }

  // --- Yatay kanal ---
  //   G = P − D_L
  //   W_max,1 = P − D_L − 2C
  //   M_channel = G − [nW + (n + 1)C]
  const gap = pitch - landDiameter
  const maxWidthSingle = gap - 2 * traceClearance
  const requiredSpace = traceCount * traceWidth + (traceCount + 1) * traceClearance
  const channelMargin = gap - requiredSpace
  const nMax = maxTraceCount(gap, traceWidth, traceClearance)

  // --- Diyagonal kanal ---
  //   P_diag = P·√2,  G_diag = P·√2 − D_L,  W_max,diag = P·√2 − D_L − 2C
  const diagPitch = pitch * Math.SQRT2
  const diagGap = diagPitch - landDiameter
  const maxWidthDiagonal = diagGap - 2 * traceClearance

  // --- Dog-bone via ---
  //   Via dört landin geometrik merkezindeyse d_LV = P/√2.
  //   İzin verilen en büyük via pad çapı: D_V,max = P·√2 − D_L − 2C
  //     (d_LV − (D_L + D_V)/2 ≥ C eşitsizliğinden çözülür)
  const centredDistance = pitch / Math.SQRT2
  const dLV = landViaDistance === null || landViaDistance === undefined || landViaDistance === ''
    ? centredDistance
    : landViaDistance
  if (!isNum(dLV) || !(dLV > 0)) {
    return { error: BGA_ERR_NON_POSITIVE, field: 'landViaDistance' }
  }
  const usedCentredDistance = landViaDistance === null
    || landViaDistance === undefined || landViaDistance === ''

  const maxViaPad = diagGap - 2 * traceClearance

  //   C_land_via = d_LV − (D_L + D_V)/2
  // Neck uzunluğu da aynı geometrik mesafedir; clearance ile karıştırılmaması
  // için ayrı adla döner.
  const landViaClearance = viaPad.value === null
    ? null
    : dLV - (landDiameter + viaPad.value) / 2
  const neckLength = landViaClearance

  //   C_via_via = P_via − (D_V1 + D_V2)/2 ; eşit via çaplarında P_via − D_V
  const viaViaClearance = vPitch.value === null || viaPad.value === null
    ? null
    : vPitch.value - viaPad.value

  // --- Solder mask ---
  //   D_mask = D_L + 2·E_mask ;  W_mask_web = P − D_mask
  const maskOpening = landDiameter + 2 * maskExp
  if (maskOpening <= 0) {
    return { error: BGA_ERR_GEOMETRY, variant: BGA_VARIANT_MASK_CLOSED, field: 'maskExpansion' }
  }
  const maskWeb = pitch - maskOpening

  // --- Via aspect ratio ---
  // Mikrovia ve kör via için üreticinin ayrı bir sınırı olur; hangi sınırın
  // kullanıldığı sonuçta döner.
  const isMicro = viaType === VIA_MICROVIA || viaType === VIA_BLIND
  const aspectLimit = isMicro
    ? (limits.maxMicroviaAspectRatio ?? null)
    : (limits.maxPthAspectRatio ?? null)
  const viaAspect = depth.value !== null && viaDrill.value !== null && viaDrill.value > 0
    ? depth.value / viaDrill.value
    : null

  // Lazerle açılan delik için ayrı minimum geçerlidir.
  const drillLimit = isMicro
    ? (limits.minLaserDrill ?? null)
    : (limits.minMechanicalDrill ?? null)

  // --- DFM kontrolleri ---
  //
  // BGA alanı için üretici ayrı (daha sıkı) sınır verebilir; verilmişse o
  // kullanılır, verilmemişse genel sınıra düşülür. İkisi de yoksa kontrol
  // `unknown` döner.
  const L = limits ?? {}
  const traceWidthLimit = L.minBgaTraceWidth ?? L.minTraceWidth ?? null
  const traceClearLimit = L.minBgaTraceClearance ?? L.minTraceSpace ?? null
  const viaPadLimit = L.minBgaViaPadDiameter ?? null
  const viaDrillLimit = L.minBgaDrillDiameter ?? drillLimit

  const checks = [
    checkLimit({
      id: CHECK_TRACE_WIDTH,
      actual: traceWidth,
      required: traceWidthLimit,
      direction: DIRECTION_MIN,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_TRACE_CLEARANCE,
      actual: traceClearance,
      required: traceClearLimit,
      direction: DIRECTION_MIN,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    // Koridor kontrolü geometriktir: üretici profiline ihtiyaç duymaz.
    // Gereken alan, mevcut boşluğu aşmamalıdır.
    checkLimit({
      id: CHECK_CHANNEL,
      actual: gap,
      required: requiredSpace,
      direction: DIRECTION_MIN,
      source: SOURCE_GEOMETRY,
      warnPercent,
      detail: { traceCount, nMax },
    }),
    checkLimit({
      id: CHECK_VIA_PAD,
      actual: viaPad.value,
      required: viaPadLimit,
      direction: DIRECTION_MIN,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_VIA_DRILL,
      actual: viaDrill.value,
      required: viaDrillLimit,
      direction: DIRECTION_MIN,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_VIA_ASPECT,
      actual: viaAspect,
      required: aspectLimit,
      direction: DIRECTION_MAX,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
      detail: { microvia: isMicro },
    }),
    checkLimit({
      id: CHECK_LAND_VIA,
      actual: landViaClearance,
      required: traceClearLimit,
      direction: DIRECTION_MIN,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_VIA_VIA,
      actual: viaViaClearance,
      required: traceClearLimit,
      direction: DIRECTION_MIN,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_MASK_WEB,
      actual: maskWeb,
      required: L.minSolderMaskWeb ?? null,
      direction: DIRECTION_MIN,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    // Dog-bone boynu geometrik olarak pozitif olmalı; sınır sıfırdır ve
    // üretici verisine ihtiyaç duymaz.
    checkLimit({
      id: CHECK_NECK,
      actual: neckLength,
      required: neckLength === null ? null : 0,
      direction: DIRECTION_MIN,
      source: SOURCE_GEOMETRY,
      warnPercent: null,
    }),
    checkCapability({
      id: CHECK_VIA_IN_PAD,
      required: viaType === VIA_IN_PAD,
      supported: L.viaInPadSupported ?? null,
    }),
  ]

  // --- Uyarılar ---
  const warnings = []
  if (channelMargin < 0) {
    warnings.push({ code: BGA_WARN_CHANNEL_INSUFFICIENT, requested: traceCount, nMax })
  }
  if (maskWeb < 0) warnings.push({ code: BGA_WARN_MASK_WEB_NEGATIVE, value: maskWeb })
  if (neckLength !== null && neckLength <= 0) {
    warnings.push({ code: BGA_WARN_NECK_NON_POSITIVE, value: neckLength })
  }
  if (viaPad.value !== null && viaPad.value > maxViaPad) {
    warnings.push({ code: BGA_WARN_VIA_PAD_OVER_MAX, value: viaPad.value, max: maxViaPad })
  }

  const assumptions = [ASSUMPTION_ORTHOGONAL_CHANNEL, ASSUMPTION_EQUAL_LANDS, ASSUMPTION_NO_ROUTER]
  if (usedCentredDistance) assumptions.push(ASSUMPTION_CENTRED_VIA)
  if (!hasProfile) assumptions.push(ASSUMPTION_NO_FAB_PROFILE)

  const results = {
    gap,
    maxWidthSingle,
    requiredSpace,
    channelMargin,
    nMax,
    diagPitch,
    diagGap,
    maxWidthDiagonal,
    landViaDistance: dLV,
    centredDistance,
    maxViaPad,
    landViaClearance,
    neckLength,
    viaViaClearance,
    maskOpening,
    maskWeb,
    viaAspect,
    viaAspectLimit: aspectLimit,
    viaType,
  }

  for (const [key, value] of Object.entries(results)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return { error: BGA_ERR_NOT_FINITE, field: key }
    }
  }

  return {
    valid: true,
    inputs: {
      pitch,
      landDiameter,
      traceWidth,
      traceClearance,
      traceCount,
      viaType,
      viaPadDiameter: viaPad.value,
      viaDrillDiameter: viaDrill.value,
      viaPitch: vPitch.value,
      viaDepth: depth.value,
      maskExpansion: maskExp,
      warnPercent,
    },
    results,
    checks,
    warnings,
    assumptions,
    method: METHOD_GEOMETRIC,
  }
}

/**
 * Sweep: seçilen değişkene göre tek iz için maksimum genişlik (yatay ve
 * diyagonal) ya da koridor marjı.
 *
 * @param {object} base   computeBgaBreakout girdisi
 * @param {string} field  'pitch' | 'landDiameter'
 */
export function buildBgaSweep(base, field, from, to, steps = 41) {
  if (!isNum(from) || !isNum(to) || !Number.isInteger(steps) || steps < 2) return []
  const points = []
  for (let i = 0; i < steps; i += 1) {
    const x = from + ((to - from) * i) / (steps - 1)
    if (!(x > 0)) continue
    const r = computeBgaBreakout({ ...base, [field]: x })
    if (r.error) continue
    points.push({
      x,
      y: r.results.maxWidthSingle,
      yDiagonal: r.results.maxWidthDiagonal,
      yMargin: r.results.channelMargin,
      nMax: r.results.nMax,
    })
  }
  return points
}
