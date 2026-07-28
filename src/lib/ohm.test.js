import { describe, it, expect } from 'vitest'
import {
  ohmsLaw, parallelResistance, seriesResistance,
  seriesCapacitance, parallelCapacitance, twoInParallel,
} from './ohm'
import { expectErrorShapes } from './errorShape.testkit'

describe('Ohm kanunu', () => {
  it('V ve R\'den I ile P türetir', () => {
    const r = ohmsLaw({ V: 12, R: 4 })
    expect(r.I).toBe(3)
    expect(r.P).toBe(36)
  })

  it('R ve P\'den V ile I türetir', () => {
    const r = ohmsLaw({ R: 4, P: 36 })
    expect(r.V).toBeCloseTo(12, 12)
    expect(r.I).toBeCloseTo(3, 12)
  })

  it('tek değerle hesap yapmaz', () => {
    expect(ohmsLaw({ V: 12 }).error).toBe('insufficient')
  })

  it('negatif güç veya direnç reddedilir', () => {
    expect(ohmsLaw({ R: -4, P: 36 }).error).toBe('invalid')
  })

  it('tutarsız üçlü girişte sapma oranı verir', () => {
    // V = 12 ama I·R = 10 → sapma 2/12
    const r = ohmsLaw({ V: 12, I: 2, R: 5 })
    expect(r.inconsistency).toBeCloseTo(2 / 12, 12)
  })

  it('tutarlı üçlü girişte sapma sıfırdır', () => {
    expect(ohmsLaw({ V: 12, I: 3, R: 4 }).inconsistency).toBeCloseTo(0, 12)
  })
})

describe('seri / paralel', () => {
  it('seri direnç toplamdır', () => {
    expect(seriesResistance([10, 20, 30])).toBe(60)
  })

  it('paralel direnç', () => {
    expect(parallelResistance([10, 10])).toBeCloseTo(5, 12)
    expect(twoInParallel(10e3, 100e3)).toBeCloseTo(9090.909, 3)
  })

  it('seri kondansatör terslerin toplamıdır', () => {
    expect(seriesCapacitance([100e-9, 100e-9])).toBeCloseTo(50e-9, 15)
  })

  it('paralel kondansatör toplamdır', () => {
    expect(parallelCapacitance([100e-9, 100e-9])).toBeCloseTo(200e-9, 15)
  })

  it('sıfır dirençli kol paraleli kısa devre eder', () => {
    expect(parallelResistance([0, 100])).toBe(0)
  })
})

describe('hata sözleşmesi', () => {
  it('hata yükü kod taşır, cümle taşımaz', () => {
    expectErrorShapes([
      ohmsLaw({ V: 12 }),
      ohmsLaw({}),
      ohmsLaw({ R: -4, P: 36 }),
    ])
  })
})
