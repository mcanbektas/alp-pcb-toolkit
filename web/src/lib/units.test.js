// units.js testleri (spec §3.1, §4.1.2).
//
// Buradaki iş bölümü şudur: çarpan tabloları tanım gereği tam sayılardır, o
// yüzden `toBe` ile birebir kontrol edilir; yoğunluktan türeyen kalınlık gibi
// hesaplanmış değerler `toBeCloseTo` ile kontrol edilir.

import { describe, it, expect } from 'vitest'
import {
  INCH_M, MIL_M, C0, EPS0, MU0, ETA0,
  RHO_CU_20, ALPHA_CU, DENSITY_CU,
  LENGTH, AREA, CURRENT, VOLTAGE, RESISTANCE,
  CAPACITANCE, CHARGE, INDUCTANCE, FREQUENCY, TIME, POWER, ENERGY, THERMAL_R,
  toSI, fromSI,
  copperThicknessFromWeight, OZ_NOMINAL_UM, rhoCuAt,
  mmToM, mToMm, milToMm, mmToMil, umToM, mToUm,
} from './units'

describe('tanım gereği tam uzunluk çarpanları', () => {
  it('1 inch = 25.4 mm, 1 mil = 0.001 inch', () => {
    expect(INCH_M).toBe(0.0254)
    expect(MIL_M).toBe(2.54e-5)
    expect(LENGTH.mil).toBe(2.54e-5)
    expect(LENGTH.inch).toBe(INCH_M)
    expect(LENGTH.inch / LENGTH.mil).toBeCloseTo(1000, 9)
  })

  it('SI önekleri tablodaki karşılıklarıyla tutarlı', () => {
    expect(LENGTH.m).toBe(1)
    expect(LENGTH.cm).toBe(1e-2)
    expect(LENGTH.mm).toBe(1e-3)
    expect(LENGTH['µm']).toBe(1e-6)
  })

  it("µm ve um aynı çarpanı taşır (klavyeden µ girilemeyen durum)", () => {
    expect(LENGTH.um).toBe(LENGTH['µm'])
  })
})

describe('alan tablosu uzunluk tablosunun karesidir', () => {
  it('mil² = MIL_M²', () => {
    expect(AREA['mil²']).toBe(MIL_M * MIL_M)
  })

  it('cm² = 1e-4 m² ve LENGTH.cm² ile aynı', () => {
    expect(AREA['cm²']).toBe(1e-4)
    expect(AREA['cm²']).toBeCloseTo(LENGTH.cm * LENGTH.cm, 20)
  })

  it('mm² ve µm² uzunluk çarpanlarının karesine oturur', () => {
    expect(AREA['mm²']).toBeCloseTo(LENGTH.mm * LENGTH.mm, 20)
    expect(AREA['µm²']).toBeCloseTo(LENGTH['µm'] * LENGTH['µm'], 26)
    expect(AREA['m²']).toBe(1)
  })

  it('40 cm² = 4e-3 m² (PDN düzlem alanı ölçeği)', () => {
    expect(toSI(40, 'cm²', AREA)).toBeCloseTo(4e-3, 15)
    expect(fromSI(4e-3, 'cm²', AREA)).toBeCloseTo(40, 12)
  })
})

describe('elektriksel tablolarda önek tutarlılığı', () => {
  it('m/µ/k/M önekleri her tabloda aynı çarpanı verir', () => {
    expect(RESISTANCE.Ω).toBe(1)
    expect(RESISTANCE.mΩ).toBe(1e-3)
    expect(RESISTANCE.µΩ).toBe(1e-6)
    expect(RESISTANCE.kΩ).toBe(1e3)
    expect(RESISTANCE.MΩ).toBe(1e6)

    expect(CURRENT.mA).toBe(1e-3)
    expect(VOLTAGE.mV).toBe(1e-3)
    expect(POWER.mW).toBe(1e-3)
    expect(CAPACITANCE.pF).toBe(1e-12)
    expect(CHARGE.nC).toBe(1e-9)
    expect(ENERGY.µJ).toBe(1e-6)
    expect(INDUCTANCE.nH).toBe(1e-9)
    expect(TIME.ps).toBe(1e-12)
    expect(FREQUENCY.GHz).toBe(1e9)
  })

  it('°C/W ve K/W aynı çarpandır (sıcaklık farkı ölçeği ortak)', () => {
    expect(THERMAL_R['°C/W']).toBe(1)
    expect(THERMAL_R['K/W']).toBe(THERMAL_R['°C/W'])
  })
})

