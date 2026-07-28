import { describe, it, expect } from 'vitest'
import {
  OZ_TABLE, MIL2_TO_MM2, ozThickness_m,
  areaForCurrent_mil2, currentForArea, kCoeff,
  rhoAt, traceResistance, validityWarnings,
} from './traceCalc'
import { OZ_NOMINAL_UM, RHO_CU_20, rhoCuAt } from './units'

// Klasik ampirik ısınma denklemi: I = k · ΔT^0.44 · A^0.725
// Beklenen sayılar elle hesaplanmıştır; birimler mil² / A / °C.

describe('katman katsayısı', () => {
  it('dış katman 0.048, iç katman 0.024', () => {
    expect(kCoeff('external')).toBe(0.048)
    expect(kCoeff('internal')).toBe(0.024)
  })

  it('iç katman katsayısı dışın yarısıdır', () => {
    expect(kCoeff('internal')).toBeCloseTo(kCoeff('external') / 2, 15)
  })

  it('bilinmeyen katman için katsayı üretmez', () => {
    expect(kCoeff('inner-layer-3')).toBeUndefined()
  })
})

describe('kesit alanından akım kapasitesi', () => {
  // A = 100 mil², ΔT = 10 °C, dış katman:
  //   I = 0.048 · 10^0.44 · 100^0.725 = 0.048 · 10^(0.44+1.45) = 0.048 · 10^1.89
  //     = 0.048 · 77.62471166... = 3.725986159...
  it('A = 100 mil², ΔT = 10 °C, dış katman → 3.725986 A', () => {
    expect(currentForArea(100, 10, 'external')).toBeCloseTo(3.7259862, 7)
  })

  it('aynı kesitte iç katman yarı kapasite verir', () => {
    expect(currentForArea(100, 10, 'internal')).toBeCloseTo(1.8629931, 7)
    expect(currentForArea(100, 10, 'internal')).toBeCloseTo(currentForArea(100, 10, 'external') / 2, 12)
  })

  it('ΔT iki katına çıkınca kapasite 2^0.44 kat artar', () => {
    const ratio = currentForArea(100, 20, 'external') / currentForArea(100, 10, 'external')
    // 2^0.44 = 1.35660432744...
    expect(ratio).toBeCloseTo(1.3566043, 7)
  })

  it('kesit iki katına çıkınca kapasite 2^0.725 kat artar', () => {
    const ratio = currentForArea(200, 10, 'external') / currentForArea(100, 10, 'external')
    // 2^0.725 = 1.65290063630...
    expect(ratio).toBeCloseTo(1.6529006, 7)
  })

  it('kesit yoksa kapasite yoktur', () => {
    expect(currentForArea(0, 10, 'external')).toBe(0)
  })
})

describe('akımdan gerekli kesit alanı', () => {
  // I = 1 A, ΔT = 10 °C, dış katman:
  //   A = (1 / (0.048 · 10^0.44))^(1/0.725) = (1 / 0.13220300...)^1.37931034...
  //     = 7.5641...^1.37931... = 16.29600134... mil²
  it('I = 1 A, ΔT = 10 °C, dış katman → 16.296 mil²', () => {
    expect(areaForCurrent_mil2(1, 10, 'external')).toBeCloseTo(16.2960013, 7)
  })

  it('I = 5 A, ΔT = 10 °C → dış 150.030 mil², iç 390.294 mil²', () => {
    expect(areaForCurrent_mil2(5, 10, 'external')).toBeCloseTo(150.0298274, 6)
    expect(areaForCurrent_mil2(5, 10, 'internal')).toBeCloseTo(390.2935703, 6)
  })

  it('I = 10 A, ΔT = 20 °C, dış katman → 256.270 mil²', () => {
    expect(areaForCurrent_mil2(10, 20, 'external')).toBeCloseTo(256.2697412, 6)
  })

  it('iç katman aynı akım için 2^(1/0.725) kat kesit ister', () => {
    const ratio = areaForCurrent_mil2(5, 10, 'internal') / areaForCurrent_mil2(5, 10, 'external')
    // 2^1.37931034... = 2.6014398...
    expect(ratio).toBeCloseTo(2.6014398, 6)
  })

  it('daha yüksek ΔT daha küçük kesitle yetinir', () => {
    expect(areaForCurrent_mil2(5, 45, 'external')).toBeLessThan(areaForCurrent_mil2(5, 10, 'external'))
  })
})

