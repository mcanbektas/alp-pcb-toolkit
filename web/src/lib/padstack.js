// Padstack geometrisi ve üretim toleransları (spec §10.2, §5.1.8, §5.1.9).
// Girişler SI: m. Çıkışlar SI: m ve boyutsuz oran.
//
// Modül saftır: React, DOM, depolama ve kullanıcıya görünen metin bilmez.
//
// ANNULAR RING VE ASPECT RATIO BURADA YENİDEN TÜRETİLMEZ — ikisi de
// `via.js` içinde tanımlıdır ve ViaProperties ekranı onları kullanır. Aynı
// bağıntının ikinci bir kopyası, biri düzeltilip diğeri unutulduğunda iki
// aracın farklı sonuç vermesi demektir. Bu dosya `annularRing()` ve
// `aspectRatio()` çağırır; kendi formülünü yazmaz.
//
// TOLERANS SÖZLEŞMESİ — bütün tolerans alanları **tek yönlü** değerlerdir,
// tam aralık değil. `drillTolerancePlus = 0.025` "matkap nominalin 0.025 m
// üstüne çıkabilir" demektir, "toplam aralık 0.025 m" demek değildir. Ekran
// bunu kullanıcıya açıkça yazar; motor burada varsayar.

import { annularRing, aspectRatio } from './via'
import {
  checkLimit, decidingMinimum,
  DIRECTION_MIN, DIRECTION_MAX,
  SOURCE_FAB_PROFILE, SOURCE_USER_RULE,
  STATUS_OK, STATUS_DANGER,
} from './dfmCheck'

export const PADSTACK_ERR_REQUIRED = 'required'
export const PADSTACK_ERR_NOT_FINITE = 'not-finite'
export const PADSTACK_ERR_NON_POSITIVE = 'non-positive'
export const PADSTACK_ERR_NEGATIVE = 'negative'
export const PADSTACK_ERR_GEOMETRY = 'geometry'
export const PADSTACK_ERR_MODE = 'mode'
export const PADSTACK_ERR_HOLE_TYPE = 'hole-type'
export const PADSTACK_ERR_ASPECT_BASIS = 'aspect-basis'

// İzinli değer listesi hata yükünde `allowed` adıyla döner, `valid` adıyla
// değil: başarılı sonuç `valid: true` bayrağı taşıyor ve iki alan aynı adı
// paylaşırsa `if (r.valid)` yazan taraf hata nesnesinde truthy bir dizi görür.
// (`thicknessRecords.js` / `dfmProfile.js` `valid` kullanır; onların başarı
// yükünde böyle bir bayrak yok, çakışma da yok.)
//
// Aynı kodun birden çok durumu varsa `variant` ayırır.
export const PADSTACK_VARIANT_PAD_UNDER_DRILL = 'pad-under-drill'

export const MODE_SYNTHESIS = 'synthesis'
export const MODE_ANALYSIS = 'analysis'
export const MODES = [MODE_SYNTHESIS, MODE_ANALYSIS]

// Kaplanmış delik bakır kaplama taşır; kaplanmamış delik taşımaz. Kaplama
// kalınlığı **radyaldir**: çap iki katı kadar küçülür.
export const HOLE_PTH = 'pth'
export const HOLE_NPTH = 'npth'
export const HOLE_TYPES = [HOLE_PTH, HOLE_NPTH]

// Üreticiler aspect ratio'yu iki farklı çapla tanımlar; hangisi kullanıldıysa
// sonuçla birlikte döner (via.js `basis` alanı).
export const ASPECT_BASIS_DRILL = 'drill'
export const ASPECT_BASIS_FINISHED = 'finished'
export const ASPECT_BASES = [ASPECT_BASIS_DRILL, ASPECT_BASIS_FINISHED]

// Yöntem etiketi: bu motorun tamamı tam geometrik bağıntıdır — ampirik
// katsayı, eğri uydurma ya da tablo içermez.
export const METHOD_GEOMETRIC = 'geometric-exact'

