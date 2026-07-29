import { describe, it, expect } from 'vitest'
import {
  computePadstack, drillDiameter, buildPadstackSweep,
  MODE_SYNTHESIS, MODE_ANALYSIS,
  HOLE_PTH, HOLE_NPTH, HOLE_TYPES,
  ASPECT_BASIS_DRILL, ASPECT_BASIS_FINISHED,
  METHOD_GEOMETRIC,
  PADSTACK_ERR_REQUIRED, PADSTACK_ERR_NOT_FINITE, PADSTACK_ERR_NON_POSITIVE,
  PADSTACK_ERR_NEGATIVE, PADSTACK_ERR_GEOMETRY, PADSTACK_ERR_MODE,
  PADSTACK_ERR_HOLE_TYPE, PADSTACK_ERR_ASPECT_BASIS,
  PADSTACK_VARIANT_PAD_UNDER_DRILL,
  WARN_WORST_RING_NEGATIVE, WARN_NOMINAL_OK_WORST_FAIL, WARN_MASK_WEB_NEGATIVE,
  ASSUMPTION_NO_FAB_PROFILE, ASSUMPTION_EQUAL_NEIGHBOUR, ASSUMPTION_PLATING_RADIAL,
  CHECK_DRILL_MIN, CHECK_RING_NOMINAL, CHECK_RING_WORST, CHECK_ASPECT_RATIO,
  CHECK_MASK_WEB, CHECK_COPPER_GAP, CHECK_FINISHED_HOLE_MIN,
} from './padstack'
import { STATUS_OK, STATUS_DANGER, STATUS_UNKNOWN, UNKNOWN_NO_LIMIT } from './dfmCheck'
import { expectErrorShape } from './errorShape.testkit'

// Motor SI ile çalışır; testin okunabilirliği için mm cinsinden yazılıp
// çevrilir. Beklenen değerler elle hesaplanmış sabit sayılardır — aynı
// denklemin ikinci kopyasıyla doğrulanmaz.
const mm = (x) => x * 1e-3

// Elle doğrulanan sentez örneği (brief §12.2):
//
//   D_finished = 0.30 mm, t_plating = 0.025 mm, A_process = 0.05 mm
//   D_drill  = 0.30 + 2×0.025 + 0.05 = 0.40 mm
//   A_R hedef = 0.15 mm
//   D_pad    = 0.40 + 2×0.15 = 0.70 mm
//   C_plane  = 0.20 mm
//   D_antipad = 0.70 + 2×0.20 = 1.10 mm
//
// Worst-case:
//   D_pad,min   = 0.70 − 0.025 = 0.675 mm
//   D_drill,max = 0.40 + 0.025 = 0.425 mm
//   A_R,min = (0.675 − 0.425)/2 − 0.05 = 0.125 − 0.05 = 0.075 mm

const synth = {
  mode: MODE_SYNTHESIS,
  holeType: HOLE_PTH,
  Dfinished: mm(0.3),
  tPlating: mm(0.025),
  Aprocess: mm(0.05),
  targetRing: mm(0.15),
  planeClearance: mm(0.2),
  padToleranceMinus: mm(0.025),
  drillTolerancePlus: mm(0.025),
  registrationTolerance: mm(0.05),
}

describe('drillDiameter', () => {
  it('kaplanmış delikte kaplama iki kez sayılır', () => {
    const r = drillDiameter({
      Dfinished: mm(0.3), tPlating: mm(0.025), Aprocess: mm(0.05), holeType: HOLE_PTH,
    })
    expect(r.Ddrill).toBeCloseTo(mm(0.4), 12)
  })

  it('kaplanmamış delikte kaplama hiç eklenmez', () => {
    const r = drillDiameter({
      Dfinished: mm(0.3), tPlating: mm(0.025), Aprocess: mm(0.05), holeType: HOLE_NPTH,
    })
    expect(r.Ddrill).toBeCloseTo(mm(0.35), 12)
    // Girilen kaplama sessizce kullanılmaz; etkin değeri sıfırdır
    expect(r.tPlating).toBe(0)
  })

  it('proses payı verilmezse sıfır sayılır', () => {
    const r = drillDiameter({ Dfinished: mm(0.3), tPlating: mm(0.025) })
    expect(r.Ddrill).toBeCloseTo(mm(0.35), 12)
  })

  it('geçersiz delik türü reddedilir', () => {
    const r = drillDiameter({ Dfinished: mm(0.3), holeType: 'blind' })
    expect(r.error).toBe(PADSTACK_ERR_HOLE_TYPE)
    expect(r.allowed).toEqual(HOLE_TYPES)
    expectErrorShape(r, 'hole-type')
  })

  it('bitmiş delik zorunludur', () => {
    const r = drillDiameter({ tPlating: mm(0.025) })
    expect(r.error).toBe(PADSTACK_ERR_REQUIRED)
    expect(r.field).toBe('Dfinished')
  })
})

