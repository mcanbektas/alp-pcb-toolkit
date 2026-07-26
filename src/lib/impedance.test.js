import { describe, it, expect } from 'vitest'
import {
  ellipticK, ellipticRatio,
  microstrip, microstripEpsEff, microstripZair,
  stripline, coplanarWaveguide,
  differentialPair, couplingFactor,
  solveWidthForZ0, solveSpacingForZdiff, impedanceTolerance,
  METHOD_CLOSED_FORM, IMP_ERR_INVALID, IMP_ERR_NO_SOLUTION,
} from './impedance'

const mm = (x) => x * 1e-3

describe('spec §13 Test 1 — microstrip', () => {
  // W = 0.4 mm, H = 0.2 mm, εr = 4.2, bakır kalınlığı ihmal
  const g = { W: mm(0.4), H: mm(0.2), t: 0, epsR: 4.2 }

  it('efektif dielektrik sabiti ≈ 3.21', () => {
    expect(microstrip(g).epsEff).toBeCloseTo(3.21, 2)
  })

  it('karakteristik empedans ≈ 49.7 Ω', () => {
    expect(microstrip(g).Z0).toBeCloseTo(49.7, 1)
  })

  it('yayılma gecikmesi ≈ 5.98 ps/mm', () => {
    // t'pd = √εeff / c, ps/mm'ye çevrilir.
    // Spec'teki 5.98 değeri yuvarlanmış εeff = 3.21'den türetilmiş; motor
    // yuvarlanmamış 3.2071 kullandığı için 5.973 çıkar. Fark yuvarlamadandır.
    const r = microstrip(g)
    expect(r.tpd * 1e12 * 1e-3).toBeCloseTo(5.98, 1)
  })

  it('pratik yaklaşım 3.33564·√εeff ile aynı sonucu verir', () => {
    const r = microstrip(g)
    expect(3.33564 * Math.sqrt(r.epsEff)).toBeCloseTo(r.tpd * 1e15 / 1e6, 3)
  })
})

describe('eliptik integral', () => {
  it('K(0) = π/2', () => {
    expect(ellipticK(0)).toBeCloseTo(Math.PI / 2, 12)
  })

  it('K(1/√2) ≈ 1.85407', () => {
    expect(ellipticK(Math.SQRT1_2)).toBeCloseTo(1.8540746773, 9)
  })

  it('k = 1/√2 için K(k\')/K(k) = 1', () => {
    expect(ellipticRatio(Math.SQRT1_2)).toBeCloseTo(1, 9)
  })

  it('k büyüdükçe oran küçülür', () => {
    expect(ellipticRatio(0.9)).toBeLessThan(ellipticRatio(0.3))
  })
})

describe('microstrip', () => {
  it('sözleşmeye uyar: Z0, epsEff, method', () => {
    const r = microstrip({ W: mm(0.4), H: mm(0.2), epsR: 4.2 })
    expect(r.method).toBe(METHOD_CLOSED_FORM)
    expect(r.Z0).toBeGreaterThan(0)
    expect(r.epsEff).toBeGreaterThan(1)
  })

  it('hat genişledikçe empedans düşer', () => {
    const narrow = microstrip({ W: mm(0.2), H: mm(0.2), epsR: 4.2 })
    const wide = microstrip({ W: mm(0.8), H: mm(0.2), epsR: 4.2 })
    expect(wide.Z0).toBeLessThan(narrow.Z0)
  })

  it('dielektrik kalınlaştıkça empedans yükselir', () => {
    const thin = microstrip({ W: mm(0.4), H: mm(0.1), epsR: 4.2 })
    const thick = microstrip({ W: mm(0.4), H: mm(0.4), epsR: 4.2 })
    expect(thick.Z0).toBeGreaterThan(thin.Z0)
  })

  it('εr arttıkça empedans düşer, εeff yükselir', () => {
    const low = microstrip({ W: mm(0.4), H: mm(0.2), epsR: 3 })
    const high = microstrip({ W: mm(0.4), H: mm(0.2), epsR: 10 })
    expect(high.Z0).toBeLessThan(low.Z0)
    expect(high.epsEff).toBeGreaterThan(low.epsEff)
  })

  it('bakır kalınlığı empedansı düşürür', () => {
    const zero = microstrip({ W: mm(0.4), H: mm(0.2), t: 0, epsR: 4.2 })
    const thick = microstrip({ W: mm(0.4), H: mm(0.2), t: mm(0.035), epsR: 4.2 })
    expect(thick.Z0).toBeLessThan(zero.Z0)
    expect(thick.thicknessIncluded).toBe(true)
    expect(zero.thicknessIncluded).toBe(false)
  })

  it('εeff her zaman 1 ile εr arasındadır', () => {
    const r = microstrip({ W: mm(0.4), H: mm(0.2), epsR: 4.2 })
    expect(r.epsEff).toBeGreaterThan(1)
    expect(r.epsEff).toBeLessThan(4.2)
  })

  it('geçersiz girişte hesap yapmaz', () => {
    expect(microstrip({ W: 0, H: mm(0.2), epsR: 4.2 }).error).toBe(IMP_ERR_INVALID)
    expect(microstrip({ W: mm(0.4), H: mm(0.2), epsR: 0.5 }).error).toBe(IMP_ERR_INVALID)
  })

  it('yardımcı fonksiyonlar doğrudan da tutarlı', () => {
    const u = 2
    expect(microstripEpsEff(u, 4.2)).toBeCloseTo(3.207, 3)
    expect(microstripZair(u) / Math.sqrt(microstripEpsEff(u, 4.2))).toBeCloseTo(49.7, 1)
  })
})

