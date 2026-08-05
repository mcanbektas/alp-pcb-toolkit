import { describe, it, expect } from 'vitest'
import {
  edgeBandwidth, propagationVelocity, wavelength, stitchingSpacing,
  viaReactance, parallelViaInductance, eslTotal, selfResonantFrequency,
  capacitorBranch, inductiveVoltage, returnPathPlan,
  BW_SINGLE_POLE, BW_CONSERVATIVE, RP_ERR_INVALID, SPACING_DIVISORS,
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

// --- Ekranda/raporda basılan ama hiçbir testin okumadığı alanlar --------------
//
// `SPACING_DIVISORS`, `spacingLimits`, `returnVoltage` ve `capacitorBranch.phase`
// yukarıdaki testlerin hiçbirinde geçmiyordu; buna rağmen üçü de kullanıcıya
// sayı olarak gösteriliyor. Beklenen değerler elle hesaplanıp yazıldı.

describe('spacingLimits — λ/N tablosunun tamamı', () => {
  // t_r = 1 ns, muhafazakâr yöntem → f_kenar = 0.5/1e-9 = 500 MHz
  // εeff = 4 → v_p = c/2 = 149 896 229 m/s
  // λ = v_p/f = 149 896 229 / 5e8 = 0.299792458 m = 299.792458 mm
  const r = returnPathPlan({
    tr: 1e-9, eps: 4, viaLength: 1.6e-3, viaDiameter: 0.3e-3,
  })

  it('bölen listesi tam olarak [10, 20, 40]', () => {
    // Ekranın seçicisi bu listeyi basar; sıra ve içerik sözleşmenin parçası.
    expect(SPACING_DIVISORS).toEqual([10, 20, 40])
  })

  it('tablo üç bölenin hepsini taşır ve anahtarları listeyle aynıdır', () => {
    expect(Object.keys(r.spacingLimits)).toEqual(['10', '20', '40'])
  })

  it('çıplak değerler: λ/10 = 29.9792458 mm, λ/20 = 14.9896229, λ/40 = 7.49481145', () => {
    expect(r.lambda * 1e3).toBeCloseTo(299.792458, 6)
    expect(r.spacingLimits[10] * 1e3).toBeCloseTo(29.9792458, 6)
    expect(r.spacingLimits[20] * 1e3).toBeCloseTo(14.9896229, 6)
    expect(r.spacingLimits[40] * 1e3).toBeCloseTo(7.49481145, 6)
  })

  it('N büyüdükçe sınır küçülür ve her kademe tam yarısıdır', () => {
    // `lambda * divisor` mutasyonunda sıralama tersine dönerdi.
    expect(r.spacingLimits[10]).toBeGreaterThan(r.spacingLimits[20])
    expect(r.spacingLimits[20]).toBeGreaterThan(r.spacingLimits[40])
    expect(r.spacingLimits[10] / r.spacingLimits[20]).toBeCloseTo(2, 12)
    expect(r.spacingLimits[20] / r.spacingLimits[40]).toBeCloseTo(2, 12)
    // Sınırların hepsi λ'nın altındadır.
    expect(r.spacingLimits[10]).toBeLessThan(r.lambda)
  })

  it('seçilen bölenin sınırı tablodaki karşılığıyla aynı sayıdır', () => {
    const r40 = returnPathPlan({
      tr: 1e-9, eps: 4, viaLength: 1.6e-3, viaDiameter: 0.3e-3, spacingDivisor: 40,
    })
    expect(r40.spacingLimit).toBe(r40.spacingLimits[40])
    expect(r40.spacingLimit * 1e3).toBeCloseTo(7.49481145, 6)
  })
})

describe('returnVoltage — dönüş bağlantısının endüktif düşümü', () => {
  // L_via = 0.2·H[mm]·(ln(4H/D) + 1) nH   (via.js, §5.1.10)
  //   H = 1.6 mm, D = 0.3 mm → 4H/D = 21.3333 ; ln = 3.0602707
  //   L_via = 0.2 × 1.6 × 4.0602707 = 1.29928665 nH
  // 4 paralel via → L_eq = 1.29928665/4 = 0.32482166 nH
  // f = 500 MHz → X_L = 2π × 5e8 × 0.32482166e-9 = 1.0204574 Ω
  // I_pk = 0.1 A → V = 0.10204574 V
  const r = returnPathPlan({
    tr: 1e-9, eps: 4, viaLength: 1.6e-3, viaDiameter: 0.3e-3,
    stitchingViaCount: 4, returnCurrentPeak: 0.1,
  })

  it('V = I_pk · 2πf · L_via,eq ≈ 102.05 mV (çıplak değer)', () => {
    expect(r.returnVoltage * 1e3).toBeCloseTo(102.04574, 4)
  })

  it('TEK via değil, N paralel via eşdeğeri kullanılır', () => {
    // Tek via ile 4 katı (≈408 mV) çıkardı — hangi endüktansın kullanıldığı
    // sonucun kendisi kadar önemli, o yüzden ayrıca sınanır.
    expect(r.returnVoltage).toBeCloseTo(0.1 * r.reactanceParallel, 12)
    expect(r.returnVoltage * 1e3).not.toBeCloseTo(408.18, 1)
  })

  it('tepe akım verilmezse gerilim null kalır (uydurma akım yok)', () => {
    const r0 = returnPathPlan({
      tr: 1e-9, eps: 4, viaLength: 1.6e-3, viaDiameter: 0.3e-3, stitchingViaCount: 4,
    })
    expect(r0.returnVoltage).toBeNull()
  })

  it('akımla doğrusaldır', () => {
    const r2 = returnPathPlan({
      tr: 1e-9, eps: 4, viaLength: 1.6e-3, viaDiameter: 0.3e-3,
      stitchingViaCount: 4, returnCurrentPeak: 0.2,
    })
    expect(r2.returnVoltage * 1e3).toBeCloseTo(204.09147, 4)
  })
})

describe('capacitorBranch — faz açısı', () => {
  // ESL = 1 nH, C = 10 µF → √(L·C) = √(1e-9 × 1e-5) = 1e-7 → ω_SRF = 1e7 rad/s.
  // Üç frekans dekad aralıklı seçildi ki reaktans elle çıksın:
  //   ω = 1e6 : ωL = 1e-3      , 1/(ωC) = 0.1   → X = −0.099 Ω (kapasitif)
  //   ω = 1e7 : ωL = 0.01      , 1/(ωC) = 0.01  → X =  0     Ω (rezonans)
  //   ω = 1e8 : ωL = 0.1       , 1/(ωC) = 1e-3  → X = +0.099 Ω (endüktif)
  const esl = 1e-9
  const c = 10e-6
  const fOf = (omega) => omega / (2 * Math.PI)

  it('SRF altında faz −45° (ESR = |X| seçildiği için tam çeyrek)', () => {
    // R = 0.099 ve X = −0.099 → arg = atan2(−0.099, 0.099) = −π/4
    const b = capacitorBranch({
      esr: 0.099, esl, c, f: fOf(1e6),
    })
    expect(b.z.im).toBeCloseTo(-0.099, 9)
    expect(b.phase).toBeCloseTo(-Math.PI / 4, 9)
    expect(b.magnitude).toBeCloseTo(0.099 * Math.SQRT2, 9) // = 0.14000714
  })

  it('SRF de faz tam olarak 0 — kol saf dirençli', () => {
    const b = capacitorBranch({
      esr: 0.5, esl, c, f: fOf(1e7),
    })
    expect(b.phase).toBeCloseTo(0, 12)
    expect(b.magnitude).toBeCloseTo(0.5, 12)
  })

  it('SRF üstünde faz +45° — işaret DÖNER', () => {
    // arg = atan2(im, re) yerine atan2(re, im) yazılsaydı bu nokta yine +π/4
    // verirdi (re = im); yakalayan, SRF ALTINDAKİ test olur — orada atan2(re, im)
    // −π/4 değil +3π/4 döner. İki nokta birlikte kapatıyor.
    const b = capacitorBranch({
      esr: 0.099, esl, c, f: fOf(1e8),
    })
    expect(b.z.im).toBeCloseTo(0.099, 9)
    expect(b.phase).toBeCloseTo(Math.PI / 4, 9)
    expect(b.phase).toBeGreaterThan(0)
  })

  it('ESL sıfırken faz hiçbir frekansta pozitife dönmez', () => {
    // ωESL terimi olmadan kol daima kapasitiftir; yukarıdaki +45° testi bu
    // terimin gerçekten çalıştığının kanıtıdır.
    const b = capacitorBranch({
      esr: 0.099, esl: 0, c, f: fOf(1e8),
    })
    expect(b.phase).toBeLessThan(0)
  })

  it('faz (−π/2, +π/2] aralığında kalır — kol pasif', () => {
    for (const omega of [1e4, 1e6, 1e7, 1e8, 1e10]) {
      const b = capacitorBranch({
        esr: 0.02, esl, c, f: fOf(omega),
      })
      expect(b.phase).toBeGreaterThan(-Math.PI / 2)
      expect(b.phase).toBeLessThanOrEqual(Math.PI / 2)
    }
  })
})