describe('computePadstack — sentez modu', () => {
  const r = computePadstack(synth)

  it('matkap, pad ve antipad çaplarını verir', () => {
    expect(r.valid).toBe(true)
    expect(r.results.Ddrill).toBeCloseTo(mm(0.4), 12)
    expect(r.results.Dpad).toBeCloseTo(mm(0.7), 12)
    expect(r.results.Dantipad).toBeCloseTo(mm(1.1), 12)
  })

  it('nominal annular ring hedefle aynıdır', () => {
    expect(r.results.ringNominal).toBeCloseTo(mm(0.15), 12)
  })

  it('worst-case annular ring 0.075 mm çıkar', () => {
    expect(r.results.ringWorst).toBeCloseTo(mm(0.075), 12)
    expect(r.results.ringBreakout).toBe(false)
  })

  it('tolerans uçlarını ayrı ayrı verir', () => {
    expect(r.results.DpadMin).toBeCloseTo(mm(0.675), 12)
    expect(r.results.DdrillMax).toBeCloseTo(mm(0.425), 12)
  })

  it('yöntem tam geometrik bağıntı olarak etiketlenir', () => {
    expect(r.method).toBe(METHOD_GEOMETRIC)
  })

  it('kaplanmış delikte radyal kaplama varsayımı bildirilir', () => {
    expect(r.assumptions).toContain(ASSUMPTION_PLATING_RADIAL)
  })
})

describe('computePadstack — analiz modu', () => {
  const r = computePadstack({
    mode: MODE_ANALYSIS,
    Ddrill: mm(0.4),
    Dpad: mm(0.7),
    padToleranceMinus: mm(0.025),
    drillTolerancePlus: mm(0.025),
    registrationTolerance: mm(0.05),
  })

  it('sentez modu ile aynı ring sonuçlarını verir', () => {
    expect(r.results.ringNominal).toBeCloseTo(mm(0.15), 12)
    expect(r.results.ringWorst).toBeCloseTo(mm(0.075), 12)
  })

  it('bitmiş delik verilmemişse kaplamadan türetilir', () => {
    const a = computePadstack({
      mode: MODE_ANALYSIS, Ddrill: mm(0.4), Dpad: mm(0.7), tPlating: mm(0.025),
    })
    expect(a.results.Dfinished).toBeCloseTo(mm(0.35), 12)
  })

  it('kaplama da yoksa bitmiş delik null kalır ve kontrolü yapılmaz', () => {
    const a = computePadstack({ mode: MODE_ANALYSIS, Ddrill: mm(0.4), Dpad: mm(0.7) })
    expect(a.results.Dfinished).toBeNull()
    const c = a.checks.find((x) => x.id === CHECK_FINISHED_HOLE_MIN)
    expect(c.status).toBe(STATUS_UNKNOWN)
  })

  it('pad matkaptan küçükse açık geometri hatası döner', () => {
    const bad = computePadstack({ mode: MODE_ANALYSIS, Ddrill: mm(0.7), Dpad: mm(0.4) })
    expect(bad.error).toBe(PADSTACK_ERR_GEOMETRY)
    expect(bad.variant).toBe(PADSTACK_VARIANT_PAD_UNDER_DRILL)
    expectErrorShape(bad, 'pad-under-drill')
  })

  it('pad matkapla eşitse de reddedilir — ring sıfır bir padstack değildir', () => {
    const bad = computePadstack({ mode: MODE_ANALYSIS, Ddrill: mm(0.4), Dpad: mm(0.4) })
    expect(bad.error).toBe(PADSTACK_ERR_GEOMETRY)
  })
})

