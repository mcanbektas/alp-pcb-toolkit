import { describe, it, expect } from 'vitest'
import {
  cToF, fToC, cToK, kToC, fToK, kToF,
  toCelsius, fromCelsius,
  convertTemperature, convertDelta, finalTemperature,
  UNIT_C, UNIT_F, UNIT_K,
  ABS_ZERO_C, ABS_ZERO_F, ABS_ZERO_K,
  TEMP_ERR_INVALID, TEMP_ERR_UNIT, TEMP_ERR_ABSOLUTE_ZERO,
} from './convertTemperature'
import { expectErrorShapes } from './errorShape.testkit'

describe('ölçek dönüşümleri (spec §11.5)', () => {
  it('T_F = (9/5)·T_C + 32', () => {
    // Elle: (9·25)/5 + 32 = 45 + 32 = 77
    expect(cToF(25)).toBeCloseTo(77, 12)
    expect(cToF(0)).toBeCloseTo(32, 12)
    expect(cToF(100)).toBeCloseTo(212, 12)
    // Elle: (9·245)/5 + 32 = 441 + 32 = 473
    expect(cToF(245)).toBeCloseTo(473, 12)
  })

  it('T_C = (5/9)·(T_F − 32)', () => {
    // Elle: ((100−32)·5)/9 = 340/9 = 37.7777…
    expect(fToC(100)).toBeCloseTo(340 / 9, 12)
    expect(fToC(32)).toBeCloseTo(0, 12)
    expect(fToC(212)).toBeCloseTo(100, 12)
  })

  it('−40 iki ölçeğin tek kesişme noktasıdır', () => {
    expect(cToF(-40)).toBeCloseTo(-40, 12)
    expect(fToC(-40)).toBeCloseTo(-40, 12)
  })

  it('T_K = T_C + 273.15', () => {
    expect(cToK(25)).toBeCloseTo(298.15, 12)
    expect(kToC(350)).toBeCloseTo(76.85, 12)
    expect(cToK(0)).toBeCloseTo(273.15, 12)
  })

  it('zincirli dönüşümler tutarlı', () => {
    // Elle: 350 K → 76.85 °C → (9·76.85)/5 + 32 = 138.33 + 32 = 170.33 °F
    expect(kToF(350)).toBeCloseTo(170.33, 9)
    expect(fToK(170.33)).toBeCloseTo(350, 9)
  })

  it('gidiş-dönüş değeri korur', () => {
    for (const v of [-200, -40, 0, 21.5, 125, 1084.62]) {
      expect(fToC(cToF(v))).toBeCloseTo(v, 9)
      expect(kToC(cToK(v))).toBeCloseTo(v, 9)
    }
  })

  it('toCelsius / fromCelsius bilinmeyen birimde NaN döner', () => {
    expect(toCelsius(25, UNIT_C)).toBe(25)
    expect(toCelsius(77, UNIT_F)).toBeCloseTo(25, 12)
    expect(toCelsius(298.15, UNIT_K)).toBeCloseTo(25, 12)
    expect(Number.isNaN(toCelsius(25, '°R'))).toBe(true)
    expect(Number.isNaN(fromCelsius(25, 'R'))).toBe(true)
    expect(fromCelsius(25, UNIT_F)).toBeCloseTo(77, 12)
  })
})