describe('denklemin iki yönü birbirinin tersidir', () => {
  const cases = [
    { I: 0.5, dT: 10, layer: 'external' },
    { I: 5, dT: 25, layer: 'external' },
    { I: 12, dT: 45, layer: 'internal' },
    { I: 30, dT: 100, layer: 'internal' },
  ]

  it.each(cases)('akım → kesit → akım aynı akımı verir (I=$I, ΔT=$dT, $layer)', ({ I, dT, layer }) => {
    const A = areaForCurrent_mil2(I, dT, layer)
    expect(currentForArea(A, dT, layer)).toBeCloseTo(I, 9)
  })

  it.each([
    { A: 20, dT: 10, layer: 'external' },
    { A: 250, dT: 45, layer: 'internal' },
    { A: 4000, dT: 60, layer: 'external' },
  ])('kesit → akım → kesit aynı kesiti verir (A=$A, ΔT=$dT, $layer)', ({ A, dT, layer }) => {
    const I = currentForArea(A, dT, layer)
    expect(areaForCurrent_mil2(I, dT, layer)).toBeCloseTo(A, 6)
  })
})

describe('sıcaklığa bağlı bakır özdirenci', () => {
  it('20 °C referans değerdir', () => {
    expect(rhoAt(20)).toBe(RHO_CU_20)
    expect(rhoAt(20)).toBe(1.724e-8)
  })

  it('70 °C → 1.724e-8 · (1 + 0.00393·50) = 2.062766e-8', () => {
    expect(rhoAt(70)).toBeCloseTo(2.062766e-8, 20)
  })

  it('0 °C → 1.724e-8 · (1 − 0.00393·20) = 1.5884936e-8', () => {
    expect(rhoAt(0)).toBeCloseTo(1.5884936e-8, 20)
  })

  it('units.js ile aynı tek kaynaktan gelir', () => {
    for (const T of [-40, 0, 20, 45, 85, 125]) {
      expect(rhoAt(T)).toBe(rhoCuAt(T))
    }
  })
})

describe('hat direnci', () => {
  // R = ρ(T)·L / (W·t); L = 100 mm, W = 1 mm, t = 35 µm:
  //   R20 = 1.724e-8 · 0.1 / (1e-3 · 35e-6) = 1.724e-9 / 3.5e-8 = 0.04925714... Ω
  it('100 mm × 1 mm × 35 µm @ 20 °C → 49.257 mΩ', () => {
    expect(traceResistance(0.1, 1e-3, 35e-6, 20)).toBeCloseTo(0.0492571429, 10)
  })

  it('aynı hat 70 °C\'de 1.1965 kat direnç gösterir', () => {
    expect(traceResistance(0.1, 1e-3, 35e-6, 70)).toBeCloseTo(0.0589361714, 10)
    const ratio = traceResistance(0.1, 1e-3, 35e-6, 70) / traceResistance(0.1, 1e-3, 35e-6, 20)
    expect(ratio).toBeCloseTo(1.1965, 12)
  })

  it('1 m × 1 mm × 1 mm @ 20 °C → 17.24 mΩ', () => {
    expect(traceResistance(1, 1e-3, 1e-3, 20)).toBeCloseTo(0.01724, 12)
  })

  it('uzunlukla doğru, genişlik ve kalınlıkla ters orantılıdır', () => {
    const R = traceResistance(0.1, 1e-3, 35e-6, 20)
    expect(traceResistance(0.2, 1e-3, 35e-6, 20)).toBeCloseTo(2 * R, 12)
    expect(traceResistance(0.1, 2e-3, 35e-6, 20)).toBeCloseTo(R / 2, 12)
    expect(traceResistance(0.1, 1e-3, 70e-6, 20)).toBeCloseTo(R / 2, 12)
  })
})

