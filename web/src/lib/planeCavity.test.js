import { describe, it, expect } from 'vitest'
import {
  planeCapacitance, rectangleArea, capacitancePerArea, cavityModeFrequency,
  firstCavityModes, lowestCavityResonance, dielectricQ, totalQ, storedEnergy,
  dielectricWavelength, stitchingSpacingCheck, planeCavityAnalysis,
  PC_ERR_INVALID, PC_ERR_MODE_INDEX, PC_ERR_STITCHING_N,
} from './planeCavity'

describe('REV2 §11.11 referans testi', () => {
  // a = b = 100 mm, d = 0.1 mm, εr = 4, A = 0.01 m² (= a·b)
  const a = 0.1
  const b = 0.1
  const d = 0.1e-3
  const epsR = 4

  it('düzlem kapasitansı ≈ 3.54 nF', () => {
    const area = rectangleArea({ a, b })
    expect(area).toBeCloseTo(0.01, 12)
    const c = planeCapacitance({ epsR, area, d })
    expect(c * 1e9).toBeCloseTo(3.54, 2)
  })

  it('f10 = f01 ≈ 749.5 MHz', () => {
    const f10 = cavityModeFrequency({ m: 1, n: 0, a, b, epsR })
    const f01 = cavityModeFrequency({ m: 0, n: 1, a, b, epsR })
    expect(f10 / 1e6).toBeCloseTo(749.5, 1)
    expect(f01).toBe(f10) // a === b, simetrik girdide bit-eş sonuç
  })

  it('planeCavityAnalysis aynı senaryoda aynı sonuçları üretir', () => {
    const r = planeCavityAnalysis({ a, b, d, epsR, lossTangent: 0.02, mMax: 2, nMax: 2 })
    expect(r.ok).toBe(true)
    expect(r.capacitance * 1e9).toBeCloseTo(3.54, 2)
    expect(r.lowestResonance / 1e6).toBeCloseTo(749.5, 1)
  })
})

describe('düzlem kapasitansı', () => {
  it('geçersiz girdide NaN döner', () => {
    expect(Number.isNaN(planeCapacitance({ epsR: 0, area: 1, d: 1 }))).toBe(true)
    expect(Number.isNaN(planeCapacitance({ epsR: 4, area: -1, d: 1 }))).toBe(true)
    expect(Number.isNaN(planeCapacitance({ epsR: 4, area: 1, d: 0 }))).toBe(true)
  })
})

describe('alan başına kapasitans', () => {
  it('C/A oranına eşittir (REV2 §11.3 ↔ §11.4 tutarlılığı)', () => {
    const area = 0.01
    const d = 1e-4
    const epsR = 4
    const c = planeCapacitance({ epsR, area, d })
    const cPerArea = capacitancePerArea({ epsR, d })
    expect(cPerArea).toBeCloseTo(c / area, 15)
  })
})

describe('cavity mode frekansı', () => {
  it('m = n = 0 geçersizdir', () => {
    expect(Number.isNaN(cavityModeFrequency({ m: 0, n: 0, a: 0.1, b: 0.1, epsR: 4 }))).toBe(true)
  })

  it('negatif veya tam sayı olmayan mod indeksi NaN döner', () => {
    expect(Number.isNaN(cavityModeFrequency({ m: -1, n: 0, a: 0.1, b: 0.1, epsR: 4 }))).toBe(true)
    expect(Number.isNaN(cavityModeFrequency({ m: 1.5, n: 0, a: 0.1, b: 0.1, epsR: 4 }))).toBe(true)
  })

  it('f11, f10 ve f01 katkılarının kök toplamıdır', () => {
    const f10 = cavityModeFrequency({ m: 1, n: 0, a: 0.1, b: 0.2, epsR: 4 })
    const f01 = cavityModeFrequency({ m: 0, n: 1, a: 0.1, b: 0.2, epsR: 4 })
    const f11 = cavityModeFrequency({ m: 1, n: 1, a: 0.1, b: 0.2, epsR: 4 })
    expect(f11).toBeCloseTo(Math.sqrt(f10 ** 2 + f01 ** 2), 6)
  })
})

