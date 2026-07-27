import { describe, it, expect } from 'vitest'
import {
  awgDiameter, awgFromDiameter, wireArea, nearestAwg, inAwgRange,
  diameterUnits, areaUnits, wireFromAwg, wireFromDiameter, awgSeries,
  AWG_MIN, AWG_MAX, AWG_D_MIN, AWG_D_MAX,
  AWG_ERR_INVALID, AWG_ERR_RANGE,
} from './convertAwg'

describe('numaradan çap (spec §11.2)', () => {
  it('tanım noktası: AWG 36 = 0.127 mm = 0.005 inch', () => {
    expect(awgDiameter(36)).toBeCloseTo(0.127e-3, 15)
    expect(awgDiameter(36) / 0.0254).toBeCloseTo(0.005, 15)
  })

  it('4/0 (−3) = 0.46 inch = 11.684 mm', () => {
    expect(awgDiameter(-3) * 1e3).toBeCloseTo(11.684, 9)
    expect(awgDiameter(-3) / 0.0254).toBeCloseTo(0.46, 9)
  })

  it('yayınlanmış tablo değerleri tutuyor', () => {
    // AWG 0 = 0.32486 inch, AWG 10 = 0.101897 inch, AWG 24 = 0.0201 inch
    expect(awgDiameter(0) * 1e3).toBeCloseTo(8.25146, 4)
    expect(awgDiameter(10) * 1e3).toBeCloseTo(2.58819, 4)
    expect(awgDiameter(24) * 1e3).toBeCloseTo(0.51056, 4)
    expect(awgDiameter(40) * 1e3).toBeCloseTo(0.079871, 5)
  })

  it('6 numara artış çapı yaklaşık yarıya indirir', () => {
    expect(awgDiameter(10) / awgDiameter(16)).toBeCloseTo(2.00503, 4)
  })

  it('3 numara artış kesiti yaklaşık yarıya indirir', () => {
    const a10 = wireArea(awgDiameter(10))
    const a13 = wireArea(awgDiameter(13))
    expect(a10 / a13).toBeCloseTo(2.00503, 4)
  })

  it('sayısal olmayan giriş NaN döner', () => {
    expect(awgDiameter(NaN)).toBeNaN()
    expect(awgDiameter(Infinity)).toBeNaN()
  })
})

describe('kesit alanı A = πd²/4', () => {
  it('AWG 10 ≈ 5.261 mm², AWG 24 ≈ 0.2047 mm²', () => {
    expect(wireArea(awgDiameter(10)) / 1e-6).toBeCloseTo(5.26115, 4)
    expect(wireArea(awgDiameter(24)) / 1e-6).toBeCloseTo(0.204730, 5)
  })

  it('4/0 ≈ 107.2 mm²', () => {
    expect(wireArea(awgDiameter(-3)) / 1e-6).toBeCloseTo(107.2193, 3)
  })

  it('geçersiz çap NaN döner', () => {
    expect(wireArea(0)).toBeNaN()
    expect(wireArea(-1e-3)).toBeNaN()
  })
})

describe('çaptan numara (analitik ters)', () => {
  it('gidiş-dönüş kendini tekrarlar', () => {
    for (const g of [-3, -1, 0, 4, 12, 24, 30, 36, 40]) {
      expect(awgFromDiameter(awgDiameter(g))).toBeCloseTo(g, 9)
    }
  })

  it('0.5 mm ≈ AWG 24.18', () => {
    expect(awgFromDiameter(0.5e-3)).toBeCloseTo(24.1802, 4)
  })

  it('2.05 mm ≈ AWG 12.01', () => {
    expect(awgFromDiameter(2.05e-3)).toBeCloseTo(12.0106, 4)
  })

  it('geçersiz çap NaN döner', () => {
    expect(awgFromDiameter(0)).toBeNaN()
    expect(awgFromDiameter(-1)).toBeNaN()
  })
})

describe('en yakın standart numara', () => {
  it('kesirli değer yuvarlanır', () => {
    expect(nearestAwg(24.1802)).toBe(24)
    expect(nearestAwg(12.6)).toBe(13)
    expect(nearestAwg(-2.9)).toBe(-3)
  })

  it('aralık dışına taşmaz', () => {
    expect(nearestAwg(40.4)).toBe(AWG_MAX)
    expect(nearestAwg(-3.4)).toBe(AWG_MIN)
  })
})

