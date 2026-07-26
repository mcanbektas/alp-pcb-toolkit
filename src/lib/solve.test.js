import { describe, it, expect } from 'vitest'
import {
  brent, bisection, solveBounded, expandBracket,
  SOLVE_ERR_NO_BRACKET, SOLVE_ERR_INVALID,
} from './solve'

// Kök çözücü spec §13'te ayrı bir referans testi olarak listelenmiyor, ama tüm
// ters hesaplar (§3.3) buradan geçiyor. Motor sessizce yanlış kök döndürürse
// hata onu kullanan her ekrana yayılır — bu yüzden burada test ediliyor.

describe('brent', () => {
  it('x² − 2 kökünü bulur', () => {
    const r = brent((x) => x * x - 2, 0, 2)
    expect(r.error).toBeUndefined()
    expect(r.value).toBeCloseTo(Math.SQRT2, 10)
  })

  it('düz olmayan fonksiyonda da yakınsar', () => {
    // cos(x) − x, kök ≈ 0.739085133215
    const r = brent((x) => Math.cos(x) - x, 0, 1)
    expect(r.value).toBeCloseTo(0.7390851332151607, 10)
  })

  it('kök sınırdaysa sınırı döner', () => {
    const r = brent((x) => x - 3, 3, 10)
    expect(r.value).toBe(3)
    expect(r.iterations).toBe(0)
  })

  it('aralık kökü içermiyorsa hata döner, tahmin üretmez', () => {
    const r = brent((x) => x * x + 1, 0, 5)
    expect(r.error).toBe(SOLVE_ERR_NO_BRACKET)
    expect(r.value).toBeUndefined()
  })

  it('geçersiz aralıkta hata döner', () => {
    expect(brent((x) => x, 5, 1).error).toBe(SOLVE_ERR_INVALID)
    expect(brent((x) => x, NaN, 1).error).toBe(SOLVE_ERR_INVALID)
  })

  it('bisection ile aynı kökü verir', () => {
    const F = (x) => Math.exp(x) - 5 * x
    const b = brent(F, 0, 1)
    const s = bisection(F, 0, 1)
    expect(b.value).toBeCloseTo(s.value, 9)
  })

  it('bisection\'dan belirgin biçimde daha az adım kullanır', () => {
    const F = (x) => x * x * x - 20
    expect(brent(F, 0, 10).iterations).toBeLessThan(bisection(F, 0, 10).iterations)
  })
})

describe('bisection', () => {
  it('kökü bulur', () => {
    const r = bisection((x) => x * x * x - 27, 0, 10)
    expect(r.value).toBeCloseTo(3, 9)
  })

  it('aralık kökü içermiyorsa hata döner', () => {
    expect(bisection((x) => x + 1, 0, 5).error).toBe(SOLVE_ERR_NO_BRACKET)
  })
})

describe('expandBracket', () => {
  it('x0 çevresinden kökü kapsayan aralık üretir', () => {
    const F = (x) => x - 7
    const br = expandBracket(F, 1)
    expect(br.error).toBeUndefined()
    expect(F(br.a) * F(br.b)).toBeLessThanOrEqual(0)
  })

  it('fiziksel sınırların dışına çıkmaz', () => {
    // Kök 50'de ama arama 10 ile sınırlı → bulunamamalı, uydurulmamalı
    const br = expandBracket((x) => x - 50, 1, { min: 0, max: 10 })
    expect(br.error).toBe(SOLVE_ERR_NO_BRACKET)
  })
})

describe('solveBounded', () => {
  it('aralık verilmeden x0 çevresinde çözer', () => {
    const r = solveBounded((W) => W * W - 12, { x0: 1 })
    expect(r.value).toBeCloseTo(Math.sqrt(12), 9)
  })

  it('verilen aralıkta çözer', () => {
    const r = solveBounded((x) => Math.log(x) - 1, { a: 0.1, b: 10 })
    expect(r.value).toBeCloseTo(Math.E, 9)
  })

  it('negatif kökü fiziksel sınırla dışarıda bırakır', () => {
    // (x+4)(x−3) köklerinden −4, min=0 sınırı yüzünden asla dönmemeli
    const F = (x) => (x + 4) * (x - 3)
    const r = solveBounded(F, { x0: 1, min: 0 })
    expect(r.value).toBeCloseTo(3, 9)
    expect(r.value).toBeGreaterThan(0)
  })

  it('sınırlar içinde kök yoksa hata döner', () => {
    const r = solveBounded((x) => x + 5, { x0: 1, min: 0, max: 100 })
    expect(r.error).toBe(SOLVE_ERR_NO_BRACKET)
  })
})
