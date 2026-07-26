import { describe, it, expect } from 'vitest'
import {
  nominalThickness, derivedThickness, weightFromThickness,
  finishedThickness, allUnits, trapezoidArea,
  COPPER_ERR_INVALID,
} from './copper'

describe('bakır ağırlığı ↔ kalınlık', () => {
  it('nominal tablo: 1 oz = 35 µm', () => {
    expect(nominalThickness(1)).toBeCloseTo(35e-6, 12)
    expect(nominalThickness(0.5)).toBeCloseTo(17.5e-6, 12)
    expect(nominalThickness(2)).toBeCloseTo(70e-6, 12)
  })

  it('tabloda olmayan ağırlık doğrusal kuralla verilir', () => {
    expect(nominalThickness(5)).toBeCloseTo(175e-6, 12)
  })

  it('yoğunluktan türetilen değer ≈ 34.06 µm (spec §4.1.2)', () => {
    expect(derivedThickness(1) * 1e6).toBeCloseTo(34.06, 2)
  })

  it('türetilmiş değer nominalden küçüktür — fark bilinçli', () => {
    expect(derivedThickness(1)).toBeLessThan(nominalThickness(1))
  })

  it('kalınlıktan ağırlığa dönüş nominal kuralla tutarlı', () => {
    expect(weightFromThickness(nominalThickness(2))).toBeCloseTo(2, 12)
  })
})

describe('birim dönüşümleri', () => {
  it('1 oz nominal tüm birimlerde tutarlı', () => {
    const u = allUnits(35e-6)
    expect(u.um).toBeCloseTo(35, 9)
    expect(u.mm).toBeCloseTo(0.035, 12)
    expect(u.mil).toBeCloseTo(1.3780, 3)
    expect(u.inch).toBeCloseTo(0.0013780, 6)
    expect(u.ozNominal).toBeCloseTo(1, 12)
  })

  it('1 mil = 25.4 µm', () => {
    const u = allUnits(25.4e-6)
    expect(u.mil).toBeCloseTo(1, 12)
    expect(u.um).toBeCloseTo(25.4, 9)
  })

  it('geçersiz kalınlık null döner', () => {
    expect(allUnits(0)).toBeNull()
  })
})

describe('başlangıç ve bitmiş kalınlık', () => {
  it('dış katmanda kaplama eklenir', () => {
    const r = finishedThickness({ starting: 17.5e-6, plating: 25e-6, layer: 'external' })
    expect(r.finished).toBeCloseTo(42.5e-6, 12)
    expect(r.platingShare).toBeCloseTo(25 / 42.5, 9)
  })

  it('iç katmanda kaplama eklenmez', () => {
    const r = finishedThickness({ starting: 35e-6, plating: 25e-6, layer: 'internal' })
    expect(r.finished).toBeCloseTo(35e-6, 12)
    expect(r.plating).toBe(0)
  })

  it('ince folyoda kaplamanın payı büyüktür', () => {
    const thin = finishedThickness({ starting: 12e-6, plating: 25e-6 })
    const thick = finishedThickness({ starting: 70e-6, plating: 25e-6 })
    expect(thin.platingShare).toBeGreaterThan(thick.platingShare)
  })

  it('negatif kaplama reddedilir', () => {
    expect(finishedThickness({ starting: 35e-6, plating: -1 }).error).toBe(COPPER_ERR_INVALID)
  })
})

describe('trapez kesit (spec §4.1.3)', () => {
  it('aşındırma sıfırken dikdörtgenle aynı', () => {
    const r = trapezoidArea({ t: 35e-6, Wbottom: 0.2e-3, etchFactor: 0 })
    expect(r.area).toBeCloseTo(r.rectangular, 15)
    expect(r.lossPct).toBeCloseTo(0, 9)
  })

  it('üst genişlik aşındırma oranıyla daralır', () => {
    const r = trapezoidArea({ t: 35e-6, Wbottom: 0.2e-3, etchFactor: 0.2 })
    expect(r.Wtop).toBeCloseTo(0.16e-3, 12)
    // Ortalama genişlik (0.2 + 0.16)/2 = 0.18 mm
    expect(r.area).toBeCloseTo(35e-6 * 0.18e-3, 15)
    expect(r.lossPct).toBeCloseTo(10, 9)
  })

  it('dikdörtgen varsayımı her zaman iyimserdir', () => {
    const r = trapezoidArea({ t: 35e-6, Wbottom: 0.1e-3, etchFactor: 0.3 })
    expect(r.rectangular).toBeGreaterThan(r.area)
  })

  it('geçersiz aşındırma oranı reddedilir', () => {
    expect(trapezoidArea({ t: 35e-6, Wbottom: 1e-4, etchFactor: 1 }).error).toBe(COPPER_ERR_INVALID)
    expect(trapezoidArea({ t: 35e-6, Wbottom: 1e-4, etchFactor: -0.1 }).error).toBe(COPPER_ERR_INVALID)
  })
})