describe('stripline', () => {
  it('homojen dielektrikte εeff = εr', () => {
    const r = stripline({ W: mm(0.2), b: mm(0.4), epsR: 4.2 })
    expect(r.epsEff).toBeCloseTo(4.2, 12)
  })

  it('aynı geometride microstrip\'ten düşük empedans verir', () => {
    // İki referans düzlemi arasında kapasitans daha yüksektir
    const ms = microstrip({ W: mm(0.2), H: mm(0.4), epsR: 4.2 })
    const sl = stripline({ W: mm(0.2), b: mm(0.4), epsR: 4.2 })
    expect(sl.Z0).toBeLessThan(ms.Z0)
  })

  it('hat genişledikçe empedans düşer', () => {
    const narrow = stripline({ W: mm(0.1), b: mm(0.4), epsR: 4.2 })
    const wide = stripline({ W: mm(0.4), b: mm(0.4), epsR: 4.2 })
    expect(wide.Z0).toBeLessThan(narrow.Z0)
  })

  it('bakır kalınlığı kapalı forma dahil değildir ve bu bildirilir', () => {
    expect(stripline({ W: mm(0.2), b: mm(0.4), epsR: 4.2 }).thicknessIncluded).toBe(false)
  })
})

describe('coplanar waveguide', () => {
  it('alt düzlem içermediğini bildirir', () => {
    const r = coplanarWaveguide({ W: mm(0.3), S: mm(0.2), epsR: 4.2 })
    expect(r.groundedBelow).toBe(false)
    expect(r.method).toBe(METHOD_CLOSED_FORM)
  })

  it('boşluk büyüdükçe empedans yükselir', () => {
    const tight = coplanarWaveguide({ W: mm(0.3), S: mm(0.1), epsR: 4.2 })
    const loose = coplanarWaveguide({ W: mm(0.3), S: mm(0.5), epsR: 4.2 })
    expect(loose.Z0).toBeGreaterThan(tight.Z0)
  })

  it('εeff kalın substrat yaklaşımıyla (εr+1)/2', () => {
    expect(coplanarWaveguide({ W: mm(0.3), S: mm(0.2), epsR: 4.2 }).epsEff).toBeCloseTo(2.6, 12)
  })
})