describe('toSI / fromSI', () => {
  it('bilinen birimi çarpar ve böler', () => {
    expect(toSI(5, 'mil', LENGTH)).toBeCloseTo(1.27e-4, 18)
    expect(toSI(2, 'kΩ', RESISTANCE)).toBeCloseTo(2000, 9)
    expect(fromSI(1.27e-4, 'mil', LENGTH)).toBeCloseTo(5, 9)
  })

  it('gidiş-dönüş başlangıç değerini verir', () => {
    const si = toSI(3.3, 'mV', VOLTAGE)
    expect(fromSI(si, 'mV', VOLTAGE)).toBeCloseTo(3.3, 12)
  })

  it('bilinmeyen birim NaN döner — sessizce 1 kabul edilmez', () => {
    expect(toSI(1, 'furlong', LENGTH)).toBeNaN()
    expect(fromSI(1, 'furlong', LENGTH)).toBeNaN()
    // Yanlış tablodan okunan doğru birim de bilinmeyen sayılır
    expect(toSI(1, 'mm', RESISTANCE)).toBeNaN()
    expect(fromSI(1, 'mm', RESISTANCE)).toBeNaN()
  })

  it('sıfır ve negatif değer çarpandan geçer (aralık denetimi burada değil)', () => {
    expect(toSI(0, 'mm', LENGTH)).toBe(0)
    expect(toSI(-2, 'mm', LENGTH)).toBeCloseTo(-2e-3, 15)
  })
})

describe('sıcaklığa bağlı bakır özdirenci', () => {
  it('20 °C tam olarak RHO_CU_20 verir', () => {
    expect(rhoCuAt(20)).toBe(RHO_CU_20)
  })

  it('sıcaklık arttıkça özdirenç artar', () => {
    expect(rhoCuAt(70)).toBeGreaterThan(rhoCuAt(20))
    expect(rhoCuAt(0)).toBeLessThan(rhoCuAt(20))
  })

  it('doğrusal sıcaklık katsayısı bağıntısına uyar', () => {
    const T = 85
    expect(rhoCuAt(T)).toBeCloseTo(RHO_CU_20 * (1 + ALPHA_CU * (T - 20)), 18)
    // 1 °C artış RHO_CU_20·ALPHA_CU kadar ekler
    expect(rhoCuAt(21) - rhoCuAt(20)).toBeCloseTo(RHO_CU_20 * ALPHA_CU, 18)
  })
})

describe('bakır ağırlığından kalınlık (spec §4.1.2)', () => {
  it('1 oz/ft² yoğunluktan ~34.06 µm verir', () => {
    expect(copperThicknessFromWeight(1) * 1e6).toBeCloseTo(34.06, 2)
  })

  it('ağırlıkla doğrusaldır', () => {
    const t1 = copperThicknessFromWeight(1)
    expect(copperThicknessFromWeight(0.5)).toBeCloseTo(t1 / 2, 12)
    expect(copperThicknessFromWeight(2)).toBeCloseTo(t1 * 2, 12)
    expect(copperThicknessFromWeight(0)).toBe(0)
  })

  it('kütle/yoğunluk tanımıyla birebir örtüşür', () => {
    const mA = copperThicknessFromWeight(1) * DENSITY_CU // kg/m²
    expect(mA).toBeCloseTo(0.30515, 4)
  })

  it('nominal endüstri tablosu türetilen değerden farklıdır (1 oz için 35 µm)', () => {
    expect(OZ_NOMINAL_UM[1]).toBe(35)
    expect(OZ_NOMINAL_UM[2]).toBe(70)
    // Fark kasıtlıdır: nominal folyo tanımı ile yoğunluk hesabı aynı sayı değil
    expect(OZ_NOMINAL_UM[1]).not.toBeCloseTo(copperThicknessFromWeight(1) * 1e6, 1)
  })
})

describe('fiziksel sabitler kendi içinde tutarlı', () => {
  it('c₀ = 1/√(ε₀µ₀)', () => {
    expect(1 / Math.sqrt(EPS0 * MU0)).toBeCloseTo(C0, -2)
  })

  it('η₀ = µ₀·c₀', () => {
    expect(MU0 * C0).toBeCloseTo(ETA0, 6)
  })
})

describe('uzunluk kısayolları tabloyla aynı sonucu verir', () => {
  it('mm ↔ m ve µm ↔ m', () => {
    expect(mmToM(2.5)).toBeCloseTo(toSI(2.5, 'mm', LENGTH), 18)
    expect(mToMm(2.5e-3)).toBeCloseTo(2.5, 12)
    expect(umToM(35)).toBeCloseTo(toSI(35, 'µm', LENGTH), 20)
    expect(mToUm(3.5e-5)).toBeCloseTo(35, 9)
  })

  it('mil ↔ mm yuvarlanmış katsayı kullanmaz', () => {
    expect(milToMm(1000)).toBeCloseTo(25.4, 12)
    expect(mmToMil(1)).toBeCloseTo(39.37007874015748, 12)
    expect(mmToMil(milToMm(6))).toBeCloseTo(6, 12)
  })
})
