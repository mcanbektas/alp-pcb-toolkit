import { describe, it, expect } from 'vitest'
import {
  shuntFromSenseVoltage, senseVoltage, shuntPower, powerMargin, selfHeating,
  tcrCoefficient, resistanceAtTemperature, tcrError, amplifierOutput,
  offsetCurrentError, lsbVoltage, currentResolution, sharedPathError,
  worstCaseError, rssError, shuntKelvinPlan, SK_ERR_INVALID, SK_ERR_POWER_EXCEEDED,
} from './shuntKelvin'

describe('REV2 §9.11 referans testi', () => {
  // I_max = 10 A, V_sense,FS = 50 mV → R = 5 mΩ, P = 0.5 W
  // V_ref = 3.3 V, N = 12, G = 50 → I_LSB ≈ 3.22 mA
  const r = shuntKelvinPlan({
    iMax: 10, vSenseFs: 50e-3, iRms: 10,
    gain: 50, vRef: 3.3, bits: 12,
  })

  it('shunt 5 mΩ', () => {
    expect(r.shunt * 1e3).toBeCloseTo(5, 12)
  })

  it('güç 0.5 W', () => {
    expect(r.power).toBeCloseTo(0.5, 12)
  })

  it('akım çözünürlüğü ≈ 3.22 mA', () => {
    expect(r.currentResolution * 1e3).toBeCloseTo(3.22, 2)
  })
})

describe('shunt seçimi ve güç', () => {
  it('hedef sense geriliminden shunt', () => {
    expect(shuntFromSenseVoltage({ vSenseFs: 50e-3, iMax: 10 })).toBeCloseTo(5e-3, 15)
  })

  it('sense gerilimi I·R', () => {
    expect(senseVoltage({ current: 4, shunt: 5e-3 })).toBeCloseTo(20e-3, 15)
  })

  it('güç I²R, peak ayrı hesaplanır', () => {
    expect(shuntPower({ current: 10, shunt: 5e-3 })).toBeCloseTo(0.5, 12)
    expect(shuntPower({ current: 30, shunt: 5e-3 })).toBeCloseTo(4.5, 12)
  })

  it('derating güç marjını düşürür', () => {
    expect(powerMargin({ rated: 2, derating: 1, actual: 0.5 })).toBeCloseTo(4, 12)
    expect(powerMargin({ rated: 2, derating: 0.5, actual: 0.5 })).toBeCloseTo(2, 12)
  })
})

describe('sıcaklık ve TCR', () => {
  it('kendi kendine ısınma ortam sıcaklığına eklenir', () => {
    const r = selfHeating({ power: 0.5, thermalResistance: 40, ambient: 25 })
    expect(r.rise).toBeCloseTo(20, 12)
    expect(r.temperature).toBeCloseTo(45, 12)
  })

  it('TCR ppm den orana çevrilir', () => {
    expect(tcrCoefficient({ ppm: 50 })).toBeCloseTo(50e-6, 15)
  })

  it('sıcak direnç TCR ile kayar', () => {
    // 50 ppm/°C, +100 °C → +%0.5
    expect(resistanceAtTemperature({ r0: 5e-3, ppm: 50, temperature: 125, reference: 25 }))
      .toBeCloseTo(5e-3 * 1.005, 15)
  })

  it('TCR hatası bağıl orandır', () => {
    expect(tcrError({ ppm: 50, temperature: 125, reference: 25 })).toBeCloseTo(0.005, 12)
  })
})

describe('amplifikatör ve ADC', () => {
  it('çıkış G·I·R + offset', () => {
    expect(amplifierOutput({ gain: 50, current: 10, shunt: 5e-3, offsetOut: 0.01 }))
      .toBeCloseTo(2.51, 12)
  })

  it('offset küçük shuntta büyük akım hatası demektir', () => {
    const small = offsetCurrentError({ vos: 50e-6, shunt: 5e-3 })
    const big = offsetCurrentError({ vos: 50e-6, shunt: 50e-3 })
    expect(small).toBeCloseTo(10e-3, 12)
    expect(big).toBeCloseTo(1e-3, 12)
  })

  it('LSB gerilimi ve akım çözünürlüğü', () => {
    expect(lsbVoltage({ vRef: 3.3, bits: 12 })).toBeCloseTo(3.3 / 4096, 15)
    expect(currentResolution({ vRef: 3.3, bits: 12, gain: 50, shunt: 5e-3 }))
      .toBeCloseTo(3.2227e-3, 6)
  })
})