describe('diferansiyel çift', () => {
  const g = { structure: 'microstrip', W: mm(0.2), S: mm(0.2), H: mm(0.2), epsR: 4.2 }

  it('Z_diff = 2·Z_odd (spec §16.4)', () => {
    const r = differentialPair(g)
    expect(r.Zdiff).toBeCloseTo(2 * r.Zodd, 12)
  })

  it('Z_common = Z_even / 2', () => {
    const r = differentialPair(g)
    expect(r.Zcommon).toBeCloseTo(r.Zeven / 2, 12)
  })

  it('Z_diff iki tek uçlu empedansın toplamı değildir', () => {
    const r = differentialPair(g)
    expect(r.Zdiff).toBeLessThan(2 * r.Z0)
  })

  it('aralık açıldıkça kuplaj azalır, Z_diff 2·Z0\'a yaklaşır', () => {
    const tight = differentialPair({ ...g, S: mm(0.1) })
    const loose = differentialPair({ ...g, S: mm(2) })
    expect(loose.coupling).toBeLessThan(tight.coupling)
    expect(loose.Zdiff).toBeGreaterThan(tight.Zdiff)
    expect(loose.Zdiff).toBeCloseTo(2 * loose.Z0, 1)
  })

  it('odd mod tek uçlunun altında, even mod üstündedir', () => {
    const r = differentialPair(g)
    expect(r.Zodd).toBeLessThan(r.Z0)
    expect(r.Zeven).toBeGreaterThan(r.Z0)
  })

  it('stripline yapısı da desteklenir', () => {
    const r = differentialPair({ ...g, structure: 'stripline' })
    expect(r.structure).toBe('stripline')
    expect(r.Zdiff).toBeGreaterThan(0)
  })

  it('kuplaj katsayısı aralıkla üstel azalır', () => {
    expect(couplingFactor('microstrip', 0)).toBeCloseTo(0.48, 12)
    expect(couplingFactor('microstrip', 2)).toBeLessThan(couplingFactor('microstrip', 1))
  })

  it('çok sıkı kuplajda geçerlilik dışı işaretlenir', () => {
    expect(differentialPair({ ...g, S: mm(0.02) }).inRange).toBe(false)
  })
})

describe('sentez — hedef empedans için genişlik', () => {
  it('50 Ω microstrip genişliği bulur ve geri doğrular', () => {
    const r = solveWidthForZ0({ target: 50, H: mm(0.2), t: 0, epsR: 4.2 })
    expect(r.error).toBeUndefined()
    expect(r.Z0).toBeCloseTo(50, 6)
    // spec §13 geometrisi ≈ 0.4 mm veriyordu
    expect(r.W * 1e3).toBeCloseTo(0.4, 1)
  })

  it('stripline için de çözer', () => {
    const r = solveWidthForZ0({ target: 50, structure: 'stripline', b: mm(0.5), epsR: 4.2 })
    expect(r.Z0).toBeCloseTo(50, 6)
  })

  it('fiziksel aralıkta elde edilemeyen hedefte hata döner', () => {
    const r = solveWidthForZ0({ target: 500, H: mm(0.2), epsR: 4.2 })
    expect(r.error).toBe(IMP_ERR_NO_SOLUTION)
    expect(r.W).toBeUndefined()
  })

  it('bulunan genişlik her zaman pozitiftir', () => {
    for (const target of [30, 50, 75, 90]) {
      const r = solveWidthForZ0({ target, H: mm(0.2), epsR: 4.2 })
      if (!r.error) expect(r.W).toBeGreaterThan(0)
    }
  })
})

describe('sentez — hedef diferansiyel empedans için aralık', () => {
  it('100 Ω için aralık bulur ve geri doğrular', () => {
    const r = solveSpacingForZdiff({ target: 100, W: mm(0.2), H: mm(0.2), epsR: 4.2 })
    expect(r.error).toBeUndefined()
    expect(r.Zdiff).toBeCloseTo(100, 6)
    expect(r.S).toBeGreaterThan(0)
  })

  it('elde edilemeyen hedefte hata döner', () => {
    const r = solveSpacingForZdiff({ target: 400, W: mm(0.2), H: mm(0.2), epsR: 4.2 })
    expect(r.error).toBe(IMP_ERR_NO_SOLUTION)
  })
})

describe('tolerans', () => {
  it('tolerans sıfırken üç değer eşittir', () => {
    const t = impedanceTolerance({ W: mm(0.4), H: mm(0.2), epsR: 4.2 })
    expect(t.min).toBeCloseTo(t.nom, 9)
    expect(t.max).toBeCloseTo(t.nom, 9)
  })

  it('dar hat + kalın dielektrik + düşük εr en yüksek Z0 verir', () => {
    const t = impedanceTolerance({
      W: mm(0.4), H: mm(0.2), epsR: 4.2, tolW: 10, tolH: 10, tolEps: 5,
    })
    expect(t.max).toBeGreaterThan(t.nom)
    expect(t.min).toBeLessThan(t.nom)
    expect(t.spread).toBeGreaterThan(0)
  })

  it('yüzde sapmalar simetrik değildir', () => {
    const t = impedanceTolerance({ W: mm(0.4), H: mm(0.2), epsR: 4.2, tolW: 20 })
    expect(Math.abs(t.maxPct)).not.toBeCloseTo(Math.abs(t.minPct), 6)
  })
})
