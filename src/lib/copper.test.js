import { describe, it, expect } from 'vitest'
import {
  nominalThickness, derivedThickness, weightFromThickness,
  finishedThickness, allUnits, trapezoidArea,
  OZ_NOMINAL_ROWS, nominalRow, thicknessFromWeight, nearestNominalWeight,
  METHOD_NOMINAL, METHOD_DERIVED, toleranceCorners,
  COPPER_ERR_INVALID, COPPER_ERR_TOLERANCE,
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

describe('nominal tablo satırları (spec §4.1.2)', () => {
  it('sayısal sırada gelir — Object.keys sırası düzeltilir', () => {
    expect(OZ_NOMINAL_ROWS.map((r) => r.oz)).toEqual([0.5, 1, 1.5, 2, 3, 4])
  })

  it('kalınlıklar spec tablosuyla birebir', () => {
    expect(OZ_NOMINAL_ROWS.map((r) => r.um)).toEqual([17.5, 35, 52.5, 70, 105, 140])
    expect(OZ_NOMINAL_ROWS[2].t).toBeCloseTo(52.5e-6, 12)
  })

  it('anahtardan satır bulunur, tablo dışı anahtar null döner', () => {
    expect(nominalRow('1.5')).toMatchObject({ oz: 1.5, um: 52.5 })
    expect(nominalRow(2)).toMatchObject({ oz: 2, um: 70 })
    expect(nominalRow('2.5')).toBeNull()
    expect(nominalRow('custom')).toBeNull()
  })
})

describe('yöntem seçimi (spec §4.1.2)', () => {
  it('varsayılan nominal tablodur — bugünkü sonuç değişmez', () => {
    expect(thicknessFromWeight(1)).toBeCloseTo(35e-6, 12)
    expect(thicknessFromWeight(2)).toBeCloseTo(70e-6, 12)
    expect(thicknessFromWeight(1, METHOD_NOMINAL)).toBe(nominalThickness(1))
  })

  it('türetilmiş yöntem yoğunluktan gelir: 2 oz ≈ 68.114 µm', () => {
    // m_A = 2 × 0.0283495231 / 0.09290304 = 0.6103033 kg/m²
    // t   = 0.6103033 / 8960 = 6.81142e-5 m
    expect(thicknessFromWeight(2, METHOD_DERIVED) * 1e6).toBeCloseTo(68.1142, 3)
    expect(thicknessFromWeight(2, METHOD_DERIVED)).toBe(derivedThickness(2))
  })

  it('bilinmeyen yöntem adı nominale düşer', () => {
    expect(thicknessFromWeight(1, 'sacma')).toBeCloseTo(35e-6, 12)
  })
})

describe('en yakın sipariş edilebilir ağırlık (spec §12)', () => {
  it('varsayılan form: 35 µm folyo + 25 µm kaplama = 60 µm → 1.5 oz', () => {
    // |17.5−60|=42.5  |35−60|=25  |52.5−60|=7.5  |70−60|=10  |105−60|=45
    const r = nearestNominalWeight(60e-6)
    expect(r.oz).toBe(1.5)
    expect(r.um).toBe(52.5)
    expect(r.exact).toBe(false)
    // (52.5 − 60) / 60 = −12.5 %
    expect(r.deltaPct).toBeCloseTo(-12.5, 9)
    expect(r.outOfRange).toBe(false)
  })

  it('tablo değerinin kendisi tam oturur', () => {
    const r = nearestNominalWeight(105e-6)
    expect(r.oz).toBe(3)
    expect(r.exact).toBe(true)
    expect(r.deltaPct).toBeCloseTo(0, 12)
  })

  it('eşit uzaklıkta kalın basamak seçilir', () => {
    // 26.25 µm: |17.5−26.25| = |35−26.25| = 8.75 → 1 oz
    const r = nearestNominalWeight(26.25e-6)
    expect(r.oz).toBe(1)
    // (35 − 26.25) / 26.25 = +33.3333 %
    expect(r.deltaPct).toBeCloseTo(33.3333333, 6)
  })

  it('tablo aralığının dışı işaretlenir', () => {
    const thick = nearestNominalWeight(200e-6)
    expect(thick.oz).toBe(4)
    expect(thick.outOfRange).toBe(true)
    // (140 − 200) / 200 = −30 %
    expect(thick.deltaPct).toBeCloseTo(-30, 9)

    const thin = nearestNominalWeight(9e-6)
    expect(thin.oz).toBe(0.5)
    expect(thin.outOfRange).toBe(true)
  })

  it('geçersiz kalınlık null döner', () => {
    expect(nearestNominalWeight(0)).toBeNull()
    expect(nearestNominalWeight(NaN)).toBeNull()
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

describe('worst-case tolerans köşeleri (spec §3.4)', () => {
  // Varsayılan formun geometrisi: 35 µm folyo + 25 µm kaplama, 0.25 mm yol.
  const base = {
    starting: 35e-6, plating: 25e-6, layer: 'external',
    W: 0.25e-3, etchFactor: 0, T: 20,
  }

  it('tolerans girilmezse üçlü tek değere çöker — bugünkü sonuç değişmez', () => {
    const r = toleranceCorners(base)
    expect(r.active).toBe(false)
    // Kayan noktada da birebir: 1 ile çarpma değeri değiştirmez, üç uç aynı
    // float'tır (35e-6 + 25e-6 toplamının kendisi 60e-6'dan son bitte farklıdır)
    expect(r.finished.min).toBe(r.finished.nom)
    expect(r.finished.max).toBe(r.finished.nom)
    expect(r.finished.nom).toBeCloseTo(60e-6, 15)
    expect(r.finished.spreadPct).toBe(0)
    expect(r.area.min).toBe(r.area.max)
    expect(r.Rsheet.min).toBe(r.Rsheet.max)
  })

  it('üç toleranslı giriş 2³ = 8 köşe verir', () => {
    const r = toleranceCorners({ ...base, tol: { starting: 0.1, plating: 0.2, etch: 0 } })
    expect(r.corners).toHaveLength(8)
    expect(r.active).toBe(true)
  })

  it('folyo ±%10 + kaplama ±%20: 51.5 · 60 · 68.5 µm', () => {
    // folyo 35 → [31.5, 38.5] µm, kaplama 25 → [20, 30] µm
    // bitmiş: 31.5+20 = 51.5 · 35+25 = 60 · 38.5+30 = 68.5 µm
    const r = toleranceCorners({ ...base, tol: { starting: 0.1, plating: 0.2 } })
    expect(r.finished.min).toBeCloseTo(51.5e-6, 12)
    expect(r.finished.nom).toBeCloseTo(60e-6, 12)
    expect(r.finished.max).toBeCloseTo(68.5e-6, 12)
    // (51.5 − 60)/60 = −14.1667 %, (68.5 − 60)/60 = +14.1667 %
    expect(r.finished.minPct).toBeCloseTo(-14.1666667, 6)
    expect(r.finished.maxPct).toBeCloseTo(14.1666667, 6)
    // (68.5 − 51.5)/60 = 28.3333 %
    expect(r.finished.spreadPct).toBeCloseTo(28.3333333, 6)

    // E = 0 → A = t·W, W = 0.25 mm
    expect(r.area.min).toBeCloseTo(1.2875e-8, 18)
    expect(r.area.nom).toBeCloseTo(1.5e-8, 18)
    expect(r.area.max).toBeCloseTo(1.7125e-8, 18)

    // R_□ = 1.724e-8 / t  → en ince folyo en yüksek direnci verir
    expect(r.Rsheet.min).toBeCloseTo(1.724e-8 / 68.5e-6, 12)
    expect(r.Rsheet.nom).toBeCloseTo(1.724e-8 / 60e-6, 12)
    expect(r.Rsheet.max).toBeCloseTo(1.724e-8 / 51.5e-6, 12)
    expect(r.Rsheet.max).toBeGreaterThan(r.Rsheet.nom)
  })

  it('aşındırma toleransı yalnızca kesit alanını oynatır', () => {
    // 35 µm iç katman folyo, 0.2 mm yol, E = %20 ± %50 → E ∈ [0.1, 0.3]
    // A = t·W·(2 − E)/2 = 7e-9 · (2 − E)/2
    const r = toleranceCorners({
      starting: 35e-6, plating: 0, layer: 'internal',
      W: 0.2e-3, etchFactor: 0.2, T: 20,
      tol: { etch: 0.5 },
    })
    expect(r.area.min).toBeCloseTo(5.95e-9, 18)
    expect(r.area.nom).toBeCloseTo(6.3e-9, 18)
    expect(r.area.max).toBeCloseTo(6.65e-9, 18)
    // (5.95 − 6.3)/6.3 = −5.5556 %
    expect(r.area.minPct).toBeCloseTo(-5.5555556, 6)

    // R_□ = ρ/t genişlikten ve aşındırmadan bağımsızdır
    expect(r.Rsheet.min).toBe(r.Rsheet.max)
    expect(r.Rsheet.nom).toBeCloseTo(1.724e-8 / 35e-6, 12)
    expect(r.finished.min).toBe(r.finished.max)
  })

  it('iç katmanda kaplama toleransı sonucu etkilemez', () => {
    const r = toleranceCorners({
      starting: 70e-6, plating: 25e-6, layer: 'internal',
      W: 0.5e-3, etchFactor: 0, T: 20,
      tol: { plating: 0.5 },
    })
    expect(r.tol.plating).toBe(0)
    expect(r.active).toBe(false)
    expect(r.finished.min).toBe(70e-6)
    expect(r.finished.max).toBe(70e-6)
  })

  it('%100 ve üstü tolerans reddedilir — kalınlık sıfırlanamaz', () => {
    expect(toleranceCorners({ ...base, tol: { starting: 1 } }).error).toBe(COPPER_ERR_TOLERANCE)
    expect(toleranceCorners({ ...base, tol: { plating: 1.5 } }).error).toBe(COPPER_ERR_TOLERANCE)
    expect(toleranceCorners({ ...base, tol: { etch: -0.1 } }).error).toBe(COPPER_ERR_TOLERANCE)
  })

  it('aşındırmanın üst ucu %100 olursa reddedilir', () => {
    // 0.8 × 1.3 = 1.04 → üst genişlik negatife düşerdi
    const r = toleranceCorners({ ...base, etchFactor: 0.8, tol: { etch: 0.3 } })
    expect(r.error).toBe(COPPER_ERR_TOLERANCE)
    // 0.8 × 1.2 = 0.96 → hâlâ geçerli
    expect(toleranceCorners({ ...base, etchFactor: 0.8, tol: { etch: 0.2 } }).error).toBeUndefined()
  })

  it('geçersiz geometri tolerans taramasına girmez', () => {
    expect(toleranceCorners({ ...base, starting: 0 }).error).toBe(COPPER_ERR_INVALID)
    expect(toleranceCorners({ ...base, W: 0 }).error).toBe(COPPER_ERR_INVALID)
    expect(toleranceCorners({ ...base, plating: -1e-6 }).error).toBe(COPPER_ERR_INVALID)
    expect(toleranceCorners({ ...base, etchFactor: 1 }).error).toBe(COPPER_ERR_INVALID)
  })
})
