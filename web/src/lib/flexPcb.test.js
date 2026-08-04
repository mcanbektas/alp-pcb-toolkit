import { describe, it, expect } from 'vitest'
import { rhoCuAt } from './units'
import { STATUS_OK, STATUS_DANGER, STATUS_UNKNOWN } from './dfmCheck'
import {
  copperStrain, outerSurfaceStrain, strainPercent,
  minBendRadiusFromStrain, minBendRadiusFromStrainSymmetric,
  vendorMinBendRadius, bendArcLength, bendSurfaceLengths, elongationDifference,
  copperArea, traceResistance, parallelTraceResistance,
  voltageDrop, powerLoss, cycleLife, bendClearanceChecks, flexPcbPlan,
  FLEX_ERR_INVALID, FLEX_ERR_NEGATIVE_INNER_LENGTH,
} from './flexPcb'

describe('REV2 §15.13 referans testi', () => {
  // Double-layer flex: t_total = 0.2 mm, K_b = 12 → R_min,vendor = 2.4 mm.
  // Simetrik neutral-axis kabulüyle ve R = 2.4 mm iken ε ≈ 0.04167 (≈%4.17).
  const tTotal = 0.2e-3
  const Kb = 12

  it('üretici çarpanıyla minimum bend radius 2.4 mm', () => {
    expect(vendorMinBendRadius({ Kb, tTotal }) * 1e3).toBeCloseTo(2.4, 9)
  })

  it('R = 2.4 mm iken simetrik strain ≈ 0.04167 (≈%4.17)', () => {
    const R = vendorMinBendRadius({ Kb, tTotal })
    const epsilon = outerSurfaceStrain({ tTotal, R })
    expect(epsilon).toBeCloseTo(0.041667, 5)
    expect(strainPercent({ epsilon })).toBeCloseTo(4.17, 2)
  })

  it('flexPcbPlan uçtan uca aynı referans sonucu üretir', () => {
    const R = vendorMinBendRadius({ Kb, tTotal })
    const r = flexPcbPlan({ tTotal, R, Kb })
    expect(r.ok).toBe(true)
    expect(r.vendorMinRadius * 1e3).toBeCloseTo(2.4, 9)
    expect(r.strainPercent).toBeCloseTo(4.17, 2)
  })
})

describe('§15.3 bend strain', () => {
  it('neutral axis biliniyorsa ε = y/R', () => {
    expect(copperStrain({ y: 0.5e-3, R: 5e-3 })).toBeCloseTo(0.1, 12)
  })

  it('R ≤ 0 için NaN döner', () => {
    expect(Number.isNaN(copperStrain({ y: 0.5e-3, R: 0 }))).toBe(true)
    expect(Number.isNaN(outerSurfaceStrain({ tTotal: 0.2e-3, R: -1e-3 }))).toBe(true)
  })
})

describe('§15.4 izin verilen strain’den minimum bend radius', () => {
  it('neutral axis biliniyorsa R_min = y/ε_allow', () => {
    expect(minBendRadiusFromStrain({ y: 1e-3, epsilonAllow: 0.02 })).toBeCloseTo(0.05, 12)
  })

  it('simetrik yaklaşımda R_min = t_total/(2·ε_allow)', () => {
    expect(minBendRadiusFromStrainSymmetric({ tTotal: 0.2e-3, epsilonAllow: 0.05 })).toBeCloseTo(2e-3, 12)
  })

  it('epsilonAllow ≤ 0 için NaN döner — gizli varsayılan yok', () => {
    expect(Number.isNaN(minBendRadiusFromStrain({ y: 1e-3, epsilonAllow: 0 }))).toBe(true)
  })
})