describe('computePadstack — worst-case ring negatif', () => {
  // Nominal 0.15 mm ring, ama registration toleransı 0.20 mm:
  //   A_R,min = 0.15 − 0.20 − (0.025+0.025)/2 = −0.075 mm  → breakout
  const r = computePadstack({ ...synth, registrationTolerance: mm(0.2) })

  it('negatif ring gizlenmez, açık değer olarak döner', () => {
    expect(r.valid).toBe(true)
    expect(r.results.ringWorst).toBeCloseTo(mm(-0.075), 12)
    expect(r.results.ringBreakout).toBe(true)
  })

  it('uyarı listesinde bildirilir', () => {
    expect(r.warnings.map((w) => w.code)).toContain(WARN_WORST_RING_NEGATIVE)
  })
})

describe('computePadstack — komşuluk geometrisi', () => {
  // Eşit padler: P = 1.0 mm, D_pad = 0.70 mm
  //   G_copper = 1.0 − 0.70 = 0.30 mm
  //   D_mask = 0.70 + 2×0.05 = 0.80 mm → W_web = 1.0 − 0.80 = 0.20 mm
  it('eşit çaplı padlerde bakır aralığı ve mask web', () => {
    const r = computePadstack({ ...synth, padPitch: mm(1), maskExpansion: mm(0.05) })
    expect(r.results.copperGap).toBeCloseTo(mm(0.3), 12)
    expect(r.results.Dmask).toBeCloseTo(mm(0.8), 12)
    expect(r.results.maskWeb).toBeCloseTo(mm(0.2), 12)
    expect(r.assumptions).toContain(ASSUMPTION_EQUAL_NEIGHBOUR)
  })

  // Farklı padler: D_pad2 = 0.50 mm
  //   G_copper = 1.0 − (0.70+0.50)/2 = 0.40 mm
  //   D_mask2 = 0.60 → W_web = 1.0 − (0.80+0.60)/2 = 0.30 mm
  it('farklı çaplı padlerde ortalama çap kullanılır', () => {
    const r = computePadstack({
      ...synth, padPitch: mm(1), neighbourPadDiameter: mm(0.5), maskExpansion: mm(0.05),
    })
    expect(r.results.copperGap).toBeCloseTo(mm(0.4), 12)
    expect(r.results.maskWeb).toBeCloseTo(mm(0.3), 12)
    expect(r.assumptions).not.toContain(ASSUMPTION_EQUAL_NEIGHBOUR)
  })

  // Delik kenar mesafesi: P_hole = 1.0 mm, D_drill = 0.40 mm → 0.60 mm
  it('delik kenar mesafesi', () => {
    const r = computePadstack({ ...synth, holePitch: mm(1) })
    expect(r.results.holeGap).toBeCloseTo(mm(0.6), 12)
  })

  it('adım verilmemişse komşuluk sonuçları hesaplanmaz, sıfır varsayılmaz', () => {
    const r = computePadstack(synth)
    expect(r.results.copperGap).toBeNull()
    expect(r.results.maskWeb).toBeNull()
    expect(r.results.holeGap).toBeNull()
  })

  it('negatif mask web uyarı üretir ama hesabı durdurmaz', () => {
    // P = 0.75 mm, D_mask = 0.80 mm → web = −0.05 mm
    const r = computePadstack({ ...synth, padPitch: mm(0.75), maskExpansion: mm(0.05) })
    expect(r.valid).toBe(true)
    expect(r.results.maskWeb).toBeCloseTo(mm(-0.05), 12)
    expect(r.warnings.map((w) => w.code)).toContain(WARN_MASK_WEB_NEGATIVE)
  })

  it('mask genişlemesi negatif olabilir (mask ile tanımlı pad)', () => {
    // D_mask = 0.70 − 2×0.025 = 0.65 mm
    const r = computePadstack({ ...synth, maskExpansion: mm(-0.025) })
    expect(r.valid).toBe(true)
    expect(r.results.Dmask).toBeCloseTo(mm(0.65), 12)
  })

  it('mask açıklığını tümüyle kapatan genişleme geometri hatasıdır', () => {
    const r = computePadstack({ ...synth, maskExpansion: mm(-0.5) })
    expect(r.error).toBe(PADSTACK_ERR_GEOMETRY)
    expectErrorShape(r, 'mask-closed')
  })
})