// Modelin yapamadıkları ve varsaydıkları. Kod taşır, cümle taşımaz; cümleyi
// ekranın text.js dosyası kurar.
export const ASSUMPTION_PLATING_RADIAL = 'plating-radial'
export const ASSUMPTION_TOLERANCE_ONE_SIDED = 'tolerance-one-sided'
export const ASSUMPTION_WORST_CASE_STACKED = 'worst-case-stacked'
export const ASSUMPTION_EQUAL_NEIGHBOUR = 'equal-neighbour'
export const ASSUMPTION_NO_FAB_PROFILE = 'no-fab-profile'

export const WARN_WORST_RING_NEGATIVE = 'worst-ring-negative'
export const WARN_NOMINAL_OK_WORST_FAIL = 'nominal-ok-worst-fail'
export const WARN_MASK_WEB_NEGATIVE = 'mask-web-negative'
export const WARN_COPPER_GAP_NEGATIVE = 'copper-gap-negative'

// Kontrol anahtarları — ekran metnini bu anahtarlarla seçer.
export const CHECK_DRILL_MIN = 'drillMin'
export const CHECK_FINISHED_HOLE_MIN = 'finishedHoleMin'
export const CHECK_RING_NOMINAL = 'ringNominal'
export const CHECK_RING_WORST = 'ringWorst'
export const CHECK_ASPECT_RATIO = 'aspectRatio'
export const CHECK_PLANE_CLEARANCE = 'planeClearance'
export const CHECK_MASK_WEB = 'maskWeb'
export const CHECK_COPPER_GAP = 'copperGap'
export const CHECK_HOLE_GAP = 'holeGap'

function isNum(x) {
  return typeof x === 'number' && Number.isFinite(x)
}

// Zorunlu alan: verilmiş, sonlu ve pozitif olmalı.
function needPositive(value, field) {
  if (value === null || value === undefined || value === '') {
    return { error: PADSTACK_ERR_REQUIRED, field }
  }
  if (!isNum(value)) return { error: PADSTACK_ERR_NOT_FINITE, field }
  if (!(value > 0)) return { error: PADSTACK_ERR_NON_POSITIVE, field }
  return null
}

// İsteğe bağlı alan: verilmemişse `fallback`, verilmişse sonlu ve negatif
// olmayan olmalı. Sıfır geçerlidir (tolerans sıfır olabilir).
function optionalNonNegative(value, field, fallback = 0) {
  if (value === null || value === undefined || value === '') return { value: fallback }
  if (!isNum(value)) return { error: PADSTACK_ERR_NOT_FINITE, field }
  if (value < 0) return { error: PADSTACK_ERR_NEGATIVE, field }
  return { value }
}

// İsteğe bağlı, tamamen atlanabilen pozitif alan (komşu pad, kart kalınlığı).
// Verilmemişse null döner ve ilgili sonuç hiç hesaplanmaz — sıfır varsayılmaz.
function optionalPositive(value, field) {
  if (value === null || value === undefined || value === '') return { value: null }
  if (!isNum(value)) return { error: PADSTACK_ERR_NOT_FINITE, field }
  if (!(value > 0)) return { error: PADSTACK_ERR_NON_POSITIVE, field }
  return { value }
}

/**
 * Nominal matkap çapı.
 *
 *   PTH:  D_drill = D_finished + 2·t_plating + A_process
 *   NPTH: D_drill = D_finished + A_process
 *
 * `t_plating` radyal kaplama kalınlığıdır; delik çapını iki katı kadar
 * küçültür, bu yüzden matkap iki katı kadar büyük açılır.
 */
