import { describe, it, expect } from 'vitest'
import {
  computeStackup, layerBounds, findReferences, weightedDk, symmetryError, copperBalance,
  buildStackupSweep, buildToleranceSweep,
  LAYER_COPPER, LAYER_CORE, LAYER_PREPREG, LAYER_SOLDERMASK, LAYER_TYPES,
  ROLE_SIGNAL, ROLE_GROUND, ROLE_POWER, ROLE_MIXED_PLANE, ROLE_DIELECTRIC, ROLE_COATING,
  TOL_ABSOLUTE, TOL_PERCENT, TOL_MINMAX, TOL_MODES,
  METHOD_WORST_CASE,
  STACKUP_ERR_EMPTY, STACKUP_ERR_NOT_FINITE, STACKUP_ERR_NON_POSITIVE, STACKUP_ERR_NEGATIVE,
  STACKUP_ERR_LAYER_TYPE, STACKUP_ERR_LAYER_ROLE, STACKUP_ERR_TOLERANCE_MODE,
  STACKUP_ERR_TOLERANCE_ORDER, STACKUP_ERR_INVALID_ORDER,
  STACKUP_VARIANT_ADJACENT_COPPER,
  STACKUP_WARN_NO_REFERENCE, STACKUP_WARN_OUTER_DIELECTRIC, STACKUP_WARN_ODD_COPPER_SPLIT,
  STACKUP_WARN_NO_COVERAGE,
  ASSUMPTION_NO_FAB_PROFILE, ASSUMPTION_MIXED_PLANE_AS_REFERENCE,
  CHECK_LAYER_COUNT, CHECK_TOTAL_THICKNESS_MAX, CHECK_ASPECT_RATIO,
  CHECK_SYMMETRY, CHECK_COPPER_BALANCE, CHECK_REFERENCES,
} from './stackup'
import { STATUS_OK, STATUS_DANGER, STATUS_UNKNOWN } from './dfmCheck'
import { expectErrorShape } from './errorShape.testkit'

const mm = (x) => x * 1e-3

const cu = (role, name, coverage = null) => ({
  type: LAYER_COPPER, role, name, thickness: mm(0.035), copperCoveragePercent: coverage,
})
const mask = () => ({ type: LAYER_SOLDERMASK, role: ROLE_COATING, thickness: mm(0.02) })
const prepreg = (dk = null) => ({
  type: LAYER_PREPREG, role: ROLE_DIELECTRIC, thickness: mm(0.2), dielectricConstant: dk,
})
const core = (dk = null) => ({
  type: LAYER_CORE, role: ROLE_DIELECTRIC, thickness: mm(1), dielectricConstant: dk,
})

// Elle doğrulanan dört katmanlı yığın (brief §12.4), üstten alta:
//
//   Solder mask 0.02 · Cu L1 0.035 · Prepreg 0.20 · Cu L2 0.035 ·
//   Core 1.00 · Cu L3 0.035 · Prepreg 0.20 · Cu L4 0.035 · Solder mask 0.02
//
//   Dielektrik toplamı = 0.20 + 1.00 + 0.20 = 1.40 mm
//   Bakır toplamı      = 4 × 0.035          = 0.14 mm
//   Kaplama/mask       = 2 × 0.02           = 0.04 mm
//   Bitmiş toplam                            = 1.58 mm
function fourLayer() {
  return [
    mask(),
    cu(ROLE_SIGNAL, 'L1'),
    prepreg(4.3),
    cu(ROLE_GROUND, 'L2'),
    core(4.5),
    cu(ROLE_POWER, 'L3'),
    prepreg(4.3),
    cu(ROLE_SIGNAL, 'L4'),
    mask(),
  ]
}