describe('computePadstack — aspect ratio', () => {
  // T = 1.6 mm; matkap tanımı 1.6/0.40 = 4, bitmiş delik tanımı 1.6/0.30 ≈ 5.333
  it('matkap çapı tanımı', () => {
    const r = computePadstack({ ...synth, boardThickness: mm(1.6) })
    expect(r.results.aspectRatio).toBeCloseTo(4, 12)
    expect(r.results.aspectBasis).toBe(ASPECT_BASIS_DRILL)
  })

  it('bitmiş delik tanımı ayrı sonuç verir ve hangisi kullanıldığı döner', () => {
    const r = computePadstack({
      ...synth, boardThickness: mm(1.6), aspectBasis: ASPECT_BASIS_FINISHED,
    })
    expect(r.results.aspectRatio).toBeCloseTo(16 / 3, 12)
    expect(r.results.aspectBasis).toBe(ASPECT_BASIS_FINISHED)
  })

  it('kart kalınlığı yoksa hesaplanmaz ve kontrolü unknown olur', () => {
    const r = computePadstack(synth)
    expect(r.results.aspectRatio).toBeNull()
    expect(r.checks.find((c) => c.id === CHECK_ASPECT_RATIO).status).toBe(STATUS_UNKNOWN)
  })

  it('geçersiz aspect ratio tanımı reddedilir', () => {
    const r = computePadstack({ ...synth, aspectBasis: 'barrel' })
    expect(r.error).toBe(PADSTACK_ERR_ASPECT_BASIS)
    expectErrorShape(r, 'aspect-basis')
  })
})

describe('computePadstack — üretici profili', () => {
  it('profil yokken hiçbir kontrol ok dönmez', () => {
    const r = computePadstack(synth)
    const decided = r.checks.filter((c) => c.status !== STATUS_UNKNOWN)
    expect(decided).toHaveLength(0)
    expect(r.checks.every((c) => c.variant === UNKNOWN_NO_LIMIT)).toBe(true)
    expect(r.assumptions).toContain(ASSUMPTION_NO_FAB_PROFILE)
  })

  it('profil sınırları verilince kontroller karara döner', () => {
    const r = computePadstack({
      ...synth,
      boardThickness: mm(1.6),
      padPitch: mm(1),
      maskExpansion: mm(0.05),
      hasProfile: true,
      limits: {
        minMechanicalDrill: mm(0.2),
        minFinishedHole: mm(0.15),
        minAnnularRing: mm(0.05),
        maxPthAspectRatio: 8,
        minSolderMaskWeb: mm(0.1),
        minCopperClearance: mm(0.1),
      },
    })
    expect(r.checks.find((c) => c.id === CHECK_DRILL_MIN).status).toBe(STATUS_OK)
    expect(r.checks.find((c) => c.id === CHECK_RING_NOMINAL).status).toBe(STATUS_OK)
    expect(r.checks.find((c) => c.id === CHECK_RING_WORST).status).toBe(STATUS_OK)
    expect(r.checks.find((c) => c.id === CHECK_ASPECT_RATIO).status).toBe(STATUS_OK)
    expect(r.checks.find((c) => c.id === CHECK_MASK_WEB).status).toBe(STATUS_OK)
    expect(r.checks.find((c) => c.id === CHECK_COPPER_GAP).status).toBe(STATUS_OK)
    expect(r.assumptions).not.toContain(ASSUMPTION_NO_FAB_PROFILE)
  })

  it('aspect ratio tavan kontrolüdür: sınırı aşınca danger', () => {
    const r = computePadstack({
      ...synth, boardThickness: mm(4), hasProfile: true, limits: { maxPthAspectRatio: 8 },
    })
    // 4.0 / 0.40 = 10 > 8
    expect(r.results.aspectRatio).toBeCloseTo(10, 12)
    expect(r.checks.find((c) => c.id === CHECK_ASPECT_RATIO).status).toBe(STATUS_DANGER)
  })

  it('nominal ring geçip worst-case geçmiyorsa uyarı üretilir', () => {
    // minAnnularRing = 0.10 mm: nominal 0.15 geçer, worst 0.075 geçmez
    const r = computePadstack({
      ...synth, hasProfile: true, limits: { minAnnularRing: mm(0.1) },
    })
    expect(r.checks.find((c) => c.id === CHECK_RING_NOMINAL).status).toBe(STATUS_OK)
    expect(r.checks.find((c) => c.id === CHECK_RING_WORST).status).toBe(STATUS_DANGER)
    expect(r.warnings.map((w) => w.code)).toContain(WARN_NOMINAL_OK_WORST_FAIL)
  })
})

