import { describe, it, expect } from 'vitest'
import {
  complex, fromPolar, add, sub, mul, div, inv, abs, arg, scale,
  series, parallel, isFiniteComplex,
} from './complex'

// Bu motor spec §13'te referans testi olarak listelenmiyor, ama PDN, EMC filtre
// ve stitching kondansatörü hesaplarının tamamı buradan geçiyor. Sessizce yanlış
// bir bölme, antirezonans tepesini olduğu yerden kaydırır ve hata kullanan her
// ekrana yayılır.

describe('temel aritmetik', () => {
  it('toplar ve çıkarır', () => {
    expect(add(complex(1, 2), complex(3, -5))).toEqual({ re: 4, im: -3 })
    expect(sub(complex(1, 2), complex(3, -5))).toEqual({ re: -2, im: 7 })
  })

  it('çarpar', () => {
    // (1+2i)(3+4i) = 3 + 4i + 6i + 8i² = −5 + 10i
    expect(mul(complex(1, 2), complex(3, 4))).toEqual({ re: -5, im: 10 })
  })

  it('j² = −1', () => {
    const j = complex(0, 1)
    expect(mul(j, j)).toEqual({ re: -1, im: 0 })
  })

  it('gerçek sayıyla ölçekler', () => {
    expect(scale(complex(2, -4), 0.5)).toEqual({ re: 1, im: -2 })
  })

  it('böler', () => {
    // (1+2i)/(3+4i) = (11 + 2i)/25
    const r = div(complex(1, 2), complex(3, 4))
    expect(r.re).toBeCloseTo(11 / 25, 12)
    expect(r.im).toBeCloseTo(2 / 25, 12)
  })

  it('ters alır', () => {
    const r = inv(complex(0, 2)) // 1/(2i) = −0.5i
    expect(r.re).toBeCloseTo(0, 12)
    expect(r.im).toBeCloseTo(-0.5, 12)
  })

  it('sıfıra bölünce NaN döner, sessizce 0 veya Infinity değil', () => {
    const r = div(complex(1, 1), complex(0, 0))
    expect(Number.isNaN(r.re)).toBe(true)
    expect(Number.isNaN(r.im)).toBe(true)
    expect(isFiniteComplex(r)).toBe(false)
  })
})

describe('sayısal kararlılık', () => {
  // Naif (ac+bd)/(c²+d²) formülü burada c²+d² = 2e400 → Infinity üretir ve
  // sonuç 0'a düşerdi. PDN'de pF/GHz ile nH/GHz kolları aynı sweep'te yan yana.
  it('çok büyük bölende taşmaz', () => {
    const r = div(complex(1, 0), complex(1e200, 1e200))
    expect(r.re).toBeCloseTo(5e-201, 210)
    expect(r.im).toBeCloseTo(-5e-201, 210)
    expect(isFiniteComplex(r)).toBe(true)
  })

  it('çok küçük bölende alt taşma yapmaz', () => {
    const r = div(complex(1e-200, 0), complex(1e-200, 0))
    expect(r.re).toBeCloseTo(1, 12)
    expect(r.im).toBeCloseTo(0, 12)
  })

  it('büyüklük uç değerlerde sonlu kalır', () => {
    expect(abs(complex(1e200, 1e200))).toBeCloseTo(Math.SQRT2 * 1e200, -190)
    expect(abs(complex(3, 4))).toBe(5)
  })
})

describe('faz ve kutupsal', () => {
  it('çeyreği korur', () => {
    expect(arg(complex(1, 0))).toBeCloseTo(0, 12)
    expect(arg(complex(0, 1))).toBeCloseTo(Math.PI / 2, 12)
    expect(arg(complex(-1, 0))).toBeCloseTo(Math.PI, 12)
    expect(arg(complex(0, -1))).toBeCloseTo(-Math.PI / 2, 12)
  })

  it('kutupsaldan gelip geri döner', () => {
    const z = fromPolar(5, Math.PI / 3)
    expect(abs(z)).toBeCloseTo(5, 12)
    expect(arg(z)).toBeCloseTo(Math.PI / 3, 12)
  })
})

describe('seri ve paralel', () => {
  it('seri kolları toplar', () => {
    expect(series([complex(1, 2), complex(3, -1), complex(0, 4)])).toEqual({ re: 4, im: 5 })
  })

  it('boş seri listesi kısa devredir', () => {
    expect(series([])).toEqual({ re: 0, im: 0 })
  })

  it('iki eşit direnç paralelde yarısını verir', () => {
    const r = parallel([complex(100, 0), complex(100, 0)])
    expect(r.re).toBeCloseTo(50, 10)
    expect(r.im).toBeCloseTo(0, 10)
  })

  it('N eş kol admitans toplamıyla Z/N verir', () => {
    const z = complex(10, -20)
    const r = parallel([z, z, z, z])
    expect(r.re).toBeCloseTo(10 / 4, 10)
    expect(r.im).toBeCloseTo(-20 / 4, 10)
  })

  it('ideal kısa devre kol ağı kısa devre eder', () => {
    // 1/0 üzerinden gitmek Infinity − Infinity = NaN üretirdi.
    const r = parallel([complex(50, 0), complex(0, 0)])
    expect(r).toEqual({ re: 0, im: 0 })
  })

  it('boş paralel listesi açık devredir', () => {
    expect(parallel([])).toEqual({ re: Infinity, im: 0 })
  })
})

describe('fiziksel kontrol — kondansatör kolu', () => {
  // Z(f) = ESR + jωESL + 1/(jωC). SRF'de endüktif ve kapasitif terimler
  // birbirini götürür; geriye yalnız ESR kalır.
  const C = 100e-9
  const ESL = 1e-9
  const ESR = 0.01

  const branch = (f) => {
    const w = 2 * Math.PI * f
    return series([complex(ESR, 0), complex(0, w * ESL), inv(complex(0, w * C))])
  }

  it('SRF değerinde empedans ESR ye iner', () => {
    const fSrf = 1 / (2 * Math.PI * Math.sqrt(ESL * C))
    expect(fSrf).toBeCloseTo(15.9155e6, -2)
    expect(abs(branch(fSrf))).toBeCloseTo(ESR, 9)
  })

  it('SRF altında kapasitif, üstünde endüktif davranır', () => {
    const fSrf = 1 / (2 * Math.PI * Math.sqrt(ESL * C))
    expect(branch(fSrf / 10).im).toBeLessThan(0)
    expect(branch(fSrf * 10).im).toBeGreaterThan(0)
  })
})
