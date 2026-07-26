import { describe, it, expect } from 'vitest'
import {
  wavelength, electricalLength, riseTimeBandwidth,
  criticalLength, skew,
  threeWRule, nextCoupling, crosstalk,
  seriesTermination, parallelTermination, theveninTermination,
  SI_ERR_INVALID, SI_ERR_NEGATIVE_SERIES, SI_ERR_NO_FEXT,
} from './signalIntegrity'
import { delayPerLength } from './epsEff'
import { C0 } from './units'

const mm = (x) => x * 1e-3
const ps = (x) => x * 1e-12
const ns = (x) => x * 1e-9

describe('dalga boyu ve elektriksel uzunluk', () => {
  it('havada λ₀ = c / f', () => {
    expect(wavelength({ f: 1e9, epsEff: 1 }).lambda0).toBeCloseTo(C0 / 1e9, 6)
  })

  it('kartta dalga boyu √εeff kadar kısalır', () => {
    const w = wavelength({ f: 1e9, epsEff: 4 })
    expect(w.lambdaG).toBeCloseTo(w.lambda0 / 2, 9)
  })

  it('çeyrek ve yarım dalga oranlıdır', () => {
    const w = wavelength({ f: 2.4e9, epsEff: 3.2 })
    expect(w.quarter).toBeCloseTo(w.lambdaG / 4, 12)
    expect(w.half).toBeCloseTo(w.lambdaG / 2, 12)
  })

  it('elektriksel uzunluk derece ve radyan olarak tutarlı', () => {
    const e = electricalLength({ length: mm(25), f: 1e9, epsEff: 3.2 })
    expect(e.radians).toBeCloseTo((e.degrees * Math.PI) / 180, 12)
  })

  it('çeyrek dalga uzunluğu 90 derece verir', () => {
    const w = wavelength({ f: 1e9, epsEff: 3.2 })
    const e = electricalLength({ length: w.quarter, f: 1e9, epsEff: 3.2 })
    expect(e.degrees).toBeCloseTo(90, 9)
  })
})

describe('yükselme süresi bant genişliği', () => {
  it('f_BW = 0.35 / t_r', () => {
    expect(riseTimeBandwidth({ tr: ns(1) }).fBW).toBeCloseTo(0.35e9, 3)
  })

  it('katsayı büyüdükçe bant genişliği artar', () => {
    const a = riseTimeBandwidth({ tr: ns(1), k: 0.35 })
    const b = riseTimeBandwidth({ tr: ns(1), k: 0.5 })
    expect(b.fBW).toBeGreaterThan(a.fBW)
  })

  it('aralık dışı katsayı reddedilir', () => {
    expect(riseTimeBandwidth({ tr: ns(1), k: 0.2 }).error).toBe(SI_ERR_INVALID)
  })
})

describe('kritik hat uzunluğu', () => {
  const epsEff = 3.2
  const tr = ns(1)

  it('L_kritik = t_r / (6·t_pd)', () => {
    const r = criticalLength({ tr, epsEff, divisor: 6 })
    expect(r.critical).toBeCloseTo(tr / (6 * delayPerLength(epsEff)), 9)
  })

  it('daha gevşek kriter daha uzun sınır verir', () => {
    const strict = criticalLength({ tr, epsEff, divisor: 6 })
    const loose = criticalLength({ tr, epsEff, divisor: 2 })
    expect(loose.critical).toBeGreaterThan(strict.critical)
  })

  it('üç kriterin karşılığı birlikte döner', () => {
    const r = criticalLength({ tr, epsEff })
    expect(r.byDivisor.map((x) => x.divisor)).toEqual([6, 4, 2])
  })

  it('uzunluk verilirse iletim hattı kararı üretir', () => {
    const r = criticalLength({ tr, epsEff, divisor: 6, length: mm(200) })
    expect(r.transmissionLine).toBe(true)
    expect(r.ratio).toBeGreaterThan(1)
  })

  it('kısa hatta iletim hattı etkisi işaretlenmez', () => {
    const r = criticalLength({ tr, epsEff, divisor: 6, length: mm(5) })
    expect(r.transmissionLine).toBe(false)
  })

  it('gecikme kesri kriterle tutarlıdır', () => {
    const r = criticalLength({ tr, epsEff, divisor: 6 })
    const atCritical = criticalLength({ tr, epsEff, divisor: 6, length: r.critical })
    expect(atCritical.delayFraction).toBeCloseTo(1 / 6, 9)
  })
})