describe('computePadstack — geçersiz girdiler', () => {
  const bad = [
    ['mod', { ...synth, mode: 'auto' }, PADSTACK_ERR_MODE],
    ['bitmiş delik eksik', { ...synth, Dfinished: null }, PADSTACK_ERR_REQUIRED],
    ['bitmiş delik sıfır', { ...synth, Dfinished: 0 }, PADSTACK_ERR_NON_POSITIVE],
    ['bitmiş delik negatif', { ...synth, Dfinished: mm(-0.3) }, PADSTACK_ERR_NON_POSITIVE],
    ['bitmiş delik NaN', { ...synth, Dfinished: NaN }, PADSTACK_ERR_NOT_FINITE],
    ['bitmiş delik Infinity', { ...synth, Dfinished: Infinity }, PADSTACK_ERR_NOT_FINITE],
    ['hedef ring eksik', { ...synth, targetRing: null }, PADSTACK_ERR_REQUIRED],
    ['hedef ring sıfır', { ...synth, targetRing: 0 }, PADSTACK_ERR_NON_POSITIVE],
    ['negatif tolerans', { ...synth, registrationTolerance: mm(-0.05) }, PADSTACK_ERR_NEGATIVE],
    ['negatif plane clearance', { ...synth, planeClearance: mm(-0.2) }, PADSTACK_ERR_NEGATIVE],
    ['negatif adım', { ...synth, padPitch: mm(-1) }, PADSTACK_ERR_NON_POSITIVE],
    ['analiz modunda matkap eksik', { mode: MODE_ANALYSIS, Dpad: mm(0.7) }, PADSTACK_ERR_REQUIRED],
    ['analiz modunda pad eksik', { mode: MODE_ANALYSIS, Ddrill: mm(0.4) }, PADSTACK_ERR_REQUIRED],
  ]

  it.each(bad)('%s reddedilir', (_label, input, code) => {
    const r = computePadstack(input)
    expect(r.error).toBe(code)
    expect(r.valid).toBeUndefined()
    expectErrorShape(r, _label)
  })

  it('hiçbir sonuç NaN ya da Infinity taşımaz', () => {
    const r = computePadstack({
      ...synth, boardThickness: mm(1.6), padPitch: mm(1), holePitch: mm(1),
    })
    for (const v of Object.values(r.results)) {
      if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true)
    }
  })
})

describe('buildPadstackSweep', () => {
  it('registration toleransı arttıkça worst-case ring düşer', () => {
    const pts = buildPadstackSweep(synth, 'registrationTolerance', 0, mm(0.2), 21)
    expect(pts.length).toBe(21)
    for (let i = 1; i < pts.length; i += 1) {
      expect(pts[i].y).toBeLessThan(pts[i - 1].y)
    }
    // x = 0 iken worst = nominal − (0.025+0.025)/2 = 0.125 mm
    expect(pts[0].y).toBeCloseTo(mm(0.125), 12)
    // x = 0.20 mm iken worst = 0.125 − 0.20 = −0.075 mm
    expect(pts[pts.length - 1].y).toBeCloseTo(mm(-0.075), 12)
  })

  it('matkap toleransı da süpürülebilir', () => {
    const pts = buildPadstackSweep(synth, 'drillTolerancePlus', 0, mm(0.1), 11)
    expect(pts.length).toBe(11)
    expect(pts[0].y).toBeGreaterThan(pts[10].y)
  })

  it('geçersiz sweep parametreleri boş dizi döner', () => {
    expect(buildPadstackSweep(synth, 'registrationTolerance', NaN, 1, 10)).toEqual([])
    expect(buildPadstackSweep(synth, 'registrationTolerance', 0, 1, 1)).toEqual([])
  })
})
