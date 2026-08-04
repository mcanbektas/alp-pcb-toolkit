import { describe, it, expect } from 'vitest'
import {
  stubLength, residualStub, residualWorstCase, residualBestCase,
  viaVelocity, quarterWaveResonance, resonanceHarmonics, roundTripDelay,
  frequencyMargin, allowedResidual, nominalBackdrillTarget, classifyKt, viaStubPlan,
  VS_ERR_INVALID, VS_ERR_RESIDUAL_NEGATIVE, VS_ERR_EXCEEDS_BOARD, VS_ERR_TARGET_UNREACHABLE,
  KT_CLASS_LOW, KT_CLASS_CONSIDER, KT_CLASS_VERIFY,
} from './viaStub'

describe('REV2 §5.11 referans testi', () => {
  it('5 mm stub, εr = 4 için ≈ 7.495 GHz', () => {
    expect(quarterWaveResonance({ stub: 5e-3, epsR: 4 }) / 1e9).toBeCloseTo(7.495, 3)
  })

  it('2.5 mm ye düşünce ≈ 14.99 GHz', () => {
    expect(quarterWaveResonance({ stub: 2.5e-3, epsR: 4 }) / 1e9).toBeCloseTo(14.99, 2)
  })

  it('stub yarıya inince rezonans iki katına çıkar', () => {
    const a = quarterWaveResonance({ stub: 5e-3, epsR: 4 })
    const b = quarterWaveResonance({ stub: 2.5e-3, epsR: 4 })
    expect(b / a).toBeCloseTo(2, 12)
  })
})

describe('stub uzunlukları', () => {
  it('kullanılmayan bölüm stub olur', () => {
    expect(stubLength({ viaTotal: 1.6e-3, used: 0.6e-3 })).toBeCloseTo(1e-3, 15)
  })

  it('backdrill sonrası residual', () => {
    expect(residualStub({ stub: 1e-3, removed: 0.8e-3 }).residual).toBeCloseTo(0.2e-3, 15)
  })

  it('negatif residual fiziksel değildir', () => {
    expect(residualStub({ stub: 1e-3, removed: 1.5e-3 }).error).toBe(VS_ERR_RESIDUAL_NEGATIVE)
  })

  it('worst-case residual tolerans ve payı EKLER', () => {
    expect(residualWorstCase({ nominal: 0.2e-3, depthTol: 0.05e-3, safety: 0.1e-3 }))
      .toBeCloseTo(0.35e-3, 15)
  })

  it('best-case residual toleransı çıkarır, sıfırın altına inmez', () => {
    expect(residualBestCase({ nominal: 0.2e-3, depthTol: 0.05e-3 })).toBeCloseTo(0.15e-3, 15)
    expect(residualBestCase({ nominal: 0.02e-3, depthTol: 0.05e-3 })).toBe(0)
  })
})

describe('yayılma ve gecikme', () => {
  it('εr = 4 için hız ışık hızının yarısı', () => {
    expect(viaVelocity({ epsR: 4 })).toBeCloseTo(299792458 / 2, 6)
  })

  it('gidiş-dönüş gecikmesi 2l/v', () => {
    const t = roundTripDelay({ stub: 5e-3, epsR: 4 })
    expect(t).toBeCloseTo((2 * 5e-3) / (299792458 / 2), 18)
  })

  it('tek harmonikler 1, 3, 5 katı', () => {
    expect(resonanceHarmonics({ fundamental: 1e9, count: 3 })).toEqual([1e9, 3e9, 5e9])
  })
})

describe('K_t sınıflandırması', () => {
  it('eşiklere göre ayrışır', () => {
    expect(classifyKt(0.05)).toBe(KT_CLASS_LOW)
    expect(classifyKt(0.15)).toBe(KT_CLASS_CONSIDER)
    expect(classifyKt(0.5)).toBe(KT_CLASS_VERIFY)
  })

  it('sınır değerler üst sınıfa düşer', () => {
    expect(classifyKt(0.1)).toBe(KT_CLASS_CONSIDER)
    expect(classifyKt(0.25)).toBe(KT_CLASS_VERIFY)
  })
})