describe('firstCavityModes', () => {
  it('modları frekansa göre artan sırada döner, (0,0) hariç', () => {
    const r = firstCavityModes({ a: 0.1, b: 0.15, epsR: 4, mMax: 2, nMax: 2 })
    expect(r.error).toBeUndefined()
    expect(r.modes.some((mo) => mo.m === 0 && mo.n === 0)).toBe(false)
    for (let i = 1; i < r.modes.length; i++) {
      expect(r.modes[i].freq).toBeGreaterThanOrEqual(r.modes[i - 1].freq)
    }
  })

  it('limit verilirse ilk N modu döner', () => {
    const r = firstCavityModes({ a: 0.1, b: 0.15, epsR: 4, mMax: 4, nMax: 4, limit: 5 })
    expect(r.modes.length).toBe(5)
  })

  it('geçersiz mod indeksi hata döner', () => {
    expect(firstCavityModes({ a: 0.1, b: 0.1, epsR: 4, mMax: -1, nMax: 2 }).error)
      .toBe(PC_ERR_MODE_INDEX)
  })

  it('geçersiz geometri hata döner', () => {
    expect(firstCavityModes({ a: 0, b: 0.1, epsR: 4, mMax: 2, nMax: 2 }).error)
      .toBe(PC_ERR_INVALID)
  })
})

describe('dielektrik Q', () => {
  it('Q_d = 1/tanδ', () => {
    expect(dielectricQ({ lossTangent: 0.02 })).toBeCloseTo(50, 9)
  })

  it('toplam Q yalnızca üç bileşen de verilirse hesaplanır', () => {
    const qd = dielectricQ({ lossTangent: 0.02 })
    expect(totalQ({ qd })).toBeNull()
    expect(totalQ({ qd, qc: 100, qr: 200 })).toBeNull() // qLoading eksik
    const q = totalQ({ qd, qc: 100, qr: 200, qLoading: 300 })
    expect(q).toBeCloseTo(1 / (1 / 50 + 1 / 100 + 1 / 200 + 1 / 300), 9)
  })

  // Yukarıdaki beklenti motorun ifadesinin harfi harfine kopyası: `1/(1/qd +
  // 1/qc + 1/qr + 1/qLoading)` yerine motorda ne yazılsa test onu yazardı.
  // Aşağıdaki sayı elle çıkarıldı.
  it('Q_total = 600/23 ≈ 26.0870 (çıplak değer)', () => {
    // 1/50 + 1/100 + 1/200 + 1/300 → payda 600'de:
    //   12/600 + 6/600 + 3/600 + 2/600 = 23/600
    // Q_total = 600/23 = 26.086956521739…
    expect(totalQ({ qd: 50, qc: 100, qr: 200, qLoading: 300 })).toBeCloseTo(26.086956521739, 9)
  })

  it('toplam Q daima EN KÜÇÜK bileşenden küçüktür (kayıplar toplanır)', () => {
    // Terimler ADMİTANS gibi toplanır; bir bileşen çıkarılsaydı ya da terimler
    // doğrudan toplansaydı sonuç en küçük bileşeni AŞARDI.
    const q = totalQ({
      qd: 50, qc: 100, qr: 200, qLoading: 300,
    })
    expect(q).toBeLessThan(50)
    // Yalnız dielektrik kayıp sayılsaydı 50 çıkardı — bu ayrım korunmalı.
    expect(q).not.toBeCloseTo(50, 1)
  })
})

describe('depolanan enerji', () => {
  it('E = ½CV²', () => {
    expect(storedEnergy({ capacitance: 1e-9, voltage: 3.3 })).toBeCloseTo(0.5 * 1e-9 * 3.3 ** 2, 15)
  })

  it('C = 1 nF, V = 3.3 V → 5.445 nJ (çıplak değer)', () => {
    // ½ × 1e-9 × 3.3² = 0.5 × 1e-9 × 10.89 = 5.445e-9 J
    // ½ çarpanı düşerse 10.89 nJ; V² yerine V yazılırsa 1.65 nJ çıkardı.
    expect(storedEnergy({ capacitance: 1e-9, voltage: 3.3 }) * 1e9).toBeCloseTo(5.445, 9)
  })

  it('gerilimle KAREsel, kapasitansla doğrusaldır', () => {
    // 100 nF @ 1 V: ½ × 1e-7 × 1 = 5e-8 J
    // 100 nF @ 2 V: ½ × 1e-7 × 4 = 2e-7 J  (dört katı, iki katı değil)
    expect(storedEnergy({ capacitance: 100e-9, voltage: 1 })).toBeCloseTo(5e-8, 15)
    expect(storedEnergy({ capacitance: 100e-9, voltage: 2 })).toBeCloseTo(2e-7, 15)
    // 200 nF @ 1 V: kapasitansta doğrusal → 1e-7 J
    expect(storedEnergy({ capacitance: 200e-9, voltage: 1 })).toBeCloseTo(1e-7, 15)
  })

  it('V = 0 geçerli girdidir ve enerji sıfırdır', () => {
    expect(storedEnergy({ capacitance: 1e-9, voltage: 0 })).toBe(0)
  })
})

