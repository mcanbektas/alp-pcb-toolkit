import { describe, it, expect } from 'vitest'
import {
  dynamicResistance, clampVoltageLinear, clampVoltageFromTable,
  solveTvsPulseCurrent, peakPulsePower, pulseEnergy,
  pathInductanceOvershoot, icPeakVoltage, capacitanceCutoffFrequency,
  tvsEsdProtectionPlan,
  TVS_ERR_INVALID, TVS_ERR_NO_CONVERGENCE,
  TVS_WAVEFORM_TRIANGULAR, TVS_WAVEFORM_CUSTOM,
} from './tvsEsd'

describe('REV2 §14.12 referans testi', () => {
  // V_surge=100V, V_clamp=33V (rDyn=0 → clamp sabit → V_BR=33V ile aynı),
  // R_source=2Ω, R_series verilmemiş → 0. Beklenen: 33.5 A, 1105.5 W.
  const r = solveTvsPulseCurrent({ vSurge: 100, rSource: 2, vBR: 33, rDyn: 0, iT: 0 })

  it('pulse akımı 33.5 A, analitik yoldan', () => {
    expect(r.current).toBeCloseTo(33.5, 9)
    expect(r.method).toBe('analytic')
    expect(r.clamped).toBe(false)
  })

  it('peak pulse power 1105.5 W', () => {
    const vClamp = clampVoltageLinear({ vBR: 33, rDyn: 0, iT: 0, current: r.current })
    expect(vClamp).toBeCloseTo(33, 9)
    expect(peakPulsePower({ vClamp, iPP: r.current })).toBeCloseTo(1105.5, 9)
  })
})

describe('analitik yol (tam lineer model)', () => {
  // V_surge=200V, V_BR=30V, R_dyn=2Ω, I_T=1A, R_source=5Ω, R_series=1Ω.
  // I = (200 − 30 + 2·1) / (5+1+2) = 172/8 = 21.5 A. V_clamp(21.5) = 71 V.
  const r = solveTvsPulseCurrent({
    vSurge: 200, rSource: 5, rSeries: 1, vBR: 30, rDyn: 2, iT: 1,
  })

  it('kapalı form 21.5 A verir', () => {
    expect(r.method).toBe('analytic')
    expect(r.current).toBeCloseTo(21.5, 9)
  })

  it('bu akımdaki clamp voltajı 71 V', () => {
    expect(clampVoltageLinear({ vBR: 30, rDyn: 2, iT: 1, current: r.current })).toBeCloseTo(71, 9)
  })
})

describe('sayısal yol ve analitik/sayısal tutarlılık', () => {
  it('sabit clamp fonksiyonu zorlanınca da 33.5 A\'ya yakınsar (referans örneği)', () => {
    const analytic = solveTvsPulseCurrent({ vSurge: 100, rSource: 2, vBR: 33, rDyn: 0, iT: 0 })
    const numeric = solveTvsPulseCurrent({
      vSurge: 100, rSource: 2, vBR: 33, clampVoltage: () => 33,
    })
    expect(analytic.method).toBe('analytic')
    expect(numeric.method).toBe('bisection')
    expect(numeric.current).toBeCloseTo(analytic.current, 6)
    expect(numeric.current).toBeCloseTo(33.5, 6)
  })

  it('doğrusal olmayan (tablo tabanlı) clamp, aynı lineer örnekte analitikle örtüşür', () => {
    // Aynı lineer modelin (V_BR=30, R_dyn=2, I_T=1) örneklerinden kurulmuş
    // parçalı doğrusal tablo — tablo doğrusal olduğu için interpolasyon
    // hatası yok, karşılaştırma tam tutarlı olmalı.
    const table = [0, 10, 20, 21.5, 30, 50].map((i) => ({ i, v: 28 + 2 * i }))
    const clampVoltage = clampVoltageFromTable(table)

    const analytic = solveTvsPulseCurrent({
      vSurge: 200, rSource: 5, rSeries: 1, vBR: 30, rDyn: 2, iT: 1,
    })
    const numeric = solveTvsPulseCurrent({
      vSurge: 200, rSource: 5, rSeries: 1, vBR: 30, clampVoltage,
    })

    expect(analytic.method).toBe('analytic')
    expect(numeric.method).toBe('bisection')
    expect(numeric.iterations).toBeGreaterThan(0)
    expect(numeric.current).toBeCloseTo(analytic.current, 4)
    expect(numeric.current).toBeCloseTo(21.5, 4)
  })
})