describe('Kelvin ve ortak yol hatası', () => {
  it('Kelvin varken ortak yol hatası sıfırdır', () => {
    expect(sharedPathError({ shunt: 5e-3, shared: 1e-3, kelvin: true })).toBe(0)
  })

  it('Kelvin yokken ortak direnç oranı kadar hata girer', () => {
    // 1 mΩ ortak yol, 5 mΩ shunt → %20 hata
    expect(sharedPathError({ shunt: 5e-3, shared: 1e-3, kelvin: false })).toBeCloseTo(0.2, 12)
  })

  it('küçük shunt ortak yol hatasını büyütür', () => {
    const a = sharedPathError({ shunt: 5e-3, shared: 0.5e-3, kelvin: false })
    const b = sharedPathError({ shunt: 0.5e-3, shared: 0.5e-3, kelvin: false })
    expect(b).toBeCloseTo(10 * a, 9)
  })
})

describe('hata birleştirme', () => {
  it('worst-case mutlak değerleri toplar', () => {
    expect(worstCaseError([0.01, -0.005, 0.002])).toBeCloseTo(0.017, 12)
  })

  it('RSS worst-case ten küçüktür', () => {
    const c = [0.01, 0.005, 0.002]
    expect(rssError(c)).toBeLessThan(worstCaseError(c))
    expect(rssError(c)).toBeCloseTo(Math.sqrt(1e-4 + 2.5e-5 + 4e-6), 12)
  })

  it('geçersiz bileşende NaN döner', () => {
    expect(Number.isNaN(worstCaseError([0.01, NaN]))).toBe(true)
    expect(Number.isNaN(rssError([]))).toBe(true)
  })
})

describe('shuntKelvinPlan', () => {
  const base = {
    iMax: 10, vSenseFs: 50e-3, iRms: 10, iNominal: 10,
    tolerance: 0.005, tcrPpm: 50, gain: 50, gainTolerance: 0.002, vos: 50e-6,
    vRef: 3.3, bits: 12,
  }

  it('Kelvin yokken toplam hata belirgin büyür', () => {
    const withK = shuntKelvinPlan({ ...base, sharedResistance: 1e-3, kelvin: true })
    const without = shuntKelvinPlan({ ...base, sharedResistance: 1e-3, kelvin: false })
    expect(withK.sharedError).toBe(0)
    expect(without.sharedError).toBeCloseTo(0.2, 12)
    expect(without.worstCaseError).toBeGreaterThan(withK.worstCaseError + 0.19)
  })

  it('düşük akımda offset hatası yüzdesi büyür', () => {
    const full = shuntKelvinPlan({ ...base, iNominal: 10 })
    const low = shuntKelvinPlan({ ...base, iNominal: 1 })
    expect(low.offsetError).toBeCloseTo(10 * full.offsetError, 9)
  })

  it('güç sınırı aşılınca bayrak ve hata kodu gelir', () => {
    const r = shuntKelvinPlan({ ...base, ratedPower: 0.25 })
    expect(r.powerExceeded).toBe(true)
    expect(r.powerError).toBe(SK_ERR_POWER_EXCEEDED)
  })

  it('termal direnç verilince sıcak direnç TCR ile kayar', () => {
    const r = shuntKelvinPlan({ ...base, thermalResistance: 40, ambient: 25 })
    expect(r.temperatureRise).toBeCloseTo(20, 9)
    expect(r.temperature).toBeCloseTo(45, 9)
    expect(r.resistanceHot).toBeGreaterThan(r.shunt)
  })

  it('ENOB verilirse ikinci çözünürlük de döner', () => {
    const r = shuntKelvinPlan({ ...base, enob: 10.5 })
    expect(r.currentResolutionEnob).toBeGreaterThan(r.currentResolution)
  })

  it('RSS toplam worst-case ten küçüktür', () => {
    const r = shuntKelvinPlan(base)
    expect(r.rssError).toBeLessThan(r.worstCaseError)
  })

  it('geçersiz girdide hata döner', () => {
    expect(shuntKelvinPlan({ iMax: 0, vSenseFs: 50e-3 }).error).toBe(SK_ERR_INVALID)
    expect(shuntKelvinPlan({ iMax: 10 }).error).toBe(SK_ERR_INVALID)
  })
})