describe('§15.6 bend uzunluğu', () => {
  it('l_bend = R·θ_rad', () => {
    expect(bendArcLength({ R: 0.01, thetaRad: 2 })).toBeCloseTo(0.02, 12)
  })

  it('dış/iç yüzey uzunlukları ve uzama farkı tutarlı', () => {
    const R = 5e-3
    const y = 1e-3
    const thetaRad = Math.PI / 2
    const { outer, inner } = bendSurfaceLengths({ R, y, thetaRad })
    expect(outer).toBeCloseTo((R + y) * thetaRad, 15)
    expect(inner).toBeCloseTo((R - y) * thetaRad, 15)
    // Δl = 2yθ = l_outer − l_inner (aynı iki formülün tutarlılığı)
    expect(outer - inner).toBeCloseTo(elongationDifference({ y, thetaRad }), 12)
  })

  it('y > R iken iç yüzey negatif çıkar — sıfıra kırpılmaz, ayrı hata koduyla bildirilir', () => {
    const r = bendSurfaceLengths({ R: 1e-3, y: 2e-3, thetaRad: 1 })
    expect(r.error).toBe(FLEX_ERR_NEGATIVE_INNER_LENGTH)
    expect(r.inner).toBeLessThan(0)
    expect(r.inner).toBeCloseTo(-1e-3, 12)
    expect(r.outer).toBeCloseTo(3e-3, 12)
  })

  it('geçersiz geometri FLEX_ERR_INVALID döner', () => {
    expect(bendSurfaceLengths({ R: 0, y: 1e-3, thetaRad: 1 }).error).toBe(FLEX_ERR_INVALID)
  })
})

describe('§15.7 trace direnci', () => {
  it('A_Cu = w·t', () => {
    expect(copperArea({ w: 1e-3, t: 1e-3 })).toBeCloseTo(1e-6, 15)
  })

  it('R_trace = ρ_20·l/(w·t) — T verilmezse 20 °C (düzeltmesiz)', () => {
    // l=1 m, w=1 mm, t=1 mm → A=1e-6 m² → R = 1.724e-8/1e-6 = 0.01724 Ω tam
    expect(traceResistance({ l: 1, w: 1e-3, t: 1e-3 })).toBeCloseTo(0.01724, 12)
  })

  it('sıcaklık düzeltmesi units.js → rhoCuAt ile BİREBİR AYNI formülü kullanır', () => {
    const l = 1
    const w = 1e-3
    const t = 1e-3
    const T = 40
    const expected = (rhoCuAt(T) * l) / (w * t)
    expect(traceResistance({ l, w, t, T })).toBeCloseTo(expected, 15)
    expect(traceResistance({ l, w, t, T })).toBeGreaterThan(traceResistance({ l, w, t, T: 20 }))
  })

  it('R_eq = R_trace/N — paralel eş trace', () => {
    expect(parallelTraceResistance({ rSingle: 0.01724, n: 4 })).toBeCloseTo(0.00431, 12)
  })

  it('geçersiz girişte NaN döner', () => {
    expect(Number.isNaN(traceResistance({ l: 1, w: 0, t: 1e-3 }))).toBe(true)
    expect(Number.isNaN(parallelTraceResistance({ rSingle: 5, n: 0 }))).toBe(true)
  })
})

describe('§15.8 gerilim düşümü ve güç', () => {
  it('V_drop = I·R, P_loss = I²·R', () => {
    expect(voltageDrop({ current: 2, resistance: 0.5 })).toBeCloseTo(1, 12)
    expect(powerLoss({ current: 2, resistance: 0.5 })).toBeCloseTo(2, 12)
  })
})

describe('§15.9 via/pad/stiffener bend clearance kontrolleri', () => {
  it('üretici eşiği verilmezse unknown döner — gizli varsayılan üretici limiti yok', () => {
    const r = bendClearanceChecks({})
    expect(r.via.status).toBe(STATUS_UNKNOWN)
    expect(r.pad.status).toBe(STATUS_UNKNOWN)
    expect(r.stiffener.status).toBe(STATUS_UNKNOWN)
  })

  it('mesafe eşiği sağlıyorsa ok, sağlamıyorsa danger', () => {
    const r = bendClearanceChecks({
      viaDistance: 1e-3, viaMinDistance: 0.5e-3,
      padDistance: 0.2e-3, padMinDistance: 0.5e-3,
    })
    expect(r.via.status).toBe(STATUS_OK)
    expect(r.pad.status).toBe(STATUS_DANGER)
  })
})