describe('geçerlilik uyarıları', () => {
  it('aralık içindeki girdi uyarı üretmez', () => {
    expect(validityWarnings(1, 10)).toEqual([])
    expect(validityWarnings(10, 45)).toEqual([])
  })

  it('aralık sınırları dahildir: ΔT = 10 ve 100, I = 35 temizdir', () => {
    expect(validityWarnings(35, 10)).toEqual([])
    expect(validityWarnings(35, 100)).toEqual([])
  })

  it('ΔT aralığın altındaysa uyarır', () => {
    expect(validityWarnings(1, 5)).toEqual([{ code: 'dt-range', dT: 5 }])
  })

  it('ΔT aralığın üstündeyse uyarır', () => {
    expect(validityWarnings(1, 101)).toEqual([{ code: 'dt-range', dT: 101 }])
  })

  it('akım üst sınırın üstündeyse uyarır', () => {
    expect(validityWarnings(35.5, 45)).toEqual([{ code: 'i-range', I: 35.5 }])
  })

  it('iki sınır da aşılırsa iki uyarı döner — sırayla ΔT, sonra akım', () => {
    expect(validityWarnings(40, 120)).toEqual([
      { code: 'dt-range', dT: 120 },
      { code: 'i-range', I: 40 },
    ])
  })

  // Saf katman kullanıcı metni üretmez: uyarı kod taşır, cümle taşımaz.
  it('uyarılar cümle değil kod döndürür', () => {
    for (const w of validityWarnings(40, 120)) {
      expect(typeof w).toBe('object')
      expect(typeof w.code).toBe('string')
      expect(w.code).not.toContain(' ')
    }
  })
})

describe('bakır ağırlığı tablosu', () => {
  it('altı nominal basamak + özel kalınlık satırı', () => {
    expect(OZ_TABLE.map((o) => o.key)).toEqual(['0.5', '1', '1.5', '2', '3', '4', 'custom'])
  })

  it('kalınlıklar units.js nominal tablosuyla birebir aynıdır', () => {
    for (const row of OZ_TABLE) {
      if (row.key === 'custom') continue
      expect(row.um).toBe(OZ_NOMINAL_UM[row.key])
    }
    expect(OZ_TABLE.map((o) => o.um)).toEqual([17.5, 35, 52.5, 70, 105, 140, null])
  })

  it('etiketler ağırlığı ve µm karşılığını taşır', () => {
    expect(OZ_TABLE.map((o) => o.label)).toEqual([
      '0.5 oz (17.5 µm)',
      '1 oz (35 µm)',
      '1.5 oz (52.5 µm)',
      '2 oz (70 µm)',
      '3 oz (105 µm)',
      '4 oz (140 µm)',
      'custom',
    ])
  })

  // Sayısal satırların etiketi birim sembolünden ibarettir ve dilden bağımsızdır;
  // "özel kalınlık" satırı ise anahtarın kendisini taşır — ekran onu çevirir.
  it('özel kalınlık satırı tek dilli metin taşımaz', () => {
    const custom = OZ_TABLE.find((o) => o.key === 'custom')
    expect(custom.label).toBe(custom.key)
  })

  it('seçim anahtarından kalınlık (m) verir', () => {
    expect(ozThickness_m('1')).toBeCloseTo(35e-6, 15)
    expect(ozThickness_m('1.5')).toBeCloseTo(52.5e-6, 15)
  })

  it('özel kalınlık ve bilinmeyen anahtar için sayı üretmez', () => {
    expect(Number.isNaN(ozThickness_m('custom'))).toBe(true)
    expect(Number.isNaN(ozThickness_m('9'))).toBe(true)
    expect(Number.isNaN(ozThickness_m(''))).toBe(true)
  })

  it('mil² → mm² çarpanı 1 mil = 0.0254 mm tanımından gelir', () => {
    expect(MIL2_TO_MM2).toBeCloseTo(0.0254 * 0.0254, 15)
  })
})