describe('mutlak sıcaklık dönüşümü', () => {
  it('25 °C = 77 °F = 298.15 K', () => {
    const r = convertTemperature({ value: 25, unit: UNIT_C })
    expect(r.error).toBeUndefined()
    expect(r.C).toBeCloseTo(25, 12)
    expect(r.F).toBeCloseTo(77, 12)
    expect(r.K).toBeCloseTo(298.15, 12)
  })

  it('77 °F ve 298.15 K aynı noktayı verir', () => {
    const f = convertTemperature({ value: 77, unit: UNIT_F })
    const k = convertTemperature({ value: 298.15, unit: UNIT_K })
    expect(f.C).toBeCloseTo(25, 12)
    expect(f.K).toBeCloseTo(298.15, 12)
    expect(k.C).toBeCloseTo(25, 12)
    expect(k.F).toBeCloseTo(77, 12)
  })

  it('girişin kendi ölçeğindeki değeri değişmeden döner', () => {
    expect(convertTemperature({ value: 98.6, unit: UNIT_F }).F).toBe(98.6)
    expect(convertTemperature({ value: 310.15, unit: UNIT_K }).K).toBe(310.15)
    expect(convertTemperature({ value: 36.6, unit: UNIT_C }).C).toBe(36.6)
  })

  it('mutlak sıfır tam sınırı kabul edilir', () => {
    const c = convertTemperature({ value: ABS_ZERO_C, unit: UNIT_C })
    const f = convertTemperature({ value: ABS_ZERO_F, unit: UNIT_F })
    const k = convertTemperature({ value: ABS_ZERO_K, unit: UNIT_K })
    expect(c.error).toBeUndefined()
    expect(f.error).toBeUndefined()
    expect(k.error).toBeUndefined()
    expect(c.K).toBeCloseTo(0, 9)
    expect(f.K).toBeCloseTo(0, 9)
    expect(c.atAbsoluteZero).toBe(true)
    expect(f.atAbsoluteZero).toBe(true)
    expect(k.atAbsoluteZero).toBe(true)
  })

  it('mutlak sıfırın altı reddedilir', () => {
    expect(convertTemperature({ value: -273.16, unit: UNIT_C }).error).toBe(TEMP_ERR_ABSOLUTE_ZERO)
    expect(convertTemperature({ value: -460, unit: UNIT_F }).error).toBe(TEMP_ERR_ABSOLUTE_ZERO)
    expect(convertTemperature({ value: -1, unit: UNIT_K }).error).toBe(TEMP_ERR_ABSOLUTE_ZERO)
  })

  it('mutlak sıfıra kalan pay kelvin cinsindendir', () => {
    expect(convertTemperature({ value: 25, unit: UNIT_C }).marginK).toBeCloseTo(298.15, 12)
    expect(convertTemperature({ value: 0, unit: UNIT_K }).marginK).toBeCloseTo(0, 12)
  })

  it('geçersiz sayı ve bilinmeyen birim ayrı kodlarla reddedilir', () => {
    expect(convertTemperature({ value: NaN, unit: UNIT_C }).error).toBe(TEMP_ERR_INVALID)
    expect(convertTemperature({ value: Infinity, unit: UNIT_C }).error).toBe(TEMP_ERR_INVALID)
    expect(convertTemperature({ value: 25, unit: '°R' }).error).toBe(TEMP_ERR_UNIT)
  })
})

describe('sıcaklık farkı (ΔT) dönüşümü', () => {
  it('ΔT_C ile ΔT_K özdeştir, ΔT_F 9/5 katıdır', () => {
    // Elle: 10 °C fark = 10 K fark = (10·9)/5 = 18 °F fark
    const d = convertDelta({ value: 10, unit: UNIT_C })
    expect(d.dC).toBeCloseTo(10, 12)
    expect(d.dK).toBeCloseTo(10, 12)
    expect(d.dF).toBeCloseTo(18, 12)
    expect(d.dK).toBe(d.dC)
  })

  it('kelvin farkı santigrat farkıyla aynı sayıdır', () => {
    const d = convertDelta({ value: 45, unit: UNIT_K })
    expect(d.dC).toBeCloseTo(45, 12)
    expect(d.dF).toBeCloseTo(81, 12)
  })

  it('°F farkı santigrada 5/9 ile döner', () => {
    // Elle: (20·5)/9 = 100/9 = 11.1111…
    const d = convertDelta({ value: 20, unit: UNIT_F })
    expect(d.dC).toBeCloseTo(100 / 9, 12)
    expect(d.dK).toBeCloseTo(100 / 9, 12)
    expect(d.dF).toBe(20)
  })

  it('ΔT dönüşümünde 32 ofseti kullanılmaz — mutlak dönüşümden ayrılır', () => {
    // Mutlak: 0 °C = 32 °F.  Fark: 0 °C'lik değişim = 0 °F'lik değişim.
    expect(convertTemperature({ value: 0, unit: UNIT_C }).F).toBeCloseTo(32, 12)
    expect(convertDelta({ value: 0, unit: UNIT_C }).dF).toBeCloseTo(0, 12)
    // 10 °C'lik artış 50 °F değil 18 °F'dir
    expect(convertDelta({ value: 10, unit: UNIT_C }).dF).toBeCloseTo(18, 12)
    expect(convertTemperature({ value: 10, unit: UNIT_C }).F).toBeCloseTo(50, 12)
  })

  it('negatif fark (soğuma) geçerlidir, mutlak sıfır kontrolü uygulanmaz', () => {
    const d = convertDelta({ value: -500, unit: UNIT_C })
    expect(d.error).toBeUndefined()
    expect(d.dF).toBeCloseTo(-900, 12)
  })

  it('geçersiz sayı ve bilinmeyen birim reddedilir', () => {
    expect(convertDelta({ value: NaN, unit: UNIT_C }).error).toBe(TEMP_ERR_INVALID)
    expect(convertDelta({ value: 10, unit: 'C' }).error).toBe(TEMP_ERR_UNIT)
  })
})