export function drillDiameter({ Dfinished, tPlating = 0, Aprocess = 0, holeType = HOLE_PTH }) {
  if (!HOLE_TYPES.includes(holeType)) {
    return { error: PADSTACK_ERR_HOLE_TYPE, field: 'holeType', allowed: HOLE_TYPES }
  }
  const bad = needPositive(Dfinished, 'Dfinished')
  if (bad) return bad
  const plating = optionalNonNegative(tPlating, 'tPlating')
  if (plating.error) return plating
  const process = optionalNonNegative(Aprocess, 'Aprocess')
  if (process.error) return process

  // Kaplanmamış delikte kaplama payı hiç eklenmez; girilen değer sessizce
  // kullanılmaz, etkin değeri sıfırdır.
  const effectivePlating = holeType === HOLE_PTH ? plating.value : 0
  const Ddrill = Dfinished + 2 * effectivePlating + process.value

  return {
    Ddrill,
    Dfinished,
    tPlating: effectivePlating,
    Aprocess: process.value,
    holeType,
  }
}

/**
 * Padstack hesabı.
 *
 * Sentez modu: bitmiş delik + hedef annular ring verilir, matkap/pad/antipad/
 * mask açıklığı türetilir.
 * Analiz modu: gerçek matkap ve pad çapı verilir, nominal ve worst-case
 * annular ring hesaplanır.
 *
 * Bütün uzunluklar SI (m). Sonuçta yuvarlama yoktur.
 *
 * @returns {object} { valid, mode, inputs, results, checks, warnings,
 *                     assumptions, method } veya { error, ... }
 */