describe('computeStackup — referans yığın', () => {
  const r = computeStackup({ layers: fourLayer() })

  it('dielektrik, bakır ve kaplama toplamlarını ayrı verir', () => {
    expect(r.valid).toBe(true)
    expect(r.results.dielectricTotal).toBeCloseTo(mm(1.4), 12)
    expect(r.results.copperTotal).toBeCloseTo(mm(0.14), 12)
    expect(r.results.surfaceTotal).toBeCloseTo(mm(0.04), 12)
  })

  it('bitmiş toplam kalınlığı verir', () => {
    expect(r.results.finishedTotal).toBeCloseTo(mm(1.58), 12)
    expect(r.results.totalNominal).toBeCloseTo(mm(1.58), 12)
  })

  it('bakır katman sayısını verir', () => {
    expect(r.results.copperCount).toBe(4)
  })

  it('yöntem worst-case tolerans toplamı olarak etiketlenir', () => {
    expect(r.method).toBe(METHOD_WORST_CASE)
  })

  it('tolerans verilmeyen yığında uçlar nominale eşittir', () => {
    expect(r.results.totalMin).toBeCloseTo(mm(1.58), 12)
    expect(r.results.totalMax).toBeCloseTo(mm(1.58), 12)
  })
})

describe('computeStackup — tolerans toplamı', () => {
  it('mutlak tolerans uçları toplanır', () => {
    // Core 1.00 mm ±0.10, prepregler ±0.02 → min 1.58 − 0.14 = 1.44,
    // max 1.58 + 0.14 = 1.72
    const layers = fourLayer().map((l) => {
      if (l.type === LAYER_CORE) return { ...l, tolerancePlus: mm(0.1), toleranceMinus: mm(0.1) }
      if (l.type === LAYER_PREPREG) return { ...l, tolerancePlus: mm(0.02), toleranceMinus: mm(0.02) }
      return l
    })
    const r = computeStackup({ layers })
    expect(r.results.totalMin).toBeCloseTo(mm(1.44), 12)
    expect(r.results.totalMax).toBeCloseTo(mm(1.72), 12)
  })

  it('yüzdesel tolerans uçları toplanır', () => {
    // Yalnızca core %10: min 1.58 − 0.10 = 1.48, max 1.58 + 0.10 = 1.68
    const layers = fourLayer().map((l) => (
      l.type === LAYER_CORE
        ? { ...l, toleranceMode: TOL_PERCENT, tolerancePlus: 10, toleranceMinus: 10 }
        : l
    ))
    const r = computeStackup({ layers })
    expect(r.results.totalMin).toBeCloseTo(mm(1.48), 12)
    expect(r.results.totalMax).toBeCloseTo(mm(1.68), 12)
  })

  it('min/max kipi doğrudan girilen uçları kullanır', () => {
    const layers = fourLayer().map((l) => (
      l.type === LAYER_CORE
        ? { ...l, toleranceMode: TOL_MINMAX, minimumThickness: mm(0.9), maximumThickness: mm(1.15) }
        : l
    ))
    const r = computeStackup({ layers })
    expect(r.results.totalMin).toBeCloseTo(mm(1.48), 12)
    expect(r.results.totalMax).toBeCloseTo(mm(1.73), 12)
  })

  it('ters min/max çifti reddedilir', () => {
    const layers = fourLayer().map((l) => (
      l.type === LAYER_CORE
        ? { ...l, toleranceMode: TOL_MINMAX, minimumThickness: mm(1.2), maximumThickness: mm(0.9) }
        : l
    ))
    const r = computeStackup({ layers })
    expect(r.error).toBe(STACKUP_ERR_TOLERANCE_ORDER)
    expectErrorShape(r, 'tolerance-order')
  })

  it('nominali aşan eksi tolerans reddedilir', () => {
    const layers = fourLayer().map((l) => (
      l.type === LAYER_CORE ? { ...l, toleranceMinus: mm(1.5) } : l
    ))
    expect(computeStackup({ layers }).error).toBe(STACKUP_ERR_NEGATIVE)
  })
})

