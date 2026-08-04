import { describe, it, expect } from 'vitest'
import {
  planeCapacitance, rectangleArea, capacitancePerArea, cavityModeFrequency,
  firstCavityModes, lowestCavityResonance, dielectricQ, totalQ, storedEnergy,
  dielectricWavelength, stitchingSpacingCheck, planeCavityAnalysis,
  PC_ERR_INVALID, PC_ERR_MODE_INDEX, PC_ERR_STITCHING_N,
} from './planeCavity'

describe('REV2 §11.11 referans testi', () => {
  // a = b = 100 mm, d = 0.1 mm, εr = 4, A = 0.01 m² (= a·b)
  const a = 0.1
  const b = 0.1
  const d = 0.1e-3
  const epsR = 4

  it('düzlem kapasitansı ≈ 3.54 nF', () => {
    const area = rectangleArea({ a, b })
    expect(area).toBeCloseTo(0.01, 12)
    const c = planeCapacitance({ epsR, area, d })
    expect(c * 1e9).toBeCloseTo(3.54, 2)
  })

  it('f10 = f01 ≈ 749.5 MHz', () => {
    const f10 = cavityModeFrequency({ m: 1, n: 0, a, b, epsR })
    const f01 = cavityModeFrequency({ m: 0, n: 1, a, b, epsR })
    expect(f10 / 1e6).toBeCloseTo(749.5, 1)
    expect(f01).toBe(f10) // a === b, simetrik girdide bit-eş sonuç
  })

  it('planeCavityAnalysis aynı senaryoda aynı sonuçları üretir', () => {
    const r = planeCavityAnalysis({ a, b, d, epsR, lossTangent: 0.02, mMax: 2, nMax: 2 })
    expect(r.ok).toBe(true)
    expect(r.capacitance * 1e9).toBeCloseTo(3.54, 2)
    expect(r.lowestResonance / 1e6).toBeCloseTo(749.5, 1)
  })
})

describe('düzlem kapasitansı', () => {
  it('geçersiz girdide NaN döner', () => {
    expect(Number.isNaN(planeCapacitance({ epsR: 0, area: 1, d: 1 }))).toBe(true)
    expect(Number.isNaN(planeCapacitance({ epsR: 4, area: -1, d: 1 }))).toBe(true)
    expect(Number.isNaN(planeCapacitance({ epsR: 4, area: 1, d: 0 }))).toBe(true)
  })
})

describe('alan başına kapasitans', () => {
  it('C/A oranına eşittir (REV2 §11.3 ↔ §11.4 tutarlılığı)', () => {
    const area = 0.01
    const d = 1e-4
    const epsR = 4
    const c = planeCapacitance({ epsR, area, d })
    const cPerArea = capacitancePerArea({ epsR, d })
    expect(cPerArea).toBeCloseTo(c / area, 15)
  })
})

describe('cavity mode frekansı', () => {
  it('m = n = 0 geçersizdir', () => {
    expect(Number.isNaN(cavityModeFrequency({ m: 0, n: 0, a: 0.1, b: 0.1, epsR: 4 }))).toBe(true)
  })

  it('negatif veya tam sayı olmayan mod indeksi NaN döner', () => {
    expect(Number.isNaN(cavityModeFrequency({ m: -1, n: 0, a: 0.1, b: 0.1, epsR: 4 }))).toBe(true)
    expect(Number.isNaN(cavityModeFrequency({ m: 1.5, n: 0, a: 0.1, b: 0.1, epsR: 4 }))).toBe(true)
  })

  it('f11, f10 ve f01 katkılarının kök toplamıdır', () => {
    const f10 = cavityModeFrequency({ m: 1, n: 0, a: 0.1, b: 0.2, epsR: 4 })
    const f01 = cavityModeFrequency({ m: 0, n: 1, a: 0.1, b: 0.2, epsR: 4 })
    const f11 = cavityModeFrequency({ m: 1, n: 1, a: 0.1, b: 0.2, epsR: 4 })
    expect(f11).toBeCloseTo(Math.sqrt(f10 ** 2 + f01 ** 2), 6)
  })
})

