import { describe, it, expect } from 'vitest'
import {
  rectToPolar, polarToRect, magnitudeOf, phaseOf, reactanceKind, quadrantOf,
  degToRad, radToDeg,
  COMPLEX_ERR_UNDEFINED_PHASE, COMPLEX_ERR_NEGATIVE_MAGNITUDE, COMPLEX_ERR_INVALID,
  KIND_INDUCTIVE, KIND_CAPACITIVE, KIND_RESISTIVE,
} from './convertComplex'

describe('yardımcılar', () => {
  it('|Z| = √(R² + X²)', () => {
    // 3-4-5 üçgeni — elle doğrulanabilir
    expect(magnitudeOf(3, 4)).toBeCloseTo(5, 12)
    expect(magnitudeOf(50, -30)).toBeCloseTo(Math.sqrt(3400), 12)
  })

  it('φ hesabı atan2 ile yapılır', () => {
    // atan(X/R) R < 0 iken 180° yanlış açı verir, atan2 vermez
    expect(phaseOf(-3, 4)).toBeCloseTo(Math.atan2(4, -3), 12)
    expect(phaseOf(-3, 4)).not.toBeCloseTo(Math.atan(4 / -3), 6)
    // R = 0'da atan sıfıra bölerdi; atan2 tam +90° döner
    expect(radToDeg(phaseOf(0, 5))).toBeCloseTo(90, 12)
  })

  it('derece ↔ radyan gidiş dönüşü', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 12)
    expect(radToDeg(Math.PI / 2)).toBeCloseTo(90, 12)
    expect(radToDeg(degToRad(37.5))).toBeCloseTo(37.5, 12)
  })

  it('X işareti empedansın türünü belirler', () => {
    expect(reactanceKind(30)).toBe(KIND_INDUCTIVE)
    expect(reactanceKind(-30)).toBe(KIND_CAPACITIVE)
    expect(reactanceKind(0)).toBe(KIND_RESISTIVE)
  })

  it('çeyrek numarası bileşen işaretlerinden gelir', () => {
    expect(quadrantOf(3, 4)).toBe(1)
    expect(quadrantOf(-3, 4)).toBe(2)
    expect(quadrantOf(-3, -4)).toBe(3)
    expect(quadrantOf(3, -4)).toBe(4)
    // Eksen üzerinde çeyrek yoktur
    expect(quadrantOf(0, 4)).toBe(0)
    expect(quadrantOf(3, 0)).toBe(0)
  })
})

describe('dikdörtgensel → polar', () => {
  it('birinci çeyrek: R = 3, X = 4 → 5 ∠ 53.130°', () => {
    const r = rectToPolar({ R: 3, X: 4 })
    expect(r.magnitude).toBeCloseTo(5, 12)
    expect(r.phaseDeg).toBeCloseTo(53.13010235415598, 10)
    expect(r.phase).toBeCloseTo(0.9272952180016122, 12)
    expect(r.kind).toBe(KIND_INDUCTIVE)
    expect(r.quadrant).toBe(1)
  })

  it('dördüncü çeyrek: R = 50, X = −30 → 58.310 ∠ −30.964°', () => {
    const r = rectToPolar({ R: 50, X: -30 })
    expect(r.magnitude).toBeCloseTo(58.309518948453004, 10)
    expect(r.phaseDeg).toBeCloseTo(-30.96375653207352, 10)
    expect(r.kind).toBe(KIND_CAPACITIVE)
    expect(r.quadrant).toBe(4)
  })

  // atan(X/R) ikinci ve üçüncü çeyrekte 180° yanlış açı verir; atan2 vermez.
  it('ikinci çeyrek: R = −3, X = 4 → 126.870°, atan(X/R) ise −53.130° derdi', () => {
    const r = rectToPolar({ R: -3, X: 4 })
    expect(r.magnitude).toBeCloseTo(5, 12)
    expect(r.phaseDeg).toBeCloseTo(126.86989764584402, 10)
    expect(radToDeg(Math.atan(4 / -3))).toBeCloseTo(-53.13010235415598, 10)
    expect(r.quadrant).toBe(2)
  })

  it('üçüncü çeyrek: R = −3, X = −4 → −126.870°, atan(X/R) ise +53.130° derdi', () => {
    const r = rectToPolar({ R: -3, X: -4 })
    expect(r.phaseDeg).toBeCloseTo(-126.86989764584402, 10)
    expect(radToDeg(Math.atan(-4 / -3))).toBeCloseTo(53.13010235415598, 10)
    expect(r.quadrant).toBe(3)
  })

  it('saf reaktans: R = 0, X = 5 → 5 ∠ 90° (atan sıfıra bölerdi)', () => {
    const r = rectToPolar({ R: 0, X: 5 })
    expect(r.magnitude).toBeCloseTo(5, 12)
    expect(r.phaseDeg).toBeCloseTo(90, 12)
    expect(r.quadrant).toBe(0)
  })

  it('R = 0 ve X = 0 iken faz tanımsızdır', () => {
    expect(rectToPolar({ R: 0, X: 0 }).error).toBe(COMPLEX_ERR_UNDEFINED_PHASE)
  })

  it('sonlu olmayan girişte hesap yapmaz', () => {
    expect(rectToPolar({ R: NaN, X: 1 }).error).toBe(COMPLEX_ERR_INVALID)
    expect(rectToPolar({ R: 1, X: Infinity }).error).toBe(COMPLEX_ERR_INVALID)
  })
})

