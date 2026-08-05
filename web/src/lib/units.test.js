// units.js testleri (spec §3.1, §4.1.2).
//
// Buradaki iş bölümü şudur: çarpan tabloları tanım gereği tam sayılardır, o
// yüzden `toBe` ile birebir kontrol edilir; yoğunluktan türeyen kalınlık gibi
// hesaplanmış değerler `toBeCloseTo` ile kontrol edilir.

import { describe, it, expect } from 'vitest'
import {
  INCH_M, MIL_M, C0, EPS0, MU0, ETA0, K_B,
  RHO_CU_20, ALPHA_CU, DENSITY_CU, K_CU, K_CU_HIGH, K_CU_RANGE, K_FR4,
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

// --- Aşağıdaki bloklar ÇIPLAK DEĞER denetimidir ------------------------------
//
// Yukarıdaki testlerin bir kısmı sabitleri yalnızca birbirleriyle karşılaştırıyor
// (c₀ = 1/√(ε₀µ₀) ve η₀ = µ₀c₀ — dört bilinmeyene iki denklem). Bu iki bağıntıyı
// `(c₀·k, ε₀/k², µ₀/k², η₀)` ailesinin TAMAMI sağlar: her iki sabit birlikte
// bozulursa testler yeşil kalır. Aynı boşluk tüketici testlerde de var — sabiti
// kendisiyle karşılaştıran bir iddia sabitin YANLIŞ olduğunu göremez. Bu yüzden
// her sabit burada ayrıca kendi ölçülmüş/tanımlı sayısıyla sınanır.
//
// `toBe` bilinçlidir: bir fiziksel sabiti değiştirmek daima bilinçli bir karardır
// (örn. CODATA sürümü yükseltmek) ve bu testi de aynı commit'te güncellemeyi
// gerektirir. Basamak düşmesi / kaydırması sessizce geçmez.

describe('fiziksel sabitler — çıplak CODATA/SI değerleri', () => {
  it('c₀ tanım gereği tam 299 792 458 m/s', () => {
    // SI 2019: metre bu sayıyla tanımlıdır, ölçülmüş bir büyüklük değildir.
    expect(C0).toBe(299792458)
  })

  it('ε₀ = 8.8541878128e-12 F/m (CODATA 2018)', () => {
    expect(EPS0).toBe(8.8541878128e-12)
  })

  it('µ₀ = 1.25663706212e-6 H/m (CODATA 2018)', () => {
    expect(MU0).toBe(1.25663706212e-6)
    // 4π×10⁻⁷ eski TANIM değeri; CODATA 2018'de artık ölçülmüş bir sabittir ve
    // ondan ~5.4e-10 bağıl farkla ayrılır. İkisi karıştırılmasın diye ölçülür.
    expect(MU0).not.toBe(4 * Math.PI * 1e-7)
    expect(MU0 / (4 * Math.PI * 1e-7)).toBeCloseTo(1, 8)
  })

  it('η₀ = 376.730313668 Ω (CODATA 2018)', () => {
    expect(ETA0).toBe(376.730313668)
  })

  it('k_B tanım gereği tam 1.380649e-23 J/K', () => {
    // SI 2019: kelvin bu sayıyla tanımlıdır (ölçülmüş sabit değil).
    expect(K_B).toBe(1.380649e-23)
  })

  it('sabitler mertebe olarak da doğru — basamak kaymasını yakalar', () => {
    // 1/√(ε₀µ₀) bağıntısı ölçek ailesine kör olduğu için mertebe ayrıca sınanır.
    expect(EPS0).toBeGreaterThan(8e-12)
    expect(EPS0).toBeLessThan(9e-12)
    expect(MU0).toBeGreaterThan(1e-6)
    expect(MU0).toBeLessThan(2e-6)
    expect(ETA0).toBeGreaterThan(376)
    expect(ETA0).toBeLessThan(377)
  })
})

describe('malzeme sabitleri — çıplak değerler (spec §5.2)', () => {
  it('bakır ısı iletkenliği aralığının iki ucu 385 ve 400 W/(m·K)', () => {
    expect(K_CU).toBe(385)
    expect(K_CU_HIGH).toBe(400)
    // Aralık [alt, üst] sırasındadır — ters çevrilirse ekranda "385–400" yerine
    // "400–385" görünür ve seçici alt/üst ucu takas eder.
    expect(K_CU_RANGE).toEqual([385, 400])
    expect(K_CU_RANGE[0]).toBeLessThan(K_CU_RANGE[1])
    // Termal dirençteki fark: (400−385)/385 = %3.896…
    expect(((K_CU_HIGH - K_CU) / K_CU) * 100).toBeCloseTo(3.896, 3)
  })

  it('FR-4 ısı iletkenliği 0.3 W/(m·K)', () => {
    expect(K_FR4).toBe(0.3)
    // Bakırla arasındaki üç mertebelik fark termal via hesabının tamamının
    // dayanağı: 385/0.3 ≈ 1283.
    expect(K_CU / K_FR4).toBeCloseTo(1283.333, 2)
  })

  it('bakır yoğunluğu 8960 kg/m³ ve 20 °C özdirenci 1.724e-8 Ω·m', () => {
    expect(DENSITY_CU).toBe(8960)
    expect(RHO_CU_20).toBe(1.724e-8)
    expect(ALPHA_CU).toBe(0.00393)
  })
})

describe('rhoCuAt — çıplak referans değerler', () => {
  // Elle: ρ(T) = 1.724e-8 · (1 + 0.00393·(T − 20))
  it('70 °C → 2.062766e-8 Ω·m', () => {
    // 1 + 0.00393·50 = 1.1965 ; 1.724 × 1.1965 = 2.062766
    expect(rhoCuAt(70)).toBeCloseTo(2.062766e-8, 16)
  })

  it('0 °C → 1.5884936e-8 Ω·m', () => {
    // 1 + 0.00393·(−20) = 0.9214 ; 1.724 × 0.9214 = 1.5884936
    expect(rhoCuAt(0)).toBeCloseTo(1.5884936e-8, 16)
  })

  it('100 °C → 2.2660256e-8 Ω·m', () => {
    // 1 + 0.00393·80 = 1.3144 ; 1.724 × 1.3144 = 2.2660256
    expect(rhoCuAt(100)).toBeCloseTo(2.2660256e-8, 16)
  })

  it('−40 °C → 1.3174808e-8 Ω·m (referans altı sıcaklıkta işaret doğru)', () => {
    // 1 + 0.00393·(−60) = 0.7642 ; 1.724 × 0.7642 = 1.3174808
    // İşaret ters çevrilirse (T − 20 → 20 − T) sonuç 2.1305192e-8 olurdu.
    expect(rhoCuAt(-40)).toBeCloseTo(1.3174808e-8, 16)
  })
})

// --- Çarpan tablolarının BÜTÜN anahtarları ------------------------------------
//
// Tablo başına tek önek sınamak yetmiyor: `FREQUENCY.MHz = 1e5` gibi tek
// basamaklı bir yazım hatası, `GHz` sınandığı sürece görünmez. Her tablonun her
// anahtarı ayrı ayrı ve anahtar kümesi bütün olarak denetlenir — böylece
// eksik/fazla önek de yakalanır.

describe('çarpan tablolarının bütün anahtarları', () => {
  it('LENGTH: yedi anahtarın hepsi', () => {
    expect(Object.keys(LENGTH)).toEqual(['m', 'cm', 'mm', 'um', 'µm', 'mil', 'inch'])
    expect(LENGTH.m).toBe(1)
    expect(LENGTH.cm).toBe(1e-2)
    expect(LENGTH.mm).toBe(1e-3)
    expect(LENGTH.um).toBe(1e-6)
    expect(LENGTH['µm']).toBe(1e-6)
    expect(LENGTH.mil).toBe(2.54e-5)
    expect(LENGTH.inch).toBe(0.0254)
  })

  it('FREQUENCY: dört anahtarın hepsi', () => {
    expect(Object.keys(FREQUENCY)).toEqual(['Hz', 'kHz', 'MHz', 'GHz'])
    expect(FREQUENCY.Hz).toBe(1)
    expect(FREQUENCY.kHz).toBe(1e3)
    expect(FREQUENCY.MHz).toBe(1e6)
    expect(FREQUENCY.GHz).toBe(1e9)
  })

  it('CAPACITANCE: beş anahtarın hepsi', () => {
    expect(Object.keys(CAPACITANCE)).toEqual(['F', 'mF', 'µF', 'nF', 'pF'])
    expect(CAPACITANCE.F).toBe(1)
    expect(CAPACITANCE.mF).toBe(1e-3)
    expect(CAPACITANCE['µF']).toBe(1e-6)
    expect(CAPACITANCE.nF).toBe(1e-9)
    expect(CAPACITANCE.pF).toBe(1e-12)
  })

  it('INDUCTANCE, TIME, CHARGE, ENERGY: bütün anahtarlar', () => {
    expect(Object.keys(INDUCTANCE)).toEqual(['H', 'mH', 'µH', 'nH', 'pH'])
    expect(INDUCTANCE.H).toBe(1)
    expect(INDUCTANCE.mH).toBe(1e-3)
    expect(INDUCTANCE['µH']).toBe(1e-6)
    expect(INDUCTANCE.nH).toBe(1e-9)
    expect(INDUCTANCE.pH).toBe(1e-12)

    expect(Object.keys(TIME)).toEqual(['s', 'ms', 'µs', 'ns', 'ps'])
    expect(TIME.s).toBe(1)
    expect(TIME.ms).toBe(1e-3)
    expect(TIME['µs']).toBe(1e-6)
    expect(TIME.ns).toBe(1e-9)
    expect(TIME.ps).toBe(1e-12)

    expect(Object.keys(CHARGE)).toEqual(['C', 'mC', 'µC', 'nC', 'pC'])
    expect(CHARGE.C).toBe(1)
    expect(CHARGE.mC).toBe(1e-3)
    expect(CHARGE['µC']).toBe(1e-6)
    expect(CHARGE.nC).toBe(1e-9)
    expect(CHARGE.pC).toBe(1e-12)

    expect(Object.keys(ENERGY)).toEqual(['J', 'mJ', 'µJ', 'nJ'])
    expect(ENERGY.J).toBe(1)
    expect(ENERGY.mJ).toBe(1e-3)
    expect(ENERGY['µJ']).toBe(1e-6)
    expect(ENERGY.nJ).toBe(1e-9)
  })

  it('CURRENT, VOLTAGE, POWER, RESISTANCE: bütün anahtarlar', () => {
    expect(Object.keys(CURRENT)).toEqual(['A', 'mA', 'µA', 'kA'])
    expect(CURRENT.A).toBe(1)
    expect(CURRENT.mA).toBe(1e-3)
    expect(CURRENT['µA']).toBe(1e-6)
    expect(CURRENT.kA).toBe(1e3)

    expect(Object.keys(VOLTAGE)).toEqual(['V', 'mV', 'µV', 'kV'])
    expect(VOLTAGE.V).toBe(1)
    expect(VOLTAGE.mV).toBe(1e-3)
    expect(VOLTAGE['µV']).toBe(1e-6)
    expect(VOLTAGE.kV).toBe(1e3)

    expect(Object.keys(POWER)).toEqual(['W', 'mW', 'µW', 'kW'])
    expect(POWER.W).toBe(1)
    expect(POWER.mW).toBe(1e-3)
    expect(POWER['µW']).toBe(1e-6)
    expect(POWER.kW).toBe(1e3)

    expect(Object.keys(RESISTANCE)).toEqual(['Ω', 'mΩ', 'µΩ', 'kΩ', 'MΩ'])
    expect(RESISTANCE.Ω).toBe(1)
    expect(RESISTANCE.mΩ).toBe(1e-3)
    expect(RESISTANCE.µΩ).toBe(1e-6)
    expect(RESISTANCE.kΩ).toBe(1e3)
    expect(RESISTANCE.MΩ).toBe(1e6)
  })

  it('AREA ve THERMAL_R: bütün anahtarlar', () => {
    expect(Object.keys(AREA)).toEqual(['m²', 'cm²', 'mm²', 'µm²', 'mil²'])
    expect(AREA['m²']).toBe(1)
    expect(AREA['cm²']).toBe(1e-4)
    expect(AREA['mm²']).toBe(1e-6)
    expect(AREA['µm²']).toBe(1e-12)
    // (2.54e-5)² = 6.4516e-10 — elle: 2.54² = 6.4516
    expect(AREA['mil²']).toBeCloseTo(6.4516e-10, 20)

    expect(Object.keys(THERMAL_R)).toEqual(['°C/W', 'K/W'])
    expect(THERMAL_R['°C/W']).toBe(1)
    expect(THERMAL_R['K/W']).toBe(1)
  })

  it('OZ_NOMINAL_UM: altı kaydın hepsi (nominal endüstri tablosu, µm)', () => {
    expect(Object.keys(OZ_NOMINAL_UM).sort()).toEqual(['0.5', '1', '1.5', '2', '3', '4'])
    expect(OZ_NOMINAL_UM[0.5]).toBe(17.5)
    expect(OZ_NOMINAL_UM[1]).toBe(35)
    expect(OZ_NOMINAL_UM[1.5]).toBe(52.5)
    expect(OZ_NOMINAL_UM[2]).toBe(70)
    expect(OZ_NOMINAL_UM[3]).toBe(105)
    expect(OZ_NOMINAL_UM[4]).toBe(140)
    // Tablo 35 µm/oz ile doğrusaldır — bir satır kayarsa bu da kırılır.
    for (const oz of [0.5, 1, 1.5, 2, 3, 4]) {
      expect(OZ_NOMINAL_UM[oz]).toBeCloseTo(oz * 35, 12)
    }
  })
})