describe('findReferences', () => {
  it('dış sinyal katmanı en yakın düzlemi alt tarafında bulur', () => {
    const layers = fourLayer()
    const refs = findReferences(layers, 1)
    expect(refs.upper).toBeNull()
    expect(refs.lower.index).toBe(3)
    expect(refs.lower.distance).toBeCloseTo(mm(0.2), 12)
  })

  it('iç sinyal katmanı için üst ve alt mesafe ayrı tutulur', () => {
    // mask · Cu-sig · prepreg · Cu-gnd · core · Cu-sig · prepreg · Cu-gnd · mask
    const layers = [
      mask(), cu(ROLE_SIGNAL, 'L1'), prepreg(), cu(ROLE_GROUND, 'L2'),
      core(), cu(ROLE_SIGNAL, 'L3'), prepreg(), cu(ROLE_GROUND, 'L4'), mask(),
    ]
    const refs = findReferences(layers, 5)
    expect(refs.upper.distance).toBeCloseTo(mm(1), 12)
    expect(refs.lower.distance).toBeCloseTo(mm(0.2), 12)
  })

  it('araya başka bir bakır katman girerse referans çifti sayılmaz', () => {
    // Sinyal ile düzlem arasında ikinci bir sinyal bakırı var.
    const layers = [
      mask(), cu(ROLE_SIGNAL, 'L1'), prepreg(), cu(ROLE_SIGNAL, 'L2'),
      prepreg(), cu(ROLE_GROUND, 'L3'), mask(),
    ]
    const refs = findReferences(layers, 1)
    expect(refs.lower).toBeNull()
    expect(refs.upper).toBeNull()
  })

  it('karışık düzlem referans sayılır', () => {
    const layers = [
      mask(), cu(ROLE_SIGNAL, 'L1'), prepreg(), cu(ROLE_MIXED_PLANE, 'L2'), mask(),
    ]
    expect(findReferences(layers, 1).lower.index).toBe(3)
  })

  it('yüzey kaplaması dielektrik mesafeye girmez', () => {
    const layers = fourLayer()
    const refs = findReferences(layers, 1)
    // Üstteki mask taranır ama mesafeye eklenmez; yol bakır bulamadan biter.
    expect(refs.upper).toBeNull()
  })
})

describe('computeStackup — sinyal katmanları', () => {
  it('dış sinyal katmanı için tek H, iç katman için H1 ve H2 döner', () => {
    const layers = [
      mask(), cu(ROLE_SIGNAL, 'L1'), prepreg(), cu(ROLE_GROUND, 'L2'),
      core(), cu(ROLE_SIGNAL, 'L3'), prepreg(), cu(ROLE_GROUND, 'L4'), mask(),
    ]
    const r = computeStackup({ layers })
    const outer = r.signals.find((sg) => sg.index === 1)
    const inner = r.signals.find((sg) => sg.index === 5)

    expect(outer.outer).toBe(true)
    expect(outer.H).toBeCloseTo(mm(0.2), 12)
    expect(inner.outer).toBe(false)
    expect(inner.H).toBeNull()
    expect(inner.H1).toBeCloseTo(mm(1), 12)
    expect(inner.H2).toBeCloseTo(mm(0.2), 12)
  })

  it('referansı olmayan sinyal katmanı bildirilir ve kontrol düşer', () => {
    const layers = [mask(), cu(ROLE_SIGNAL, 'L1'), prepreg(), cu(ROLE_SIGNAL, 'L2'), mask()]
    const r = computeStackup({ layers })
    expect(r.signals.every((sg) => !sg.hasReference)).toBe(true)
    expect(r.warnings.map((w) => w.code)).toContain(STACKUP_WARN_NO_REFERENCE)
    expect(r.checks.find((c) => c.id === CHECK_REFERENCES).status).toBe(STATUS_DANGER)
  })

  it('bütün sinyallerin referansı varsa kontrol geçer', () => {
    const r = computeStackup({ layers: fourLayer() })
    expect(r.checks.find((c) => c.id === CHECK_REFERENCES).status).toBe(STATUS_OK)
  })

  it('sinyal katmanı yoksa referans kontrolü değerlendirilmez', () => {
    const layers = [mask(), cu(ROLE_GROUND, 'L1'), core(), cu(ROLE_GROUND, 'L2'), mask()]
    const r = computeStackup({ layers })
    expect(r.checks.find((c) => c.id === CHECK_REFERENCES).status).toBe(STATUS_UNKNOWN)
  })
})

