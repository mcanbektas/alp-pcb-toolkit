import { describe, it, expect } from 'vitest'
import {
  junctionTemperature, heatsink, junctionFromSurface,
  copperStripResistance, dielectricResistance,
  parallelThermalPaths, temperatureRise,
  PSI_JT, PSI_JB,
  THERMAL_ERR_INVALID, THERMAL_ERR_NEGATIVE_SINK,
} from './thermal'
import { K_CU, K_FR4 } from './units'

const mm = (x) => x * 1e-3
const um = (x) => x * 1e-6

describe('junction sıcaklığı (spec §8.3)', () => {
  // spec §13 Test 4 — referans doğrulama testi
  it('referans: T_A = 40 °C, P = 2 W, θ_JA = 30 °C/W → T_J = 100 °C', () => {
    const r = junctionTemperature({ Ta: 40, P: 2, thetaJA: 30 })
    expect(r.Tj).toBeCloseTo(100, 12)
    expect(r.rise).toBeCloseTo(60, 12)
  })

  it('T_J,max verilirse marj ve maksimum güç hesaplanır', () => {
    const r = junctionTemperature({ Ta: 40, P: 2, thetaJA: 30, TjMax: 125 })
    expect(r.within).toBe(true)
    expect(r.margin).toBeCloseTo(25, 12)
    expect(r.Pmax).toBeCloseTo((125 - 40) / 30, 12)
  })

  it('sınır aşıldığında within false döner', () => {
    const r = junctionTemperature({ Ta: 85, P: 3, thetaJA: 40, TjMax: 125 })
    expect(r.Tj).toBeCloseTo(205, 12)
    expect(r.within).toBe(false)
    expect(r.margin).toBeLessThan(0)
  })

  it('θ_JA\'nın karta bağlı olduğunu bildirir', () => {
    expect(junctionTemperature({ Ta: 25, P: 1, thetaJA: 50 }).thetaIsBoardDependent).toBe(true)
  })

  it('sıfır güçte junction ortam sıcaklığındadır', () => {
    expect(junctionTemperature({ Ta: 25, P: 0, thetaJA: 50 }).Tj).toBeCloseTo(25, 12)
  })

  it('geçersiz termal direnç reddedilir', () => {
    expect(junctionTemperature({ Ta: 25, P: 1, thetaJA: 0 }).error).toBe(THERMAL_ERR_INVALID)
  })
})

describe('soğutucu (spec §8.4)', () => {
  it('θ_SA,max = (T_J,max − T_A)/P − θ_JC − θ_CS', () => {
    const r = heatsink({ Ta: 40, P: 10, thetaJC: 1.5, thetaCS: 0.5, TjMax: 125 })
    expect(r.budget).toBeCloseTo((125 - 40) / 10, 12)
    expect(r.thetaSAmax).toBeCloseTo(8.5 - 2, 12)
    expect(r.feasible).toBe(true)
  })

  it('paket ve arayüz bütçeyi yiyorsa soğutucu çözmez', () => {
    const r = heatsink({ Ta: 40, P: 50, thetaJC: 1.5, thetaCS: 0.5, TjMax: 125 })
    expect(r.feasible).toBe(false)
    expect(r.error).toBe(THERMAL_ERR_NEGATIVE_SINK)
  })

  it('seçilen θ_SA ile T_J = T_A + P·(θ_JC + θ_CS + θ_SA)', () => {
    const r = heatsink({ Ta: 40, P: 10, thetaJC: 1.5, thetaCS: 0.5, TjMax: 125, thetaSA: 5 })
    expect(r.Tj).toBeCloseTo(40 + 10 * 7, 12)
    expect(r.within).toBe(true)
    expect(r.thetaTotal).toBeCloseTo(7, 12)
  })

  it('yolun paylarını bildirir ve paylar 1 eder', () => {
    const r = heatsink({ Ta: 40, P: 10, thetaJC: 1.5, thetaCS: 0.5, TjMax: 125, thetaSA: 5 })
    expect(r.shares.sa).toBeGreaterThan(r.shares.jc)
    expect(r.shares.jc + r.shares.cs + r.shares.sa).toBeCloseTo(1, 12)
  })

  it('ortam sıcaklığı sınırın üstündeyse hata döner', () => {
    expect(heatsink({ Ta: 130, P: 5, thetaJC: 1, thetaCS: 0.5, TjMax: 125 }).error)
      .toBe(THERMAL_ERR_INVALID)
  })
})

describe('yüzey ölçümünden junction tahmini (spec §8.5)', () => {
  it('T_J ≈ T_top + Ψ_JT·P', () => {
    const r = junctionFromSurface({ Tsurface: 70, P: 2, psi: 3, metric: PSI_JT })
    expect(r.Tj).toBeCloseTo(76, 12)
  })

  it('T_J ≈ T_board + Ψ_JB·P', () => {
    const r = junctionFromSurface({ Tsurface: 65, P: 2, psi: 12, metric: PSI_JB })
    expect(r.Tj).toBeCloseTo(89, 12)
  })

  // Ψ bir yol direnci değildir; θ_JC ile değiştirilemez (spec §8.5)
  it('Ψ\'nin yol direnci olmadığını bildirir', () => {
    expect(junctionFromSurface({ Tsurface: 70, P: 2, psi: 3 }).isPathResistance).toBe(false)
  })

  it('tanımsız metrik reddedilir', () => {
    expect(junctionFromSurface({ Tsurface: 70, P: 2, psi: 3, metric: 'theta-jc' }).error)
      .toBe(THERMAL_ERR_INVALID)
  })
})

describe('bakır termal ağı (spec §8.6)', () => {
  it('şerit direnci R_θ = L / (k_Cu·W·t)', () => {
    const g = { L: mm(20), W: mm(2), t: um(35) }
    const r = copperStripResistance(g)
    expect(r.Rth).toBeCloseTo(g.L / (K_CU * g.W * g.t), 9)
    expect(r.k).toBe(K_CU)
  })

  it('dikey direnç R_θ = H / (k_FR4·A)', () => {
    const r = dielectricResistance({ H: mm(1.6), area: 1e-4 })
    expect(r.Rth).toBeCloseTo(mm(1.6) / (K_FR4 * 1e-4), 9)
    expect(r.k).toBe(K_FR4)
  })

  it('paralel yollar direnci düşürür', () => {
    const r = parallelThermalPaths([100, 100])
    expect(r.Rth).toBeCloseTo(50, 12)
    expect(r.shares[0]).toBeCloseTo(0.5, 12)
  })

  it('paralel yol payları toplamı 1 eder', () => {
    const r = parallelThermalPaths([50, 200, 400])
    expect(r.shares.reduce((a, x) => a + x, 0)).toBeCloseTo(1, 12)
    expect(r.shares[0]).toBeGreaterThan(r.shares[2])
  })

  it('ΔT = P · R_θ,eq', () => {
    const r = temperatureRise({ P: 1.5, Rth: 40 })
    expect(r.deltaT).toBeCloseTo(60, 12)
  })

  it('yalnızca iletim modellendiğini bildirir', () => {
    const r = temperatureRise({ P: 1, Rth: 30 })
    expect(r.firstOrder).toBe(true)
    expect(r.excludes).toContain('konveksiyon')
    expect(r.excludes).toContain('radyasyon')
  })

  it('geçersiz geometri reddedilir', () => {
    expect(copperStripResistance({ L: mm(20), W: 0, t: um(35) }).error).toBe(THERMAL_ERR_INVALID)
    expect(parallelThermalPaths([]).error).toBe(THERMAL_ERR_INVALID)
  })
})
