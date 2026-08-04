import { describe, it, expect } from 'vitest'
import {
  halfLsbError, acquisitionTime, timeConstant, relativeError, minimumSettlingTime,
  equivalentResistance, maxEquivalentResistance, maxSourceResistance,
  cutoffFrequency, filterResponse, chargeSharingDroop, lsbVoltage, thermalNoise,
  adcSettlingPlan, ADC_ERR_INVALID, ADC_ERR_BUFFER_REQUIRED,
} from './adcSettling'

describe('REV2 §7.12 referans testi', () => {
  // N = 12, C_s = 20 pF, t_acq = 1 µs, iç dirençler ihmal
  it('maksimum eşdeğer direnç ≈ 5.55 kΩ', () => {
    const r = maxEquivalentResistance({ tAcq: 1e-6, cs: 20e-12, bits: 12 })
    expect(r / 1e3).toBeCloseTo(5.55, 2)
  })

  it('aynı sonuç plan üzerinden de çıkar', () => {
    const r = adcSettlingPlan({ bits: 12, vFullScale: 3.3, cs: 20e-12, tAcq: 1e-6 })
    expect(r.maxEquivalentResistance / 1e3).toBeCloseTo(5.55, 2)
  })
})

describe('yerleşme temelleri', () => {
  it('yarım LSB hatası 1/2^(N+1)', () => {
    expect(halfLsbError({ bits: 12 })).toBeCloseTo(1 / 8192, 15)
  })

  it('acquisition time çevrim sayısından gelir', () => {
    expect(acquisitionTime({ cycles: 16, clock: 16e6 })).toBeCloseTo(1e-6, 15)
    expect(acquisitionTime({ cycles: 16, clock: 16e6, fixed: 0.2e-6 })).toBeCloseTo(1.2e-6, 15)
  })

  it('minimum yerleşme süresi (N+1)·ln2·τ', () => {
    const t = minimumSettlingTime({ bits: 12, rEq: 1e3, cEq: 20e-12 })
    expect(t).toBeCloseTo(13 * Math.LN2 * 20e-9, 15)
  })

  it('bir zaman sabitinde hata e^-1', () => {
    expect(relativeError({ t: 1e-6, tau: 1e-6 })).toBeCloseTo(Math.exp(-1), 12)
  })

  it('eşdeğer direnç dört bileşenin toplamı', () => {
    expect(equivalentResistance({ source: 1e3, series: 100, switchR: 500, driver: 50 }))
      .toBeCloseTo(1650, 12)
  })
})

describe('maksimum kaynak direnci', () => {
  it('iç dirençleri ÇIKARIR', () => {
    const r = maxSourceResistance({
      tAcq: 1e-6, cs: 20e-12, bits: 12, switchR: 500, series: 100, driver: 50,
    })
    expect(r.rEqMax / 1e3).toBeCloseTo(5.55, 2)
    expect(r.rSourceMax).toBeCloseTo(r.rEqMax - 650, 9)
  })

  it('iç dirençler bütçeyi yerse buffer gerekir', () => {
    const r = maxSourceResistance({
      tAcq: 1e-6, cs: 20e-12, bits: 12, switchR: 6000,
    })
    expect(r.error).toBe(ADC_ERR_BUFFER_REQUIRED)
    expect(r.rSourceMax).toBeLessThan(0) // sıfıra kırpılmaz
  })

  it('daha yüksek çözünürlük bütçeyi daraltır', () => {
    const a = maxEquivalentResistance({ tAcq: 1e-6, cs: 20e-12, bits: 12 })
    const b = maxEquivalentResistance({ tAcq: 1e-6, cs: 20e-12, bits: 16 })
    expect(b).toBeLessThan(a)
  })
})