describe('weightedDk', () => {
  it('kalınlık ağırlıklı ortalama verir', () => {
    // (4.5×1.00 + 4.3×0.20) / 1.20 = 5.36/1.20 = 4.466666…
    const d = weightedDk([core(4.5), prepreg(4.3)])
    expect(d).toBeCloseTo((4.5 * 1 + 4.3 * 0.2) / 1.2, 12)
  })

  it('tek malzemede kendi değerini verir', () => {
    expect(weightedDk([core(4.5)])).toBeCloseTo(4.5, 12)
  })

  it('bir katmanın Dk değeri eksikse ortalama uydurulmaz', () => {
    expect(weightedDk([core(4.5), prepreg(null)])).toBeNull()
    expect(weightedDk([])).toBeNull()
    expect(weightedDk(null)).toBeNull()
  })
})

describe('symmetryError', () => {
  it('simetrik yığında hata sıfırdır', () => {
    const s = symmetryError(fourLayer())
    expect(s.max).toBeCloseTo(0, 12)
    expect(s.weighted).toBeCloseTo(0, 12)
  })

  it('asimetrik yığında en büyük göreli farkı verir', () => {
    // Üst prepreg 0.20, alt prepreg 0.30 → |0.1| / 0.25 = 0.4
    const layers = fourLayer()
    layers[6] = { ...layers[6], thickness: mm(0.3) }
    const s = symmetryError(layers)
    expect(s.max).toBeCloseTo(0.4, 12)
  })

  it('eş katman türleri farklıysa çiftte bildirilir', () => {
    const layers = fourLayer()
    layers[2] = { ...core(), thickness: mm(0.2) }
    const s = symmetryError(layers)
    expect(s.pairs.some((p) => p.typeMismatch)).toBe(true)
  })

  it('tek katmanlı yığında çökmez', () => {
    expect(symmetryError([cu(ROLE_SIGNAL, 'L1')]).max).toBe(0)
  })
})

describe('copperBalance', () => {
  it('doluluk girilmemişse gösterge üretilmez', () => {
    const b = copperBalance(fourLayer())
    expect(b.value).toBeNull()
    expect(b.missingCoverage).toBe(true)
  })

  it('eşit doluluk dengeli çıkar', () => {
    const layers = fourLayer().map((l) => (
      l.type === LAYER_COPPER ? { ...l, copperCoveragePercent: 80 } : l
    ))
    const b = copperBalance(layers)
    expect(b.value).toBeCloseTo(0, 12)
  })

  it('üst yüz daha dolu olduğunda gösterge büyür', () => {
    // Üst iki bakır %90, alt iki bakır %30 → |0.9−0.3|/(1.2) = %50
    const cov = [90, 90, 30, 30]
    let k = 0
    const layers = fourLayer().map((l) => (
      l.type === LAYER_COPPER ? { ...l, copperCoveragePercent: cov[k++] } : l
    ))
    const b = copperBalance(layers)
    expect(b.value).toBeCloseTo(50, 10)
  })

  it('tek sayıda bakır katmanda ortadaki hiçbir yarıya yazılmaz', () => {
    const layers = [
      mask(), cu(ROLE_SIGNAL, 'L1', 50), prepreg(), cu(ROLE_GROUND, 'L2', 50),
      prepreg(), cu(ROLE_SIGNAL, 'L3', 50), mask(),
    ]
    const b = copperBalance(layers)
    expect(b.oddSplit).toBe(true)
    expect(b.value).toBeCloseTo(0, 12)
  })

  it('bakır katman yoksa null döner', () => {
    expect(copperBalance([mask(), core(), mask()]).value).toBeNull()
  })
})