describe('polar → dikdörtgensel', () => {
  it('10 ∠ 60° → R = 5, X = 8.6603', () => {
    const r = polarToRect({ magnitude: 10, phase: degToRad(60) })
    expect(r.R).toBeCloseTo(5, 12)
    expect(r.X).toBeCloseTo(8.660254037844387, 12)
    expect(r.kind).toBe(KIND_INDUCTIVE)
  })

  it('1 ∠ 180° → R = −1, X = 0 ve saf dirençli sayılır', () => {
    const r = polarToRect({ magnitude: 1, phase: Math.PI })
    expect(r.R).toBeCloseTo(-1, 12)
    expect(r.X).toBeCloseTo(0, 12)
    // sin(π) tam sıfır değil 1.22e-16 döner; sınıflandırma bunu artık sayar
    expect(r.kind).toBe(KIND_RESISTIVE)
    expect(r.quadrant).toBe(0)
  })

  it('ana değer dışındaki açı eşdeğerine indirgenir: 270° → −90°', () => {
    const r = polarToRect({ magnitude: 2, phase: degToRad(270) })
    expect(r.phaseDeg).toBeCloseTo(270, 10)
    expect(r.phasePrincipalDeg).toBeCloseTo(-90, 10)
    expect(r.kind).toBe(KIND_CAPACITIVE)
  })

  it('|Z| = 0 iken faz tanımsız, |Z| < 0 kabul edilmez', () => {
    expect(polarToRect({ magnitude: 0, phase: 1 }).error).toBe(COMPLEX_ERR_UNDEFINED_PHASE)
    expect(polarToRect({ magnitude: -1, phase: 1 }).error).toBe(COMPLEX_ERR_NEGATIVE_MAGNITUDE)
  })
})

describe('gidiş dönüş tutarlılığı', () => {
  const cases = [
    { R: 3, X: 4 },
    { R: -3, X: 4 },
    { R: -3, X: -4 },
    { R: 50, X: -30 },
    { R: 0, X: -12 },
    { R: 1e-6, X: 2e-6 },
  ]

  it('R + jX → |Z| ∠ φ → R + jX aynı noktaya döner', () => {
    for (const c of cases) {
      const p = rectToPolar(c)
      const back = polarToRect({ magnitude: p.magnitude, phase: p.phase })
      expect(back.R).toBeCloseTo(c.R, 12)
      expect(back.X).toBeCloseTo(c.X, 12)
    }
  })

  it('|Z| ∠ φ → R + jX → |Z| ∠ φ aynı büyüklük ve açıyı verir', () => {
    for (const deg of [-179, -90, -30, 0, 45, 120, 180]) {
      const p = polarToRect({ magnitude: 7.5, phase: degToRad(deg) })
      const back = rectToPolar({ R: p.R, X: p.X })
      expect(back.magnitude).toBeCloseTo(7.5, 10)
      expect(back.phaseDeg).toBeCloseTo(deg, 10)
    }
  })
})