// lowestCavityResonance bütün mevcut testlerde KARE düzlemle (a = b) çağrılıyor;
// orada f10 = f01 olduğu için `Math.min` ile `Math.max` aynı sayıyı verir.
// Dikdörtgen düzlemde ise en düşük rezonans UZUN kenardan gelir.
describe('lowestCavityResonance — dikdörtgen düzlem (a ≠ b)', () => {
  // a = 100 mm, b = 200 mm, εr = 4 → c/(2√εr) = 299792458/4 = 74 948 114.5
  //   f10 = 74 948 114.5 × (1/0.1) = 749 481 145 Hz  ≈ 749.481 MHz
  //   f01 = 74 948 114.5 × (1/0.2) = 374 740 572.5 Hz ≈ 374.741 MHz
  // En düşük olan f01'dir; Math.min → Math.max mutasyonu f10'u döndürürdü.
  const a = 0.1
  const b = 0.2
  const epsR = 4

  it('en düşük rezonans 374.7405725 MHz (uzun kenardan gelen f01)', () => {
    expect(lowestCavityResonance({ a, b, epsR }) / 1e6).toBeCloseTo(374.7405725, 6)
  })

  it('kısa kenardan gelen f10 iki katıdır ve DÖNMEZ', () => {
    expect(cavityModeFrequency({
      m: 1, n: 0, a, b, epsR,
    }) / 1e6).toBeCloseTo(749.481145, 5)
    expect(lowestCavityResonance({ a, b, epsR }) / 1e6).not.toBeCloseTo(749.481145, 2)
  })

  it('a ve b takas edilince sonuç değişmez (geometrik simetri)', () => {
    expect(lowestCavityResonance({ a: b, b: a, epsR })).toBe(lowestCavityResonance({ a, b, epsR }))
  })

  it('planeCavityAnalysis dikdörtgende de aynı en düşük rezonansı basar', () => {
    const r = planeCavityAnalysis({
      a, b, d: 1e-4, epsR, lossTangent: 0.02, mMax: 2, nMax: 2,
    })
    expect(r.lowestResonance / 1e6).toBeCloseTo(374.7405725, 6)
    // Mod listesinin en küçüğü ile de örtüşmeli (sıralı liste, (0,1) başta).
    expect(r.modes[0].m).toBe(0)
    expect(r.modes[0].n).toBe(1)
    expect(r.modes[0].freq).toBeCloseTo(r.lowestResonance, 3)
  })
})