describe('computeStackup — kontroller', () => {
  it('profil yokken profile bağlı kontroller unknown döner', () => {
    const r = computeStackup({ layers: fourLayer() })
    expect(r.checks.find((c) => c.id === CHECK_LAYER_COUNT).status).toBe(STATUS_UNKNOWN)
    expect(r.checks.find((c) => c.id === CHECK_TOTAL_THICKNESS_MAX).status).toBe(STATUS_UNKNOWN)
    expect(r.assumptions).toContain(ASSUMPTION_NO_FAB_PROFILE)
  })

  it('katman sayısı üretici sınırını aşarsa danger döner', () => {
    const r = computeStackup({
      layers: fourLayer(), hasProfile: true, limits: { maxLayerCount: 2 },
    })
    expect(r.checks.find((c) => c.id === CHECK_LAYER_COUNT).status).toBe(STATUS_DANGER)
  })

  it('toplam kalınlık üretici aralığındaysa geçer', () => {
    const r = computeStackup({
      layers: fourLayer(),
      hasProfile: true,
      limits: { minBoardThickness: mm(0.8), maxBoardThickness: mm(2.4), maxLayerCount: 8 },
    })
    expect(r.checks.find((c) => c.id === CHECK_TOTAL_THICKNESS_MAX).status).toBe(STATUS_OK)
  })

  it('aspect ratio, kart kalınlığı ve en küçük matkaptan hesaplanır', () => {
    // 1.58 mm / 0.30 mm = 5.2667
    const r = computeStackup({
      layers: fourLayer(),
      drillDiameter: mm(0.3),
      hasProfile: true,
      limits: { maxPthAspectRatio: 8 },
    })
    expect(r.results.achievableAspect).toBeCloseTo(1.58 / 0.3, 9)
    expect(r.checks.find((c) => c.id === CHECK_ASPECT_RATIO).status).toBe(STATUS_OK)
  })

  it('matkap çapı girilmemişse üretici minimumu kullanılır', () => {
    const r = computeStackup({
      layers: fourLayer(), hasProfile: true, limits: { minMechanicalDrill: mm(0.2), maxPthAspectRatio: 8 },
    })
    expect(r.results.aspectDrill).toBeCloseTo(mm(0.2), 15)
    expect(r.results.achievableAspect).toBeCloseTo(7.9, 9)
  })

  it('simetri ve bakır dengesi sınırı kullanıcı girmezse değerlendirilmez', () => {
    const r = computeStackup({ layers: fourLayer() })
    expect(r.checks.find((c) => c.id === CHECK_SYMMETRY).status).toBe(STATUS_UNKNOWN)
    expect(r.checks.find((c) => c.id === CHECK_COPPER_BALANCE).status).toBe(STATUS_UNKNOWN)
  })

  it('kullanıcı simetri sınırı girince değerlendirilir', () => {
    const r = computeStackup({ layers: fourLayer(), symmetryLimitPercent: 5 })
    expect(r.checks.find((c) => c.id === CHECK_SYMMETRY).status).toBe(STATUS_OK)
  })

  it('dış yüzeyde dielektrik varsa uyarı verilir', () => {
    const layers = [core(), cu(ROLE_SIGNAL, 'L1'), prepreg(), cu(ROLE_GROUND, 'L2'), core()]
    const r = computeStackup({ layers })
    expect(r.warnings.map((w) => w.code)).toContain(STACKUP_WARN_OUTER_DIELECTRIC)
  })

  it('karışık düzlem kullanıldığında varsayım bildirilir', () => {
    const layers = [mask(), cu(ROLE_SIGNAL, 'L1'), prepreg(), cu(ROLE_MIXED_PLANE, 'L2'), mask()]
    const r = computeStackup({ layers })
    expect(r.assumptions).toContain(ASSUMPTION_MIXED_PLANE_AS_REFERENCE)
  })
})