describe('skew ve uzunluk eşitleme', () => {
  const epsEff = 3.2

  it('eşit uzunlukta skew sıfırdır', () => {
    expect(skew({ lengthP: mm(50), lengthN: mm(50), epsEff }).skew).toBeCloseTo(0, 15)
  })

  it('uzunluk farkı gecikme farkına çevrilir', () => {
    const r = skew({ lengthP: mm(51), lengthN: mm(50), epsEff })
    expect(r.skew).toBeCloseTo(mm(1) * delayPerLength(epsEff), 15)
    expect(r.longer).toBe('P')
  })

  it('izin verilen skew\'den maksimum uzunluk farkı türetilir', () => {
    const r = skew({ lengthP: mm(50), lengthN: mm(50), epsEff, skewMax: ps(10) })
    expect(r.maxDeltaL).toBeCloseTo(ps(10) / delayPerLength(epsEff), 15)
    expect(r.within).toBe(true)
  })

  it('sınır aşıldığında within false olur', () => {
    const r = skew({ lengthP: mm(60), lengthN: mm(50), epsEff, skewMax: ps(10) })
    expect(r.within).toBe(false)
  })

  it('farklı katmanda eşit uzunluk skew\'i sıfırlamaz', () => {
    const r = skew({ lengthP: mm(50), lengthN: mm(50), epsEff: 3.2, epsEffN: 4.2 })
    expect(r.sameLayer).toBe(false)
    expect(r.skew).toBeGreaterThan(0)
  })

  it('aynı katmanda eklenecek uzunluk fark kadardır', () => {
    const r = skew({ lengthP: mm(55), lengthN: mm(50), epsEff })
    expect(r.addLength).toBeCloseTo(mm(5), 12)
  })
})

describe('3W kuralı', () => {
  it('S ≥ 3W sağlandığında geçer', () => {
    expect(threeWRule({ W: mm(0.2), S: mm(0.6) }).satisfied).toBe(true)
  })

  it('tam sınırda kayan nokta hatası yüzünden düşmez', () => {
    // 3 × 0.2 mm ile 0.6 mm ikili gösterimde son bitte ayrışır
    for (const w of [0.1, 0.2, 0.3, 0.15, 0.25]) {
      expect(threeWRule({ W: mm(w), S: mm(3 * w) }).satisfied).toBe(true)
    }
  })

  it('sınırın hemen altı yine de düşer', () => {
    expect(threeWRule({ W: mm(0.2), S: mm(0.599) }).satisfied).toBe(false)
  })

  it('sağlanmadığında düşer', () => {
    expect(threeWRule({ W: mm(0.2), S: mm(0.4) }).satisfied).toBe(false)
  })

  it('gereken aralığı bildirir', () => {
    expect(threeWRule({ W: mm(0.2), S: mm(0.4) }).required).toBeCloseTo(mm(0.6), 12)
  })
})