describe('birim dönüşümleri', () => {
  it('AWG 24: 0.51056 mm = 20.1008 mil = 0.0201 inch', () => {
    const u = diameterUnits(awgDiameter(24))
    expect(u.mm).toBeCloseTo(0.510559, 6)
    expect(u.um).toBeCloseTo(510.559, 3)
    expect(u.mil).toBeCloseTo(20.1008, 4)
    expect(u.inch).toBeCloseTo(0.0201008, 7)
  })

  it('AWG 24 kesiti: 0.20473 mm² = 317.33 mil²', () => {
    const a = areaUnits(wireArea(awgDiameter(24)))
    expect(a.mm2).toBeCloseTo(0.204730, 6)
    expect(a.mil2).toBeCloseTo(317.333, 3)
  })

  it('1 mil² kesitli tel: mm² karşılığı 6.4516e-4', () => {
    const a = areaUnits(2.54e-5 * 2.54e-5)
    expect(a.mil2).toBeCloseTo(1, 9)
    expect(a.mm2).toBeCloseTo(6.4516e-4, 9)
  })

  it('geçersiz giriş null döner', () => {
    expect(diameterUnits(0)).toBeNull()
    expect(areaUnits(-1)).toBeNull()
  })
})

describe('aralık denetimi', () => {
  it('geçerli aralık 4/0 … 40', () => {
    expect(inAwgRange(AWG_MIN)).toBe(true)
    expect(inAwgRange(AWG_MAX)).toBe(true)
    expect(inAwgRange(-3.5)).toBe(false)
    expect(inAwgRange(41)).toBe(false)
  })

  it('aralık dışı numara sonuç değil hata döner', () => {
    expect(wireFromAwg(41).error).toBe(AWG_ERR_RANGE)
    expect(wireFromAwg(-4).error).toBe(AWG_ERR_RANGE)
    expect(wireFromAwg(NaN).error).toBe(AWG_ERR_INVALID)
  })

  it('aralık dışı çap sonuç değil hata döner', () => {
    expect(wireFromDiameter(12e-3).error).toBe(AWG_ERR_RANGE) // 4/0'dan kalın
    expect(wireFromDiameter(0.05e-3).error).toBe(AWG_ERR_RANGE) // 40'tan ince
    expect(wireFromDiameter(0).error).toBe(AWG_ERR_INVALID)
  })

  it('uç çaplar aralığın içinde sayılır', () => {
    expect(wireFromDiameter(AWG_D_MAX).error).toBeUndefined()
    expect(wireFromDiameter(AWG_D_MIN).error).toBeUndefined()
    expect(AWG_D_MAX * 1e3).toBeCloseTo(11.684, 9)
    expect(AWG_D_MIN * 1e3).toBeCloseTo(0.079871, 5)
  })
})

describe('tel zarfı', () => {
  it('numaradan tel tüm alanları doldurur', () => {
    const w = wireFromAwg(12)
    expect(w.awgExact).toBe(12)
    expect(w.awgNearest).toBe(12)
    expect(w.dUnits.mm).toBeCloseTo(2.052525, 6)
    expect(w.aUnits.mm2).toBeCloseTo(3.30877, 5)
    expect(w.aUnits.mil2).toBeCloseTo(5128.61, 2)
  })

  it('çaptan tel girilen çapı korur, numarayı türetir', () => {
    const w = wireFromDiameter(0.5e-3)
    expect(w.d).toBe(0.5e-3)
    expect(w.awgExact).toBeCloseTo(24.1802, 4)
    expect(w.awgNearest).toBe(24)
    expect(w.aUnits.mm2).toBeCloseTo(0.196350, 6) // π·0.25/4 mm²
  })

  it('kesirli numara kabul edilir', () => {
    const w = wireFromAwg(24.5)
    expect(w.awgNearest).toBe(25)
    expect(w.d).toBeGreaterThan(awgDiameter(25))
    expect(w.d).toBeLessThan(awgDiameter(24))
  })
})

describe('tam numara dizisi', () => {
  const s = awgSeries()

  it('4/0 ile 40 arasındaki bütün numaraları içerir', () => {
    expect(s.length).toBe(AWG_MAX - AWG_MIN + 1)
    expect(s[0].awg).toBe(AWG_MAX)
    expect(s[s.length - 1].awg).toBe(AWG_MIN)
  })

  it('çap artan sırada gelir', () => {
    for (let i = 1; i < s.length; i++) {
      expect(s[i].d).toBeGreaterThan(s[i - 1].d)
    }
  })

  it('dizideki değerler tekil hesapla aynıdır', () => {
    const row = s.find((x) => x.awg === 18)
    expect(row.d).toBeCloseTo(awgDiameter(18), 15)
    expect(row.area).toBeCloseTo(wireArea(awgDiameter(18)), 18)
  })
})
