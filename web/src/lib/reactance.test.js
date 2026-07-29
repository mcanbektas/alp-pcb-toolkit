import { describe, it, expect } from 'vitest'
import { seriesRLC, reactanceC, reactanceL } from './reactance'
import { expectErrorShapes } from './errorShape.testkit'

describe('reaktans', () => {
  it('X_C = 1/(2πfC)', () => {
    expect(reactanceC(1e6, 1e-9)).toBeCloseTo(1 / (2 * Math.PI * 1e6 * 1e-9), 9)
  })

  it('X_L = 2πfL', () => {
    expect(reactanceL(1e6, 1e-6)).toBeCloseTo(2 * Math.PI * 1e6 * 1e-6, 12)
  })
})

describe('seri RLC', () => {
  const L = 1e-6
  const C = 1e-9
  const R = 10
  const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C))

  it('rezonans frekansı ve Q', () => {
    const r = seriesRLC({ R, L, C, f: f0 })
    expect(r.f0).toBeCloseTo(f0, 3)
    // Rezonansta XL = XC → reaktans sıfır, empedans saf direnç
    expect(r.X).toBeCloseTo(0, 6)
    expect(r.magnitude).toBeCloseTo(R, 6)
    expect(r.kind).toBe('resistive')
    // Q = ω₀L/R = 1/(ω₀CR) — iki tanım aynı sonucu vermeli
    const w0 = 2 * Math.PI * f0
    expect(r.Q).toBeCloseTo(1 / (w0 * C * R), 6)
    expect(r.BW).toBeCloseTo(f0 / r.Q, 3)
  })

  it('rezonans altında kapasitif, üstünde endüktiftir', () => {
    expect(seriesRLC({ R, L, C, f: 1e6 }).kind).toBe('capacitive')
    expect(seriesRLC({ R, L, C, f: 100e6 }).kind).toBe('inductive')
  })

  it('faz açısı işareti reaktansı izler', () => {
    expect(seriesRLC({ R, L, C, f: 100e6 }).phaseDeg).toBeGreaterThan(0)
    expect(seriesRLC({ R, L, C, f: 1e6 }).phaseDeg).toBeLessThan(0)
  })

  it('geçersiz girişte hesap yapmaz', () => {
    expect(seriesRLC({ R: 10, L: 1e-6, C: 0, f: 1e6 }).error).toBe('invalid')
  })
})

describe('hata sözleşmesi', () => {
  it('hata yükü kod taşır, cümle taşımaz', () => {
    expectErrorShapes([
      seriesRLC({ R: 10, L: 1e-6, C: 0, f: 1e6 }),
      seriesRLC({ R: -1, L: 1e-6, C: 1e-9, f: 1e6 }),
      seriesRLC({ R: 10, L: 1e-6, C: 1e-9, f: 0 }),
    ])
  })
})