export function computePadstack(input = {}) {
  const {
    mode = MODE_SYNTHESIS,
    holeType = HOLE_PTH,
    Dfinished,
    tPlating,
    Aprocess,
    Ddrill: DdrillInput,
    Dpad: DpadInput,
    targetRing,
    drillTolerancePlus,
    drillToleranceMinus,
    padTolerancePlus,
    padToleranceMinus,
    registrationTolerance,
    planeClearance,
    maskExpansion,
    padPitch,
    neighbourPadDiameter,
    holePitch,
    neighbourDrillDiameter,
    boardThickness,
    aspectBasis = ASPECT_BASIS_DRILL,
    limits = {},
    warnPercent = null,
    hasProfile = false,
  } = input

  if (!MODES.includes(mode)) {
    return { error: PADSTACK_ERR_MODE, field: 'mode', allowed: MODES }
  }
  if (!ASPECT_BASES.includes(aspectBasis)) {
    return { error: PADSTACK_ERR_ASPECT_BASIS, field: 'aspectBasis', allowed: ASPECT_BASES }
  }

  // --- Matkap çapı ---
  let drill
  if (mode === MODE_SYNTHESIS) {
    drill = drillDiameter({ Dfinished, tPlating, Aprocess, holeType })
    if (drill.error) return drill
  } else {
    const bad = needPositive(DdrillInput, 'Ddrill')
    if (bad) return bad
    // Analiz modunda bitmiş delik isteğe bağlıdır: verilmişse aspect ratio'nun
    // bitmiş delik tanımı da hesaplanabilir.
    const finished = optionalPositive(Dfinished, 'Dfinished')
    if (finished.error) return finished
    const plating = optionalNonNegative(tPlating, 'tPlating')
    if (plating.error) return plating
    drill = {
      Ddrill: DdrillInput,
      // Bitmiş delik verilmemişse kaplamadan geriye türetilir; kaplama da
      // yoksa null kalır ve bitmiş deliğe bağlı kontroller yapılmaz.
      Dfinished: finished.value ?? (
        holeType === HOLE_PTH && plating.value > 0
          ? DdrillInput - 2 * plating.value
          : null
      ),
      tPlating: holeType === HOLE_PTH ? plating.value : 0,
      Aprocess: 0,
      holeType,
    }
  }

  const { Ddrill } = drill

  // --- Toleranslar ---
  const tolDrillPlus = optionalNonNegative(drillTolerancePlus, 'drillTolerancePlus')
  if (tolDrillPlus.error) return tolDrillPlus
  const tolDrillMinus = optionalNonNegative(drillToleranceMinus, 'drillToleranceMinus')
  if (tolDrillMinus.error) return tolDrillMinus
  const tolPadPlus = optionalNonNegative(padTolerancePlus, 'padTolerancePlus')
  if (tolPadPlus.error) return tolPadPlus
  const tolPadMinus = optionalNonNegative(padToleranceMinus, 'padToleranceMinus')
  if (tolPadMinus.error) return tolPadMinus
  const tolReg = optionalNonNegative(registrationTolerance, 'registrationTolerance')
  if (tolReg.error) return tolReg

  // --- Pad çapı ---
  let Dpad
  let ringTarget = null
  if (mode === MODE_SYNTHESIS) {
    const bad = needPositive(targetRing, 'targetRing')
    if (bad) return bad
    ringTarget = targetRing
    // D_pad = D_drill + 2·A_R
    Dpad = Ddrill + 2 * targetRing
  } else {
    const bad = needPositive(DpadInput, 'Dpad')
    if (bad) return bad
    Dpad = DpadInput
    if (Dpad <= Ddrill) {
      return {
        error: PADSTACK_ERR_GEOMETRY,
        variant: PADSTACK_VARIANT_PAD_UNDER_DRILL,
        field: 'Dpad',
        Dpad,
        Ddrill,
      }
    }
  }

  // --- Annular ring (via.js) ---
  //
  // Worst-case sözleşmesi:
  //   A_R,min = (D_pad,min − D_drill,max)/2 − E_registration
  //   D_pad,min  = D_pad  − padToleranceMinus
  //   D_drill,max = D_drill + drillTolerancePlus
  // Cebirsel olarak:
  //   A_R,min = A_R,nominal − (padToleranceMinus + drillTolerancePlus)/2 − E_reg
  // via.js `annularRing` tam bu biçimi verir: nominal − positionTol − etchTol.
  // Çap toleransları ringi yarısı kadar etkiler (çap → yarıçap), bu yüzden
  // ikisinin toplamı ikiye bölünerek geçirilir.
  const diameterTolTerm = (tolPadMinus.value + tolDrillPlus.value) / 2
  const ring = annularRing({
    Dpad,
    Ddrill,
    positionTol: tolReg.value,
    etchTol: diameterTolTerm,
  })
  if (ring.error) {
    return { error: PADSTACK_ERR_GEOMETRY, variant: PADSTACK_VARIANT_PAD_UNDER_DRILL, Dpad, Ddrill }
  }

  const DpadMin = Dpad - tolPadMinus.value
  const DpadMax = Dpad + tolPadPlus.value
  const DdrillMin = Ddrill - tolDrillMinus.value
  const DdrillMax = Ddrill + tolDrillPlus.value

  // --- Antipad, mask, komşuluk ---
  const plane = optionalNonNegative(planeClearance, 'planeClearance')
  if (plane.error) return plane
  // Mask genişlemesi negatif olabilir: mask ile tanımlı padde açıklık pad'den
  // küçüktür. Bu yüzden `optionalNonNegative` kullanılmaz.
  let maskExp = 0
  if (maskExpansion !== null && maskExpansion !== undefined && maskExpansion !== '') {
    if (!isNum(maskExpansion)) return { error: PADSTACK_ERR_NOT_FINITE, field: 'maskExpansion' }
    maskExp = maskExpansion
  }

  const Dantipad = Dpad + 2 * plane.value
  const Dmask = Dpad + 2 * maskExp
  if (Dmask <= 0) {
    return { error: PADSTACK_ERR_GEOMETRY, field: 'maskExpansion', Dmask }
  }

  const pitch = optionalPositive(padPitch, 'padPitch')
  if (pitch.error) return pitch
  const neighbourPad = optionalPositive(neighbourPadDiameter, 'neighbourPadDiameter')
  if (neighbourPad.error) return neighbourPad
  const hPitch = optionalPositive(holePitch, 'holePitch')
  if (hPitch.error) return hPitch
  const neighbourDrill = optionalPositive(neighbourDrillDiameter, 'neighbourDrillDiameter')
  if (neighbourDrill.error) return neighbourDrill

  // Komşu pad çapı verilmemişse eşit kabul edilir; bu bir varsayımdır ve
  // sonuçta belirtilir.
  const Dpad2 = neighbourPad.value ?? Dpad
  const Dmask2 = Dpad2 + 2 * maskExp
  const Ddrill2 = neighbourDrill.value ?? Ddrill

  //   G_copper    = P − (D_pad1 + D_pad2)/2
  //   W_mask_web  = P − (D_mask1 + D_mask2)/2
  //   G_hole      = P_hole − (D_drill1 + D_drill2)/2
  const copperGap = pitch.value === null ? null : pitch.value - (Dpad + Dpad2) / 2
  const maskWeb = pitch.value === null ? null : pitch.value - (Dmask + Dmask2) / 2
  const holeGap = hPitch.value === null ? null : hPitch.value - (Ddrill + Ddrill2) / 2

  // --- Aspect ratio (via.js) ---
  const board = optionalPositive(boardThickness, 'boardThickness')
  if (board.error) return board

  const aspectDiameter = aspectBasis === ASPECT_BASIS_FINISHED ? drill.Dfinished : Ddrill
  let aspect = null
  if (board.value !== null && isNum(aspectDiameter) && aspectDiameter > 0) {
    const a = aspectRatio({ boardThickness: board.value, diameter: aspectDiameter, basis: aspectBasis })
    // via.js geçersiz girdide NaN döner; buraya yalnızca geçerli girdi gelir
    if (a && isNum(a.ratio)) aspect = a
  }

  // --- DFM kontrolleri ---
  //
  // Sınır tanımlı değilse kontrol `unknown` döner. Profil yokken hiçbir
  // kontrol `ok` olmaz — dayanaksız uygunluk iddiası üretilmez.
  const L = limits ?? {}
  const checks = [
    checkLimit({
      id: CHECK_DRILL_MIN,
      actual: Ddrill,
      required: L.minMechanicalDrill ?? null,
      direction: DIRECTION_MIN,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_FINISHED_HOLE_MIN,
      actual: drill.Dfinished,
      required: L.minFinishedHole ?? null,
      direction: DIRECTION_MIN,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_RING_NOMINAL,
      actual: ring.nominal,
      required: L.minAnnularRing ?? null,
      direction: DIRECTION_MIN,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_RING_WORST,
      actual: ring.worst,
      required: L.minAnnularRing ?? null,
      direction: DIRECTION_MIN,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_ASPECT_RATIO,
      actual: aspect ? aspect.ratio : null,
      required: L.maxPthAspectRatio ?? null,
      direction: DIRECTION_MAX,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
      detail: aspect ? { basis: aspect.basis } : null,
    }),
    checkLimit({
      id: CHECK_PLANE_CLEARANCE,
      actual: planeClearance === null || planeClearance === undefined || planeClearance === ''
        ? null
        : plane.value,
      required: L.minPlaneClearance ?? null,
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
    checkLimit({
      id: CHECK_COPPER_GAP,
      actual: copperGap,
      required: L.minCopperClearance ?? null,
      direction: DIRECTION_MIN,
      source: SOURCE_FAB_PROFILE,
      warnPercent,
    }),
    checkLimit({
      id: CHECK_HOLE_GAP,
      actual: holeGap,
      // Delik kenar mesafesi için ayrı bir üretici alanı yoktur; bakır
      // aralığı sınırı kullanılır ve kaynağı kullanıcı kuralı sayılır.
      required: L.minCopperClearance ?? null,
      direction: DIRECTION_MIN,
      source: SOURCE_USER_RULE,
      warnPercent,
    }),
  ]

  // --- Uyarılar ---
  const warnings = []
  if (ring.worst < 0) warnings.push({ code: WARN_WORST_RING_NEGATIVE, value: ring.worst })
  if (maskWeb !== null && maskWeb < 0) warnings.push({ code: WARN_MASK_WEB_NEGATIVE, value: maskWeb })
  if (copperGap !== null && copperGap < 0) {
    warnings.push({ code: WARN_COPPER_GAP_NEGATIVE, value: copperGap })
  }
  // Nominal ring sınırı geçip worst-case geçmiyorsa sonuç tehlikedir; nominal
  // sonucun yeşil görünmesi kararı yanıltmasın.
  const nominalCheck = checks.find((c) => c.id === CHECK_RING_NOMINAL)
  const worstCheck = checks.find((c) => c.id === CHECK_RING_WORST)
  if (nominalCheck.status === STATUS_OK && worstCheck.status === STATUS_DANGER) {
    warnings.push({ code: WARN_NOMINAL_OK_WORST_FAIL })
  }

  // --- Varsayımlar ---
  const assumptions = [ASSUMPTION_TOLERANCE_ONE_SIDED, ASSUMPTION_WORST_CASE_STACKED]
  if (holeType === HOLE_PTH) assumptions.push(ASSUMPTION_PLATING_RADIAL)
  if (pitch.value !== null && neighbourPad.value === null) {
    assumptions.push(ASSUMPTION_EQUAL_NEIGHBOUR)
  }
  if (!hasProfile) assumptions.push(ASSUMPTION_NO_FAB_PROFILE)

  const results = {
    Ddrill,
    DdrillMin,
    DdrillMax,
    Dfinished: drill.Dfinished,
    tPlating: drill.tPlating,
    Aprocess: drill.Aprocess,
    Dpad,
    DpadMin,
    DpadMax,
    ringNominal: ring.nominal,
    ringWorst: ring.worst,
    ringBreakout: ring.breakout,
    ringTarget,
    Dantipad,
    planeClearance: plane.value,
    Dmask,
    maskExpansion: maskExp,
    copperGap,
    maskWeb,
    holeGap,
    aspectRatio: aspect ? aspect.ratio : null,
    aspectBasis: aspect ? aspect.basis : aspectBasis,
    // Belirleyici ring sınırı — tek kaynak var ama sözleşme diğer araçlarla
    // aynı kalsın diye aynı biçimde döner.
    ringLimit: decidingMinimum([
      { value: L.minAnnularRing ?? null, source: SOURCE_FAB_PROFILE },
    ]),
  }

  // Hiçbir sonuç NaN ya da Infinity olarak dışarı çıkmaz.
  for (const [key, value] of Object.entries(results)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return { error: PADSTACK_ERR_NOT_FINITE, field: key }
    }
  }

  return {
    valid: true,
    mode,
    holeType,
    inputs: {
      Dfinished: drill.Dfinished,
      tPlating: drill.tPlating,
      Aprocess: drill.Aprocess,
      targetRing: ringTarget,
      drillTolerancePlus: tolDrillPlus.value,
      drillToleranceMinus: tolDrillMinus.value,
      padTolerancePlus: tolPadPlus.value,
      padToleranceMinus: tolPadMinus.value,
      registrationTolerance: tolReg.value,
      padPitch: pitch.value,
      neighbourPadDiameter: Dpad2,
      holePitch: hPitch.value,
      neighbourDrillDiameter: Ddrill2,
      boardThickness: board.value,
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
 * Sweep: registration ya da matkap toleransı arttıkça worst-case annular
 * ring'in nasıl düştüğünü verir. Grafik katmanı bu diziyi çizer.
 *
 * @param {object} base    computePadstack girdisi
 * @param {string} field   'registrationTolerance' | 'drillTolerancePlus'
 * @param {number} from    başlangıç (m)
 * @param {number} to      bitiş (m)
 * @param {number} steps   nokta sayısı
 */
export function buildPadstackSweep(base, field, from, to, steps = 40) {
  if (!isNum(from) || !isNum(to) || !Number.isInteger(steps) || steps < 2) return []
  const points = []
  for (let i = 0; i < steps; i += 1) {
    const x = from + ((to - from) * i) / (steps - 1)
    if (x < 0) continue
    const r = computePadstack({ ...base, [field]: x })
    if (r.error) continue
    points.push({ x, y: r.results.ringWorst })
  }
  return points
}