describe('dielektrik dalga boyu ve stitching aralığı', () => {
  it('λ_d = c / (f·√εr)', () => {
    const lambda = dielectricWavelength({ frequency: 1e9, epsR: 4 })
    expect(lambda).toBeCloseTo(299792458 / (1e9 * 2), 9)
  })

  it('geçersiz N hata döner', () => {
    expect(stitchingSpacingCheck({ frequency: 1e9, epsR: 4, n: 15 }).error).toBe(PC_ERR_STITCHING_N)
  })

  it('gerçek aralık sınırın altındaysa withinLimit true', () => {
    const r = stitchingSpacingCheck({ frequency: 1e9, epsR: 4, n: 20, actualSpacing: 0.001 })
    expect(r.withinLimit).toBe(true)
  })

  it('gerçek aralık verilmezse withinLimit null', () => {
    const r = stitchingSpacingCheck({ frequency: 1e9, epsR: 4, n: 20 })
    expect(r.withinLimit).toBeNull()
  })

  // s_max = λ_d / N hiçbir testte OKUNMUYORDU: `withinLimit` sınaması 1 mm gibi
  // her iki durumda da geçen bir aralıkla yapıldığı için `lambda * n` mutasyonu
  // bile fark ettirmezdi (o mutasyonda sınır 200 kat büyür ve her aralık geçer).
  it('s_max çıplak değerleri: 1 GHz, εr = 4 (λ_d = 149.896229 mm)', () => {
    // λ_d = c/(f√εr) = 299792458/(1e9 × 2) = 0.149896229 m
    //   N = 10 → 14.9896229 mm
    //   N = 20 →  7.49481145 mm
    //   N = 40 →  3.747405725 mm
    const at = (n) => stitchingSpacingCheck({ frequency: 1e9, epsR: 4, n })
    expect(at(10).lambda * 1e3).toBeCloseTo(149.896229, 6)
    expect(at(10).sMax * 1e3).toBeCloseTo(14.9896229, 6)
    expect(at(20).sMax * 1e3).toBeCloseTo(7.49481145, 6)
    expect(at(40).sMax * 1e3).toBeCloseTo(3.747405725, 6)
  })

  it('N büyüdükçe s_max KÜÇÜLÜR (bölme; çarpma olsaydı büyürdü)', () => {
    const s = [10, 20, 40].map((n) => stitchingSpacingCheck({ frequency: 1e9, epsR: 4, n }).sMax)
    expect(s[0]).toBeGreaterThan(s[1])
    expect(s[1]).toBeGreaterThan(s[2])
    // Her kademe tam yarısı olmalı.
    expect(s[0] / s[1]).toBeCloseTo(2, 12)
    expect(s[1] / s[2]).toBeCloseTo(2, 12)
    // s_max daima λ'nın altındadır — `lambda * n` mutasyonunda üstünde olurdu.
    expect(s[0]).toBeLessThan(0.149896229)
  })

  it('50 mm aralık 7.49 mm sınırının DIŞINDADIR (withinLimit false)', () => {
    // Bu nokta bilerek λ/20 ile λ×20 arasında seçildi: `lambda * n` mutasyonunda
    // sınır 2.998 m olur ve 50 mm "sınır içinde" görünürdü.
    const r = stitchingSpacingCheck({
      frequency: 1e9, epsR: 4, n: 20, actualSpacing: 0.05,
    })
    expect(r.withinLimit).toBe(false)
  })
})

describe('planeCavityAnalysis', () => {
  const base = { a: 0.1, b: 0.1, d: 1e-4, epsR: 4, lossTangent: 0.02, mMax: 2, nMax: 2 }

  it('geçersiz temel girdide hata döner', () => {
    expect(planeCavityAnalysis({ ...base, d: 0 }).error).toBe(PC_ERR_INVALID)
  })

  it('opsiyonel bloklar girdi verilmezse null kalır', () => {
    const r = planeCavityAnalysis(base)
    expect(r.energy).toBeNull()
    expect(r.totalQ).toBeNull()
    expect(r.stitching).toBeNull()
  })

  it('örtüşen etkin alan verilirse doğrudan kullanılır', () => {
    const r = planeCavityAnalysis({ ...base, area: 0.02 })
    expect(r.area).toBeCloseTo(0.02, 12)
    expect(r.capacitance).toBeCloseTo(planeCapacitance({ epsR: 4, area: 0.02, d: 1e-4 }), 15)
  })

  it('stitching hedefi verilirse alt blok dolar, üst düzey ok kalır', () => {
    const r = planeCavityAnalysis({
      ...base, targetFrequency: 1e9, stitchingN: 20, actualStitchingSpacing: 0.001,
    })
    expect(r.ok).toBe(true)
    expect(r.stitching.withinLimit).toBe(true)
  })

  it('geçersiz stitching N alt blokta hata taşır, üst düzey ok kalır', () => {
    const r = planeCavityAnalysis({ ...base, targetFrequency: 1e9, stitchingN: 7 })
    expect(r.ok).toBe(true)
    expect(r.stitching.error).toBe(PC_ERR_STITCHING_N)
  })
})