describe('crosstalk', () => {
  const base = {
    Zeven: 60, Zodd: 40, epsEff: 3.2, tr: ns(1),
    coupledLength: mm(50), Vagg: 3.3,
  }

  it('K_b modal empedanslardan hesaplanır', () => {
    expect(nextCoupling({ Zeven: 60, Zodd: 40 }).Kb).toBeCloseTo(20 / (2 * 100), 12)
  })

  it('Z_even ≤ Z_odd geçersizdir', () => {
    expect(nextCoupling({ Zeven: 40, Zodd: 60 }).error).toBe(SI_ERR_INVALID)
  })

  it('doyma uzunluğu L_sat = t_r / (2·t_pd)', () => {
    const r = crosstalk(base)
    expect(r.Lsat).toBeCloseTo(base.tr / (2 * delayPerLength(base.epsEff)), 12)
  })

  it('doymuş bölgede NEXT = K_b · V_agg', () => {
    const r = crosstalk({ ...base, coupledLength: mm(500) })
    expect(r.saturated).toBe(true)
    expect(r.Vnext).toBeCloseTo(r.Kb * base.Vagg, 12)
  })

  it('kısa paralel uzunlukta NEXT doğrusal ölçeklenir', () => {
    const r = crosstalk({ ...base, coupledLength: mm(10) })
    expect(r.saturated).toBe(false)
    expect(r.Vnext).toBeCloseTo(r.Kb * base.Vagg * r.scale, 12)
    expect(r.Vnext).toBeLessThan(r.Kb * base.Vagg)
  })

  it('modal εeff verilmezse FEXT hesaplanmaz — uydurulmaz', () => {
    const r = crosstalk(base)
    expect(r.fext.available).toBe(false)
    expect(r.fext.reason).toBe(SI_ERR_NO_FEXT)
    expect(r.fext.Vfext).toBeUndefined()
  })

  it('modal εeff verilirse FEXT hesaplanır', () => {
    const r = crosstalk({ ...base, epsEffOdd: 3.0, epsEffEven: 3.4 })
    expect(r.fext.available).toBe(true)
    expect(r.fext.Vfext).toBeGreaterThan(0)
  })

  it('homojen dielektrikte FEXT sıfırdır', () => {
    const r = crosstalk({ ...base, epsEffOdd: 3.2, epsEffEven: 3.2 })
    expect(r.fext.homogeneous).toBe(true)
    expect(r.fext.Vfext).toBeCloseTo(0, 15)
  })
})

describe('terminasyon', () => {
  it('seri: R_s = Z₀ − R_sürücü', () => {
    const r = seriesTermination({ Z0: 50, Rdriver: 20 })
    expect(r.Rs).toBeCloseTo(30, 12)
    expect(r.total).toBeCloseTo(50, 12)
  })

  it('sürücü direnci Z₀\'dan büyükse seri terminasyon önerilmez', () => {
    const r = seriesTermination({ Z0: 50, Rdriver: 70 })
    expect(r.error).toBe(SI_ERR_NEGATIVE_SERIES)
  })

  it('paralel: R_T = Z₀ ve güç V²/R', () => {
    const r = parallelTermination({ Z0: 50, V: 3.3 })
    expect(r.RT).toBe(50)
    expect(r.Pdc).toBeCloseTo((3.3 * 3.3) / 50, 12)
  })

  it('duty cycle ortalama gücü düşürür', () => {
    const full = parallelTermination({ Z0: 50, V: 3.3, duty: 1 })
    const half = parallelTermination({ Z0: 50, V: 3.3, duty: 0.5 })
    expect(half.Pavg).toBeCloseTo(full.Pavg / 2, 12)
  })

  it('Thevenin ideal dirençler eşdeğeri Z₀ verir', () => {
    const r = theveninTermination({ Z0: 50, Vcc: 3.3, Vbias: 1.65 })
    const par = (r.ideal.Rtop * r.ideal.Rbottom) / (r.ideal.Rtop + r.ideal.Rbottom)
    expect(par).toBeCloseTo(50, 9)
  })

  it('Thevenin yarı bias\'ta iki direnç eşittir', () => {
    const r = theveninTermination({ Z0: 50, Vcc: 3.3, Vbias: 1.65 })
    expect(r.ideal.Rtop).toBeCloseTo(r.ideal.Rbottom, 9)
    expect(r.ideal.Rtop).toBeCloseTo(100, 9)
  })

  it('standart çift seçilir ve gerçek bias yeniden hesaplanır', () => {
    const r = theveninTermination({ Z0: 50, Vcc: 3.3, Vbias: 1.65 })
    expect(r.standard.Rtop).toBeGreaterThan(0)
    expect(r.standard.bias).toBeGreaterThan(0)
    expect(Math.abs(r.standard.vErr)).toBeLessThan(10)
  })

  it('bias V_cc\'ye eşit veya büyükse reddedilir', () => {
    expect(theveninTermination({ Z0: 50, Vcc: 3.3, Vbias: 3.3 }).error).toBe(SI_ERR_INVALID)
  })
})