describe('frekans marjı', () => {
  it('rezonansın çalışma bandına oranı', () => {
    expect(frequencyMargin({ resonance: 7.495e9, fMax: 1e9 })).toBeCloseTo(7.495, 6)
  })
})

describe('backdrill hedefi', () => {
  it('hedef rezonanstan izin verilen residual', () => {
    // 10 GHz hedef, εr = 4 → c/(4·f·2) = 3.747 mm
    expect(allowedResidual({ fTarget: 10e9, epsR: 4 }) * 1e3).toBeCloseTo(3.747, 3)
  })

  it('nominal hedef toleransı ve payı ÇIKARIR', () => {
    const r = nominalBackdrillTarget({ allowed: 0.5e-3, fabricationTol: 0.15e-3, safety: 0.1e-3 })
    expect(r.target).toBeCloseTo(0.25e-3, 15)
  })

  it('tolerans ve pay sınırı yiyorsa hedef ulaşılamaz, ham (negatif) hedef teşhis için taşınır', () => {
    const r = nominalBackdrillTarget({ allowed: 0.2e-3, fabricationTol: 0.15e-3, safety: 0.1e-3 })
    expect(r.error).toBe(VS_ERR_TARGET_UNREACHABLE)
    expect(r.target).toBeCloseTo(-0.05e-3, 15)
  })
})

describe('viaStubPlan', () => {
  const base = { viaTotal: 1.6e-3, used: 0.6e-3, epsR: 4 }

  it('nominal stub sonuçlarını verir', () => {
    const r = viaStubPlan(base)
    expect(r.ok).toBe(true)
    expect(r.stub).toBeCloseTo(1e-3, 15)
    expect(r.resonance / 1e9).toBeCloseTo(37.474, 2)
  })

  it('yükselme süresi verilince K_t sınıflandırılır', () => {
    const r = viaStubPlan({ ...base, tr: 100e-12 })
    expect(r.kt).toBeGreaterThan(0)
    expect([KT_CLASS_LOW, KT_CLASS_CONSIDER, KT_CLASS_VERIFY]).toContain(r.ktClass)
  })

  it('backdrill residual rezonansı yükseltir', () => {
    const r = viaStubPlan({ ...base, removed: 0.8e-3, depthTol: 0.05e-3 })
    expect(r.residual.nominal).toBeCloseTo(0.2e-3, 15)
    expect(r.residual.worstCase).toBeCloseTo(0.25e-3, 15)
    // Daha kısa stub → daha yüksek rezonans
    expect(r.residual.resonanceNominal).toBeGreaterThan(r.resonance)
    // Worst-case stub daha UZUN olduğu için rezonansı daha DÜŞÜK
    expect(r.residual.resonanceWorstCase).toBeLessThan(r.residual.resonanceNominal)
    expect(r.residual.resonanceGain).toBeCloseTo(5, 6) // 1 mm → 0.2 mm
  })

  it('hedef frekans verilince backdrill hedefi hesaplanır', () => {
    const r = viaStubPlan({ ...base, fTarget: 20e9, fabricationTol: 0.1e-3, safety: 0.05e-3 })
    expect(r.backdrillTarget.allowed * 1e3).toBeCloseTo(1.874, 3)
    expect(r.backdrillTarget.nominalTarget * 1e3).toBeCloseTo(1.724, 3)
  })

  it('kart kalınlığından derin backdrill hatadır', () => {
    const r = viaStubPlan({ ...base, removed: 2e-3, boardThickness: 1.6e-3 })
    expect(r.error).toBe(VS_ERR_EXCEEDS_BOARD)
  })

  it('stub tamamen kaldırılmışsa rezonans sonsuzdur', () => {
    const r = viaStubPlan({ ...base, removed: 1e-3 })
    expect(r.residual.nominal).toBe(0)
    expect(r.residual.resonanceNominal).toBe(Infinity)
  })

  it('geçersiz girdide hata döner', () => {
    expect(viaStubPlan({ viaTotal: 1e-3, used: 1e-3, epsR: 4 }).error).toBe(VS_ERR_INVALID)
    expect(viaStubPlan({ ...base, epsR: 0 }).error).toBe(VS_ERR_INVALID)
  })
})