describe('RC filtre', () => {
  it('kesim frekansı 1/(2πRC)', () => {
    expect(cutoffFrequency({ r: 1e3, c: 1e-9 })).toBeCloseTo(159154.94, 1)
  })

  it('kesim frekansında −3 dB', () => {
    const r = filterResponse({ f: 1e3, fc: 1e3 })
    expect(r.attenuationDb).toBeCloseTo(-3.0103, 3)
  })

  it('dekad üstünde yaklaşık −20 dB', () => {
    const r = filterResponse({ f: 1e4, fc: 1e3 })
    expect(r.attenuationDb).toBeCloseTo(-20.04, 2)
  })

  it('geçersiz kesim frekansı hatadır', () => {
    expect(filterResponse({ f: 1e3, fc: 0 }).error).toBe(ADC_ERR_INVALID)
  })
})

describe('charge sharing ve gürültü', () => {
  it('büyük harici kondansatör droop u küçültür', () => {
    const small = chargeSharingDroop({ vStep: 3.3, cs: 20e-12, cf: 20e-12 })
    const big = chargeSharingDroop({ vStep: 3.3, cs: 20e-12, cf: 2e-9 })
    expect(small).toBeCloseTo(1.65, 9) // eşit kapasitede yarı yarıya
    expect(big).toBeLessThan(small / 10)
  })

  it('LSB gerilimi tam ölçek / 2^N', () => {
    expect(lsbVoltage({ vFullScale: 3.3, bits: 12 })).toBeCloseTo(3.3 / 4096, 15)
  })

  it('kT/C gürültüsü kapasite büyüdükçe düşer', () => {
    const a = thermalNoise({ c: 20e-12 })
    const b = thermalNoise({ c: 80e-12 })
    expect(a).toBeGreaterThan(b)
    expect(b).toBeCloseTo(a / 2, 9) // √4 = 2
  })
})

describe('adcSettlingPlan', () => {
  const base = {
    bits: 12, vFullScale: 3.3, cs: 20e-12, tAcq: 1e-6,
    rSource: 1e3, rSwitch: 500, rSeries: 100,
  }

  it('yerleşme marjını ve durumunu verir', () => {
    const r = adcSettlingPlan(base)
    expect(r.ok).toBe(true)
    expect(r.settles).toBe(true)
    expect(r.settlingMargin).toBeGreaterThan(0)
  })

  it('kaynak direnci büyürse yerleşme başarısız olur', () => {
    const r = adcSettlingPlan({ ...base, rSource: 100e3 })
    expect(r.settles).toBe(false)
    expect(r.settlingMargin).toBeLessThan(0)
    expect(r.errorLsb).toBeGreaterThan(0.5)
  })

  it('harici filtre kondansatörü toplam kapasiteye girer', () => {
    const r = adcSettlingPlan({ ...base, cFilter: 1e-9 })
    expect(r.cEq).toBeCloseTo(1.02e-9, 15)
    expect(r.capacitorRatio).toBeCloseTo(50, 9)
  })

  it('filtre yalnız direnç ve gürültü frekansı verilince hesaplanır', () => {
    expect(adcSettlingPlan(base).filter).toBeNull()
    const r = adcSettlingPlan({ ...base, cFilter: 1e-9, rFilter: 1e3, noiseFreq: 1e6 })
    expect(r.cutoffFrequency).toBeGreaterThan(0)
    expect(r.filter.attenuationDb).toBeLessThan(0)
  })

  it('buffer gerektiğinde bayrak kalkar', () => {
    const r = adcSettlingPlan({ ...base, rSwitch: 6000 })
    expect(r.bufferRequired).toBe(true)
    expect(r.maxSourceResistance).toBeNull()
  })

  it('geçersiz girdide hata döner', () => {
    expect(adcSettlingPlan({ ...base, bits: 0 }).error).toBe(ADC_ERR_INVALID)
    expect(adcSettlingPlan({ ...base, cs: 0 }).error).toBe(ADC_ERR_INVALID)
    expect(adcSettlingPlan({ bits: 12, vFullScale: 3.3, cs: 20e-12 }).error).toBe(ADC_ERR_INVALID)
  })
})
