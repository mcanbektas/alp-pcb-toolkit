import { describe, it, expect } from 'vitest'
import {
  edgeBandwidth, propagationVelocity, wavelength, stitchingSpacing,
  viaReactance, parallelViaInductance, eslTotal, selfResonantFrequency,
  capacitorBranch, inductiveVoltage, returnPathPlan,
  BW_SINGLE_POLE, BW_CONSERVATIVE, RP_ERR_INVALID,
} from './returnPath'

describe('kenar bant genişliği', () => {
  it('iki yöntemi de verir', () => {
    expect(edgeBandwidth({ tr: 1e-9, method: BW_CONSERVATIVE })).toBeCloseTo(500e6, 0)
    expect(edgeBandwidth({ tr: 1e-9, method: BW_SINGLE_POLE })).toBeCloseTo(350e6, 0)
  })

  it('varsayılan muhafazakâr yöntemdir', () => {
    expect(edgeBandwidth({ tr: 1e-9 })).toBeCloseTo(500e6, 0)
  })

  it('geçersiz girdide NaN', () => {
    expect(Number.isNaN(edgeBandwidth({ tr: 0 }))).toBe(true)
    expect(Number.isNaN(edgeBandwidth({ tr: 1e-9, method: 'yok' }))).toBe(true)
  })
})

describe('yayılma ve dalga boyu', () => {
  it('εeff = 4 için hız ışık hızının yarısı', () => {
    expect(propagationVelocity({ eps: 4 })).toBeCloseTo(299792458 / 2, 6)
  })

  it('λ/N aralık sınırlarını verir', () => {
    const vp = propagationVelocity({ eps: 4 })
    const lambda = wavelength({ vp, f: 500e6 })
    expect(lambda).toBeCloseTo(0.2998, 4)
    expect(stitchingSpacing({ lambda, divisor: 20 })).toBeCloseTo(0.01499, 5)
    expect(stitchingSpacing({ lambda, divisor: 10 })).toBeCloseTo(0.02998, 5)
    expect(stitchingSpacing({ lambda, divisor: 40 })).toBeCloseTo(0.007495, 6)
  })
})

describe('via endüktansı ve reaktansı', () => {
  it('N paralel via eşdeğeri L/N', () => {
    expect(parallelViaInductance({ L: 1.2e-9, n: 4 })).toBeCloseTo(0.3e-9, 15)
    expect(parallelViaInductance({ L: 1.2e-9, n: 1 })).toBeCloseTo(1.2e-9, 15)
  })

  it('reaktans 2πfL', () => {
    expect(viaReactance({ L: 1e-9, f: 1e9 })).toBeCloseTo(2 * Math.PI, 9)
  })
})

describe('stitching kondansatörü', () => {
  it('ESL_total üç bileşenin toplamı', () => {
    expect(eslTotal({ eslComponent: 1e-9, lMount: 0.4e-9, lViaEq: 0.3e-9 })).toBeCloseTo(1.7e-9, 15)
  })

  it('SRF değerinde empedans ESR ye iner', () => {
    const c = 100e-9
    const esl = 1e-9
    const f = selfResonantFrequency({ esl, c })
    expect(f).toBeCloseTo(15.9155e6, -2)
    const b = capacitorBranch({ esr: 0.02, esl, c, f })
    expect(b.magnitude).toBeCloseTo(0.02, 9)
  })

  it('geçersiz kapasitans hata döner', () => {
    expect(capacitorBranch({ esl: 1e-9, c: 0, f: 1e6 }).error).toBe(RP_ERR_INVALID)
  })
})

describe('endüktif gerilim', () => {
  it('di/dt ile', () => {
    expect(inductiveVoltage({ L: 2e-9, didt: 1e8 })).toBeCloseTo(0.2, 12)
  })

  it('sinüzoidal yaklaşımda I_pk·X_L', () => {
    expect(inductiveVoltage({ L: 1e-9, ipk: 0.1, f: 1e9 })).toBeCloseTo(0.1 * 2 * Math.PI, 9)
  })
})

describe('REV2 §4.12 referans testi', () => {
  // t_r = 1 ns, εeff = 4, h = 1.6 mm, d = 0.3 mm
  const r = returnPathPlan({
    tr: 1e-9, eps: 4, viaLength: 1.6e-3, viaDiameter: 0.3e-3,
    stitchingViaCount: 1, spacingDivisor: 20,
  })

  it('kenar bant genişliği 500 MHz', () => {
    expect(r.fEdge).toBeCloseTo(500e6, 0)
  })

  it('dalga boyu ≈ 0.2998 m', () => {
    expect(r.lambda).toBeCloseTo(0.2998, 4)
  })

  it('λ/20 ≈ 14.99 mm', () => {
    expect(r.spacingLimit * 1e3).toBeCloseTo(14.99, 2)
  })

  it('via endüktansı ≈ 1.30 nH', () => {
    expect(r.viaInductanceSingle * 1e9).toBeCloseTo(1.30, 2)
  })

  it('500 MHz te reaktans ≈ 4.08 Ω', () => {
    expect(r.reactanceSingle).toBeCloseTo(4.08, 2)
  })
})

describe('returnPathPlan', () => {
  it('saat frekansı ile kenar bandı oranını verir', () => {
    const r = returnPathPlan({
      tr: 1e-9, eps: 4, viaLength: 1.6e-3, viaDiameter: 0.3e-3, clockFreq: 1e6,
    })
    // 1 MHz saat, 500 MHz kenar: analiz frekansı saatin 500 katı.
    expect(r.edgeToClockRatio).toBeCloseTo(500, 6)
  })

  it('gerçek aralığın sınıra oranını verir', () => {
    const r = returnPathPlan({
      tr: 1e-9, eps: 4, viaLength: 1.6e-3, viaDiameter: 0.3e-3,
      actualSpacing: 30e-3, spacingDivisor: 20,
    })
    expect(r.spacingRatio).toBeGreaterThan(1) // 30 mm > 14.99 mm sınır
  })

  it('paralel via eşdeğeri reaktansı düşürür', () => {
    const r = returnPathPlan({
      tr: 1e-9, eps: 4, viaLength: 1.6e-3, viaDiameter: 0.3e-3, stitchingViaCount: 4,
    })
    expect(r.reactanceParallel).toBeCloseTo(r.reactanceSingle / 4, 9)
  })

  it('kondansatör verilmezse blok null kalır', () => {
    const r = returnPathPlan({ tr: 1e-9, eps: 4, viaLength: 1.6e-3, viaDiameter: 0.3e-3 })
    expect(r.capacitor).toBeNull()
  })

  it('kondansatör verilirse SRF ve empedans döner', () => {
    const r = returnPathPlan({
      tr: 1e-9, eps: 4, viaLength: 1.6e-3, viaDiameter: 0.3e-3,
      capacitor: { c: 10e-9, esr: 0.03, esl: 0.6e-9, lMount: 0.3e-9, lViaEq: 0.3e-9 },
    })
    expect(r.capacitor.eslTotal).toBeCloseTo(1.2e-9, 15)
    expect(r.capacitor.fSrf).toBeGreaterThan(0)
    expect(r.capacitor.impedance).toBeGreaterThan(0)
  })

  it('geçersiz girdide hata döner', () => {
    expect(returnPathPlan({ tr: 0, eps: 4, viaLength: 1e-3, viaDiameter: 0.3e-3 }).error)
      .toBe(RP_ERR_INVALID)
    expect(returnPathPlan({ tr: 1e-9, eps: 0, viaLength: 1e-3, viaDiameter: 0.3e-3 }).error)
      .toBe(RP_ERR_INVALID)
  })
})