describe('negatif sonuç I=0\'a sınırlandırılır', () => {
  it('analitik yolda: yetersiz surge (V_surge < V_BR) → I=0', () => {
    const r = solveTvsPulseCurrent({ vSurge: 30, rSource: 2, vBR: 33, rDyn: 0, iT: 0 })
    expect(r.method).toBe('analytic')
    expect(r.current).toBe(0)
    expect(r.clamped).toBe(true)
  })

  it('sayısal yolda: aynı yetersiz-surge durumu → I=0, genişletmeye gerek kalmadan', () => {
    const r = solveTvsPulseCurrent({ vSurge: 30, rSource: 2, vBR: 33, clampVoltage: () => 33 })
    expect(r.method).toBe('bisection')
    expect(r.current).toBe(0)
    expect(r.clamped).toBe(true)
    expect(r.expansions).toBe(0)
  })
})

describe('TVS_SOLVER_NO_CONVERGENCE', () => {
  it('residual NaN üretirse hata döner', () => {
    const r = solveTvsPulseCurrent({
      vSurge: 100, rSource: 2, vBR: 33, clampVoltage: () => NaN,
    })
    expect(r.error).toBe(TVS_ERR_NO_CONVERGENCE)
  })

  it('kök 16 genişletmede kapsanmıyorsa hata döner (genişletme sınırı gerçekten uygulanıyor)', () => {
    // I_max başlangıcı = (100.001−100)/1000 = 1e-6 A. Gerçek kök ise
    // clampVoltage≡0 sabitken (100.001−0)/1000 ≈ 0.100001 A — başlangıç
    // tahmininin ~1e5 katı. 1e-6·2^16 ≈ 0.0655 < 0.100001: 16 katlama da
    // yetmiyor, kök hiç kapsanmıyor.
    const r = solveTvsPulseCurrent({
      vSurge: 100.001, rSource: 1000, vBR: 100, clampVoltage: () => 0,
    })
    expect(r.error).toBe(TVS_ERR_NO_CONVERGENCE)
    expect(r.expansions).toBe(16)
  })

  it('lineer model paydası (R_source+R_series+R_dyn) ≤ 0 ise sayısal yola düşer ve zarifçe hata döner', () => {
    // R_dyn=−5 çok negatif: F(I) azalan, I>0 için asla sıfırı kesmiyor.
    const r = solveTvsPulseCurrent({
      vSurge: 100, rSource: 2, vBR: 33, rDyn: -5, iT: 0,
    })
    expect(r.error).toBe(TVS_ERR_NO_CONVERGENCE)
  })
})

describe('girdi doğrulama', () => {
  it('sonlu olmayan V_surge → TVS_ERR_INVALID', () => {
    expect(solveTvsPulseCurrent({ vSurge: NaN, rSource: 2, vBR: 33 }).error).toBe(TVS_ERR_INVALID)
  })

  it('negatif R_source → TVS_ERR_INVALID', () => {
    expect(solveTvsPulseCurrent({ vSurge: 100, rSource: -1, vBR: 33 }).error).toBe(TVS_ERR_INVALID)
  })

  it('R_source+R_series=0 → TVS_ERR_INVALID', () => {
    expect(solveTvsPulseCurrent({ vSurge: 100, rSource: 0, rSeries: 0, vBR: 33 }).error).toBe(TVS_ERR_INVALID)
  })

  it('eksik V_BR → TVS_ERR_INVALID', () => {
    expect(solveTvsPulseCurrent({ vSurge: 100, rSource: 2, vBR: NaN }).error).toBe(TVS_ERR_INVALID)
  })
})

