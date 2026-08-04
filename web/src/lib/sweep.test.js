import { describe, it, expect } from 'vitest'
import {
  logspace, pointsPerDecade, toDb,
  SWEEP_ERR_NONPOSITIVE, SWEEP_ERR_RANGE, SWEEP_ERR_POINTS,
} from './sweep'

describe('logspace', () => {
  // Sözleşmenin sert kısmı: uçlar TAM eşit olmalı. 10^log10(1e9) turu son bitte
  // kayma bırakıyor ve hedef empedans çizgisiyle sweep ucu aynı frekansta
  // buluşmuyordu; rapor ile grafik o noktada ayrışır.
  it('ilk ve son nokta tam olarak f_min ve f_max', () => {
    const { values } = logspace(1e3, 1e9, 101)
    expect(values[0]).toBe(1e3)
    expect(values[100]).toBe(1e9)
  })

  it('istenen sayıda nokta döner', () => {
    expect(logspace(1, 100, 7).values).toHaveLength(7)
  })

  it('iki nokta yalnız uçlardır', () => {
    expect(logspace(10, 1000, 2).values).toEqual([10, 1000])
  })

  it('log uzayında eşit aralıklı', () => {
    const { values } = logspace(1, 1000, 4) // 1, 10, 100, 1000
    expect(values[1]).toBeCloseTo(10, 9)
    expect(values[2]).toBeCloseTo(100, 9)

    const steps = values.slice(1).map((v, i) => Math.log10(v) - Math.log10(values[i]))
    steps.forEach((s) => expect(s).toBeCloseTo(1, 9))
  })

  it('artan sırada ve hepsi sonlu', () => {
    const { values } = logspace(1e-3, 1e12, 250)
    values.forEach((v) => expect(Number.isFinite(v)).toBe(true))
    values.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(values[i]))
  })

  it('sıfır veya negatif frekans logaritmik eksende hatadır', () => {
    expect(logspace(0, 1e6, 10).error).toBe(SWEEP_ERR_NONPOSITIVE)
    expect(logspace(-1, 1e6, 10).error).toBe(SWEEP_ERR_NONPOSITIVE)
    expect(logspace(1e3, -5, 10).error).toBe(SWEEP_ERR_NONPOSITIVE)
  })

  it('çok küçük ama pozitif frekans sıfıra yuvarlanmaz', () => {
    const { values, error } = logspace(1e-6, 1, 5)
    expect(error).toBeUndefined()
    expect(values[0]).toBe(1e-6)
  })

  it('ters veya sıfır genişlikli aralık hatadır', () => {
    expect(logspace(1e6, 1e3, 10).error).toBe(SWEEP_ERR_RANGE)
    expect(logspace(1e6, 1e6, 10).error).toBe(SWEEP_ERR_RANGE)
    expect(logspace(NaN, 1e6, 10).error).toBe(SWEEP_ERR_RANGE)
    expect(logspace(1, Infinity, 10).error).toBe(SWEEP_ERR_RANGE)
  })

  it('nokta sayısı tamsayı ve en az iki olmalı', () => {
    expect(logspace(1, 10, 1).error).toBe(SWEEP_ERR_POINTS)
    expect(logspace(1, 10, 0).error).toBe(SWEEP_ERR_POINTS)
    expect(logspace(1, 10, 10.5).error).toBe(SWEEP_ERR_POINTS)
  })
})

describe('pointsPerDecade', () => {
  it('dekad sayısından toplam noktayı verir', () => {
    expect(pointsPerDecade(1e3, 1e9, 10)).toBe(61) // 6 dekad × 10 + 1
  })

  it('geçersiz girdide en az iki nokta döner', () => {
    expect(pointsPerDecade(0, 1e9, 10)).toBe(2)
    expect(pointsPerDecade(1e9, 1e3, 10)).toBe(2)
    expect(pointsPerDecade(1e3, 1e9, 0)).toBe(2)
  })
})

describe('toDb', () => {
  it('büyüklüğü dB ye çevirir', () => {
    expect(toDb(1)).toBe(0)
    expect(toDb(10)).toBeCloseTo(20, 12)
    expect(toDb(0.1)).toBeCloseTo(-20, 12)
  })

  it('sıfır ve negatif büyüklükte NaN döner, −Infinity değil', () => {
    expect(Number.isNaN(toDb(0))).toBe(true)
    expect(Number.isNaN(toDb(-1))).toBe(true)
    expect(Number.isNaN(toDb(Infinity))).toBe(true)
  })
})