describe('firstCavityModes', () => {
  it('modları frekansa göre artan sırada döner, (0,0) hariç', () => {
    const r = firstCavityModes({ a: 0.1, b: 0.15, epsR: 4, mMax: 2, nMax: 2 })
    expect(r.error).toBeUndefined()
    expect(r.modes.some((mo) => mo.m === 0 && mo.n === 0)).toBe(false)
    for (let i = 1; i < r.modes.length; i++) {
      expect(r.modes[i].freq).toBeGreaterThanOrEqual(r.modes[i - 1].freq)
    }
  })

  it('limit verilirse ilk N modu döner', () => {
    const r = firstCavityModes({ a: 0.1, b: 0.15, epsR: 4, mMax: 4, nMax: 4, limit: 5 })
    expect(r.modes.length).toBe(5)
  })

  it('geçersiz mod indeksi hata döner', () => {
    expect(firstCavityModes({ a: 0.1, b: 0.1, epsR: 4, mMax: -1, nMax: 2 }).error)
      .toBe(PC_ERR_MODE_INDEX)
  })

  it('geçersiz geometri hata döner', () => {
    expect(firstCavityModes({ a: 0, b: 0.1, epsR: 4, mMax: 2, nMax: 2 }).error)
      .toBe(PC_ERR_INVALID)
  })
})

describe('dielektrik Q', () => {
  it('Q_d = 1/tanδ', () => {
    expect(dielectricQ({ lossTangent: 0.02 })).toBeCloseTo(50, 9)
  })

  it('toplam Q yalnızca üç bileşen de verilirse hesaplanır', () => {
    const qd = dielectricQ({ lossTangent: 0.02 })
    expect(totalQ({ qd })).toBeNull()
    expect(totalQ({ qd, qc: 100, qr: 200 })).toBeNull() // qLoading eksik
    const q = totalQ({ qd, qc: 100, qr: 200, qLoading: 300 })
    expect(q).toBeCloseTo(1 / (1 / 50 + 1 / 100 + 1 / 200 + 1 / 300), 9)
  })
})

describe('depolanan enerji', () => {
  it('E = ½CV²', () => {
    expect(storedEnergy({ capacitance: 1e-9, voltage: 3.3 })).toBeCloseTo(0.5 * 1e-9 * 3.3 ** 2, 15)
  })
})

describe('dielektrik dalga boyu ve stitching aralığı', () => {
  it('λ_d = c / (f·√εr)', () => {
    const lambda = dielectricWavelength({ frequency: 1e9, epsR: 4 })
    expect(lambda).toBeCloseTo(299792458 / (1e9 * 2), 9)
  })

  it('geçersiz N hata döner', () => {
    expect(stitchingSpacingCheck({ frequency: 1e9, epsR: 4, n: 15 }).error).toBe(PC_ERR_STITCHING_N)
  })

  it('gerçek aralık sınırın altındaysa withinLimit true', () => {
    const r = stitchingSpacingCheck({ frequency: 1e9, epsR: 4, n: 20, actualSpacing: 0.001 })
    expect(r.withinLimit).toBe(true)
  })

  it('gerçek aralık verilmezse withinLimit null', () => {
    const r = stitchingSpacingCheck({ frequency: 1e9, epsR: 4, n: 20 })
    expect(r.withinLimit).toBeNull()
  })
})

describe('planeCavityAnalysis', () => {
  const base = { a: 0.1, b: 0.1, d: 1e-4, epsR: 4, lossTangent: 0.02, mMax: 2, nMax: 2 }

  it('geçersiz temel girdide hata döner', () => {
    expect(planeCavityAnalysis({ ...base, d: 0 }).error).toBe(PC_ERR_INVALID)
  })

  it('opsiyonel bloklar girdi verilmezse null kalır', () => {
    const r = planeCavityAnalysis(base)
    expect(r.energy).toBeNull()
    expect(r.totalQ).toBeNull()
    expect(r.stitching).toBeNull()
  })

  it('örtüşen etkin alan verilirse doğrudan kullanılır', () => {
    const r = planeCavityAnalysis({ ...base, area: 0.02 })
    expect(r.area).toBeCloseTo(0.02, 12)
    expect(r.capacitance).toBeCloseTo(planeCapacitance({ epsR: 4, area: 0.02, d: 1e-4 }), 15)
  })

  it('stitching hedefi verilirse alt blok dolar, üst düzey ok kalır', () => {
    const r = planeCavityAnalysis({
      ...base, targetFrequency: 1e9, stitchingN: 20, actualStitchingSpacing: 0.001,
    })
    expect(r.ok).toBe(true)
    expect(r.stitching.withinLimit).toBe(true)
  })

  it('geçersiz stitching N alt blokta hata taşır, üst düzey ok kalır', () => {
    const r = planeCavityAnalysis({ ...base, targetFrequency: 1e9, stitchingN: 7 })
    expect(r.ok).toBe(true)
    expect(r.stitching.error).toBe(PC_ERR_STITCHING_N)
  })
})