describe('ortam üstüne yükselme', () => {
  it('25 °C ortam + 10 K artış = 35 °C = 95 °F = 308.15 K', () => {
    const r = finalTemperature({ ambient: 25, ambientUnit: UNIT_C, delta: 10, deltaUnit: UNIT_K })
    expect(r.error).toBeUndefined()
    expect(r.C).toBeCloseTo(35, 12)
    expect(r.F).toBeCloseTo(95, 12)
    expect(r.K).toBeCloseTo(308.15, 12)
  })

  it('ortam ve artış farklı ölçeklerde verilebilir', () => {
    // 77 °F ortam = 25 °C; 18 °F fark = 10 °C fark → 35 °C = 95 °F
    const r = finalTemperature({ ambient: 77, ambientUnit: UNIT_F, delta: 18, deltaUnit: UNIT_F })
    expect(r.C).toBeCloseTo(35, 9)
    expect(r.F).toBeCloseTo(95, 9)
    expect(r.ambient.C).toBeCloseTo(25, 9)
    expect(r.delta.dC).toBeCloseTo(10, 9)
  })

  it('artışın ofsetsiz eklendiği doğrulanır', () => {
    // 18 °F fark mutlak 18 °F gibi işlenseydi sonuç −7.78 °C civarında çıkardı
    const r = finalTemperature({ ambient: 0, ambientUnit: UNIT_C, delta: 18, deltaUnit: UNIT_F })
    expect(r.C).toBeCloseTo(10, 9)
  })

  it('mutlak sıfırın altına inen toplam reddedilir', () => {
    const r = finalTemperature({ ambient: 25, ambientUnit: UNIT_C, delta: -400, deltaUnit: UNIT_C })
    expect(r.error).toBe(TEMP_ERR_ABSOLUTE_ZERO)
  })

  it('geçersiz ortam sıcaklığı olduğu gibi bildirilir', () => {
    const r = finalTemperature({ ambient: -300, ambientUnit: UNIT_C, delta: 10, deltaUnit: UNIT_C })
    expect(r.error).toBe(TEMP_ERR_ABSOLUTE_ZERO)
    expect(finalTemperature({ ambient: 25, ambientUnit: 'X', delta: 10, deltaUnit: UNIT_C }).error)
      .toBe(TEMP_ERR_UNIT)
  })
})

describe('hata sözleşmesi', () => {
  it('hata yükü kod taşır, cümle taşımaz', () => {
    expectErrorShapes([
      convertTemperature({ value: -273.16, unit: UNIT_C }),
      convertTemperature({ value: -460, unit: UNIT_F }),
      convertTemperature({ value: -1, unit: UNIT_K }),
      convertTemperature({ value: NaN, unit: UNIT_C }),
      convertTemperature({ value: Infinity, unit: UNIT_C }),
      convertTemperature({ value: 25, unit: '°R' }),
      convertDelta({ value: NaN, unit: UNIT_C }),
      convertDelta({ value: 1, unit: '°R' }),
    ])
  })
})