describe('yardımcı fonksiyonlar', () => {
  it('dynamicResistance: datasheet iki noktasından R_dyn', () => {
    expect(dynamicResistance({ vC: 33, vBR: 30, iPP: 10, iT: 1 })).toBeCloseTo(1 / 3, 12)
  })

  it('dynamicResistance: I_PP ≤ I_T ise NaN', () => {
    expect(Number.isNaN(dynamicResistance({ vC: 33, vBR: 30, iPP: 1, iT: 1 }))).toBe(true)
  })

  it('clampVoltageFromTable: tablo içinde interpolasyon', () => {
    const f = clampVoltageFromTable([{ i: 0, v: 30 }, { i: 10, v: 40 }, { i: 20, v: 50 }])
    expect(f(5)).toBeCloseTo(35, 9)
  })

  it('clampVoltageFromTable: tablo dışına en yakın segmentin eğimiyle uzatılır', () => {
    const f = clampVoltageFromTable([{ i: 0, v: 30 }, { i: 10, v: 40 }, { i: 20, v: 50 }])
    expect(f(-5)).toBeCloseTo(25, 9)
    expect(f(25)).toBeCloseTo(55, 9)
  })

  it('pulseEnergy: dikdörtgen (varsayılan)', () => {
    expect(pulseEnergy({ vClamp: 33, iPP: 33.5, tp: 1e-6 })).toBeCloseTo(1105.5e-6, 12)
  })

  it('pulseEnergy: üçgen yarısı kadar', () => {
    expect(pulseEnergy({ vClamp: 33, iPP: 33.5, tp: 1e-6, waveform: TVS_WAVEFORM_TRIANGULAR }))
      .toBeCloseTo(552.75e-6, 12)
  })

  it('pulseEnergy: kullanıcı katsayısı olmadan custom → NaN', () => {
    expect(Number.isNaN(pulseEnergy({ vClamp: 33, iPP: 33.5, tp: 1e-6, waveform: TVS_WAVEFORM_CUSTOM })))
      .toBe(true)
  })

  it('pulseEnergy: kullanıcı katsayısıyla custom', () => {
    expect(pulseEnergy({
      vClamp: 33, iPP: 33.5, tp: 1e-6, waveform: TVS_WAVEFORM_CUSTOM, kw: 0.75,
    })).toBeCloseTo(829.125e-6, 12)
  })

  it('pathInductanceOvershoot ve icPeakVoltage', () => {
    const vL = pathInductanceOvershoot({ lPath: 5e-9, didt: 1e9 })
    expect(vL).toBeCloseTo(5, 12)
    expect(icPeakVoltage({ vClamp: 33, vL })).toBeCloseTo(38, 12)
  })

  it('capacitanceCutoffFrequency', () => {
    const expected = 1 / (2 * Math.PI * 2 * 300e-12)
    expect(capacitanceCutoffFrequency({ rSource: 2, cTvs: 300e-12 })).toBeCloseTo(expected, 6)
  })
})

describe('tvsEsdProtectionPlan', () => {
  it('opsiyonel bloklar girdi verilmezse null döner', () => {
    const r = tvsEsdProtectionPlan({ vSurge: 100, rSource: 2, vBR: 33, rDyn: 0, iT: 0 })
    expect(r.ok).toBe(true)
    expect(r.energy).toBeNull()
    expect(r.overshoot).toBeNull()
    expect(r.capacitanceCutoffHz).toBeNull()
  })

  it('bütün opsiyonel bloklar verildiğinde referans örneğiyle tutarlı sonuç üretir', () => {
    const r = tvsEsdProtectionPlan({
      vSurge: 100, rSource: 2, vBR: 33, rDyn: 0, iT: 0,
      tp: 1e-6, lPath: 5e-9, didt: 1e9, cTvs: 300e-12,
    })
    expect(r.solver.current).toBeCloseTo(33.5, 9)
    expect(r.vClamp).toBeCloseTo(33, 9)
    expect(r.peakPower).toBeCloseTo(1105.5, 9)
    expect(r.energy).toBeCloseTo(1105.5e-6, 9)
    expect(r.overshoot.vL).toBeCloseTo(5, 9)
    expect(r.overshoot.icPeak).toBeCloseTo(38, 9)
    expect(r.capacitanceCutoffHz).toBeCloseTo(capacitanceCutoffFrequency({ rSource: 2, cTvs: 300e-12 }), 6)
  })

  it('çözücü hatası yukarı taşınır', () => {
    const r = tvsEsdProtectionPlan({ vSurge: 100, rSource: -1, vBR: 33 })
    expect(r.error).toBe(TVS_ERR_INVALID)
  })
})