describe('§15.10 dynamic flex cycle life', () => {
  it('A ve b verilmişse N_f = A·ε^(−b)', () => {
    expect(cycleLife({ A: 1000, b: 2, epsilon: 0.05 })).toBeCloseTo(400000, 6)
  })

  it('A veya b eksikse NaN döner — evrensel kapalı form kullanılmaz', () => {
    expect(Number.isNaN(cycleLife({ A: null, b: 2, epsilon: 0.05 }))).toBe(true)
  })
})

describe('flexPcbPlan', () => {
  it('geçersiz temel girdide FLEX_ERR_INVALID döner', () => {
    expect(flexPcbPlan({ tTotal: -1, R: 5e-3 }).error).toBe(FLEX_ERR_INVALID)
  })

  it('trace girdisi (l/w/t) verilmezse trace bloğu null kalır, bükülme sonucu etkilenmez', () => {
    const r = flexPcbPlan({ tTotal: 0.2e-3, R: 2.4e-3 })
    expect(r.ok).toBe(true)
    expect(r.traceResistance).toBeNull()
    expect(r.voltageDrop).toBeNull()
    expect(r.powerLoss).toBeNull()
    expect(r.copperArea).toBeNull()
    expect(Number.isFinite(r.strain)).toBe(true)
  })

  it('thetaDeg verilmezse bend-uzunluğu ailesi null kalır', () => {
    const r = flexPcbPlan({ tTotal: 0.2e-3, R: 2.4e-3, y: 0.05e-3 })
    expect(r.arcLength).toBeNull()
    expect(r.surfaceLengths).toBeNull()
    expect(r.elongation).toBeNull()
  })

  it('y verilirse neutral-axis-known strain ve bend uzunlukları hesaplanır', () => {
    const r = flexPcbPlan({ tTotal: 0.2e-3, R: 2.4e-3, y: 0.05e-3, thetaDeg: 90 })
    expect(r.strain).toBeCloseTo(copperStrain({ y: 0.05e-3, R: 2.4e-3 }), 15)
    expect(r.surfaceLengths.outer).toBeGreaterThan(r.arcLength)
    expect(r.surfaceLengths.inner).toBeLessThan(r.arcLength)
  })

  it('epsilonAllow ve Kb verilmezse strainMinRadius/vendorMinRadius null kalır', () => {
    const r = flexPcbPlan({ tTotal: 0.2e-3, R: 2.4e-3 })
    expect(r.strainMinRadius).toBeNull()
    expect(r.vendorMinRadius).toBeNull()
  })

  it('l/w/t/current birlikte verilirse trace direnci, gerilim düşümü ve güç kaybı dolar', () => {
    const r = flexPcbPlan({
      tTotal: 0.2e-3, R: 2.4e-3, l: 1, w: 1e-3, t: 1e-3, n: 4, current: 2,
    })
    expect(r.traceResistanceSingle).toBeCloseTo(0.01724, 12)
    expect(r.traceResistance).toBeCloseTo(0.00431, 12)
    expect(r.voltageDrop).toBeCloseTo(2 * 0.00431, 12)
    expect(r.powerLoss).toBeCloseTo(2 * 2 * 0.00431, 12)
  })

  it('cycleA/cycleB birlikte verilmezse cycleLife null kalır, ikisi de verilirse hesaplanır', () => {
    const withoutCycle = flexPcbPlan({ tTotal: 0.2e-3, R: 2.4e-3 })
    expect(withoutCycle.cycleLife).toBeNull()

    const withCycle = flexPcbPlan({ tTotal: 0.2e-3, R: 2.4e-3, cycleA: 1000, cycleB: 2 })
    expect(withCycle.cycleLife).toBeCloseTo(cycleLife({ A: 1000, b: 2, epsilon: withCycle.strain }), 6)
  })
})