describe('computeStackup — geçersiz girdiler', () => {
  it('boş yığın reddedilir', () => {
    const r = computeStackup({ layers: [] })
    expect(r.error).toBe(STACKUP_ERR_EMPTY)
    expectErrorShape(r, 'empty')
  })

  it('tanınmayan katman türü reddedilir', () => {
    const r = computeStackup({ layers: [{ type: 'resin', thickness: mm(0.1) }] })
    expect(r.error).toBe(STACKUP_ERR_LAYER_TYPE)
    expect(r.allowed).toEqual(LAYER_TYPES)
    expectErrorShape(r, 'layer-type')
  })

  it('tanınmayan rol reddedilir', () => {
    const r = computeStackup({
      layers: [{ type: LAYER_COPPER, role: 'shield', thickness: mm(0.035) }],
    })
    expect(r.error).toBe(STACKUP_ERR_LAYER_ROLE)
  })

  it('sıfır ve negatif kalınlık reddedilir', () => {
    expect(computeStackup({ layers: [{ type: LAYER_CORE, thickness: 0 }] }).error)
      .toBe(STACKUP_ERR_NON_POSITIVE)
    expect(computeStackup({ layers: [{ type: LAYER_CORE, thickness: mm(-1) }] }).error)
      .toBe(STACKUP_ERR_NON_POSITIVE)
  })

  it('sonlu olmayan kalınlık reddedilir', () => {
    expect(computeStackup({ layers: [{ type: LAYER_CORE, thickness: NaN }] }).error)
      .toBe(STACKUP_ERR_NOT_FINITE)
  })

  it('tanınmayan tolerans kipi reddedilir', () => {
    const r = computeStackup({
      layers: [{ type: LAYER_CORE, thickness: mm(1), toleranceMode: 'sigma' }],
    })
    expect(r.error).toBe(STACKUP_ERR_TOLERANCE_MODE)
    expect(r.allowed).toEqual(TOL_MODES)
  })

  it('arka arkaya iki bakır katman reddedilir', () => {
    const layers = [mask(), cu(ROLE_SIGNAL, 'L1'), cu(ROLE_GROUND, 'L2'), mask()]
    const r = computeStackup({ layers })
    expect(r.error).toBe(STACKUP_ERR_INVALID_ORDER)
    expect(r.variant).toBe(STACKUP_VARIANT_ADJACENT_COPPER)
    expect(r.index).toBe(2)
    expectErrorShape(r, 'adjacent-copper')
  })

  it('sonuçlarda NaN ya da Infinity bulunmaz', () => {
    const r = computeStackup({ layers: fourLayer(), drillDiameter: mm(0.3) })
    for (const v of Object.values(r.results)) {
      if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true)
    }
  })
})

describe('layerBounds', () => {
  it('tolerans verilmeyen katmanda uçlar nominale eşittir', () => {
    const b = layerBounds({ type: LAYER_CORE, thickness: mm(1) }, 0)
    expect(b.min).toBeCloseTo(mm(1), 15)
    expect(b.max).toBeCloseTo(mm(1), 15)
  })

  it('yüzdesel tolerans uçları', () => {
    const b = layerBounds({
      type: LAYER_CORE, thickness: mm(1), toleranceMode: TOL_PERCENT,
      tolerancePlus: 10, toleranceMinus: 10,
    }, 0)
    expect(b.min).toBeCloseTo(mm(0.9), 15)
    expect(b.max).toBeCloseTo(mm(1.1), 15)
  })

  it('mutlak kip varsayılandır', () => {
    const b = layerBounds({
      type: LAYER_CORE, thickness: mm(1), tolerancePlus: mm(0.05), toleranceMinus: mm(0.05),
    }, 0)
    expect(b.min).toBeCloseTo(mm(0.95), 15)
    expect(b.max).toBeCloseTo(mm(1.05), 15)
    expect(TOL_MODES[0]).toBe(TOL_ABSOLUTE)
  })
})

describe('sweep', () => {
  it('bir katmanın kalınlığı arttıkça toplam artar', () => {
    const base = { layers: fourLayer() }
    const pts = buildStackupSweep(base, 4, mm(0.2), mm(2), 21)
    expect(pts.length).toBe(21)
    for (let i = 1; i < pts.length; i += 1) {
      expect(pts[i].y).toBeGreaterThan(pts[i - 1].y)
    }
    // Core 1.00 mm iken toplam 1.58 mm olmalı
    const mid = buildStackupSweep(base, 4, mm(1), mm(1), 2)
    expect(mid[0].y).toBeCloseTo(mm(1.58), 12)
  })

  it('tolerans yüzdesi büyüdükçe uçlar açılır', () => {
    const pts = buildToleranceSweep({ layers: fourLayer() }, 0, 20, 21)
    expect(pts[0].yMin).toBeCloseTo(pts[0].yMax, 12)
    const last = pts[pts.length - 1]
    expect(last.yMin).toBeLessThan(last.yMax)
    // %20'de min = 1.58 × 0.8, max = 1.58 × 1.2
    expect(last.yMin).toBeCloseTo(mm(1.58) * 0.8, 12)
    expect(last.yMax).toBeCloseTo(mm(1.58) * 1.2, 12)
  })

  it('geçersiz sweep parametreleri boş dizi döner', () => {
    expect(buildStackupSweep({ layers: fourLayer() }, 99, 0, 1, 10)).toEqual([])
    expect(buildToleranceSweep({ layers: fourLayer() }, 0, 1, 1)).toEqual([])
  })
})
