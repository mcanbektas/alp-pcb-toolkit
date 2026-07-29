import { describe, it, expect } from 'vitest'
import {
  computeThermalRelief, uniformSpokeResistance, taperSpokeResistance,
  spokeThermalResistance, overlapWidthLimit, bridgeFraction,
  buildThermalReliefSweep,
  SPOKE_UNIFORM, SPOKE_TAPER, SPOKE_CUSTOM, SPOKE_MODES,
  TAPER_MIN_RELATIVE_DIFF,
  METHOD_ELECTRICAL, METHOD_THERMAL_1D,
  TR_ERR_REQUIRED, TR_ERR_NOT_FINITE, TR_ERR_NON_POSITIVE, TR_ERR_NOT_INTEGER,
  TR_ERR_GEOMETRY, TR_ERR_SPOKE_MODE, TR_ERR_NO_SPOKES,
  TR_VARIANT_CLEARANCE_UNDER_PAD,
  TR_WARN_SPOKE_OVERLAP, TR_WARN_UNBALANCED_SHARING, TR_WARN_SINGLE_SPOKE,
  ASSUMPTION_SPOKE_LENGTH_FROM_GAP, ASSUMPTION_EQUAL_SHARING, ASSUMPTION_NO_FAB_PROFILE,
  CHECK_SPOKE_WIDTH, CHECK_THERMAL_GAP, CHECK_VOLTAGE_DROP, CHECK_POWER_LOSS,
  CHECK_CURRENT_DENSITY, CHECK_THERMAL_RESISTANCE, CHECK_SPOKE_OVERLAP,
} from './thermalRelief'
import { RHO_CU_20, K_CU, K_CU_HIGH, rhoCuAt } from './units'
import { STATUS_OK, STATUS_DANGER, STATUS_UNKNOWN } from './dfmCheck'
import { expectErrorShape } from './errorShape.testkit'

const mm = (x) => x * 1e-3
const um = (x) => x * 1e-6

// Elle doğrulanan referans (brief §12.5). Sabitler `units.js`'ten okunur;
// beklenen değerler aynı denklemin ikinci kopyasıyla değil, sabit referans
// sayılarla doğrulanır.
//
//   ρ₂₀ = 1.724e-8 Ω·m,  T = 20 °C  →  ρ(T) = ρ₂₀
//   L = 0.30 mm, W = 0.20 mm, t = 35 µm, N = 4
//
//   R_s      = 1.724e-8 × 0.30e-3 / (0.20e-3 × 35e-6) = 7.38857143e-4 Ω
//   R_relief = R_s / 4                                = 1.84714286e-4 Ω
//   I = 2 A → V_drop = 3.69428571e-4 V,  P = 7.38857143e-4 W
//
//   k = 385 W/(m·K):  R_th = 27.8293135 K/W,  G_th = 0.0359333 W/K
//   k = 400 W/(m·K):  R_th = 26.7857143 K/W,  G_th = 0.0373333 W/K
const REF = {
  singleR: 7.38857142857e-4,
  parallelR: 1.84714285714e-4,
  vDrop: 3.69428571429e-4,
  power: 7.38857142857e-4,
  rth385: 27.8293135436,
  gth385: 0.0359333333333,
  rth400: 26.7857142857,
  gth400: 0.0373333333333,
}

const base = {
  current: 2,
  temperature: 20,
  copperThickness: um(35),
  spokeCount: 4,
  spokeMode: SPOKE_UNIFORM,
  spokeLength: mm(0.3),
  innerWidth: mm(0.2),
}

describe('computeThermalRelief — referans örnek', () => {
  const r = computeThermalRelief(base)

  it('bakır özdirenci units.js sabitinden gelir', () => {
    expect(r.results.rho).toBeCloseTo(RHO_CU_20, 15)
    expect(rhoCuAt(20)).toBeCloseTo(RHO_CU_20, 15)
  })

  it('tek spoke ve paralel eşdeğer direnci verir', () => {
    expect(r.results.singleResistance).toBeCloseTo(REF.singleR, 12)
    expect(r.results.parallelResistance).toBeCloseTo(REF.parallelR, 12)
  })

  it('gerilim düşümü ve güç kaybını verir', () => {
    expect(r.results.voltageDrop).toBeCloseTo(REF.vDrop, 12)
    expect(r.results.powerTotal).toBeCloseTo(REF.power, 12)
  })

  it('varsayılan termal iletkenlikle termal direnç ve iletkenlik', () => {
    expect(r.results.k).toBe(K_CU)
    expect(r.results.thermalResistance).toBeCloseTo(REF.rth385, 8)
    expect(r.results.thermalConductance).toBeCloseTo(REF.gth385, 12)
  })

  it('termal iletkenlik üst uca alınabilir', () => {
    const high = computeThermalRelief({ ...base, k: K_CU_HIGH })
    expect(high.results.k).toBe(K_CU_HIGH)
    expect(high.results.thermalResistance).toBeCloseTo(REF.rth400, 8)
    expect(high.results.thermalConductance).toBeCloseTo(REF.gth400, 12)
    // Elektriksel taraf termal iletkenlikten etkilenmez
    expect(high.results.parallelResistance).toBeCloseTo(REF.parallelR, 12)
  })

  it('toplam kesit alanı ve akım yoğunluğu', () => {
    // A = 4 × 0.20 mm × 35 µm = 2.8e-8 m² ; J = 2 / 2.8e-8
    expect(r.results.totalArea).toBeCloseTo(2.8e-8, 18)
    expect(r.results.averageCurrentDensity).toBeCloseTo(2 / 2.8e-8, 0)
    // Eşit spokede ortalama ve yerel yoğunluk aynıdır
    expect(r.results.maxLocalCurrentDensity).toBeCloseTo(r.results.averageCurrentDensity, 0)
  })

  it('spoke başına akım eşit paylaşılır', () => {
    expect(r.spokes).toHaveLength(4)
    for (const sp of r.spokes) expect(sp.current).toBeCloseTo(0.5, 12)
    expect(r.results.maxSpokeCurrent).toBeCloseTo(0.5, 12)
  })

  it('yöntem etiketleri elektriksel ve bir boyutlu termal olarak ayrılır', () => {
    expect(r.method).toBe(METHOD_ELECTRICAL)
    expect(r.thermalMethod).toBe(METHOD_THERMAL_1D)
    expect(r.assumptions).toContain(ASSUMPTION_EQUAL_SHARING)
  })

  it('belirli sıcaklık farkında iletilebilecek ısıyı verir', () => {
    const withDt = computeThermalRelief({ ...base, deltaT: 10 })
    expect(withDt.results.heatFlow).toBeCloseTo(10 / REF.rth385, 9)
  })

  it('sıcaklık farkı verilmezse ısı akışı üretilmez', () => {
    expect(r.results.heatFlow).toBeNull()
  })
})

describe('sıcaklık düzeltmesi', () => {
  it('özdirenç sıcaklıkla artar ve direnç onu izler', () => {
    const hot = computeThermalRelief({ ...base, temperature: 85 })
    expect(hot.results.rho).toBeCloseTo(rhoCuAt(85), 18)
    expect(hot.results.parallelResistance).toBeGreaterThan(REF.parallelR)
  })
})

describe('taper spoke', () => {
  it('eşit genişlikte dikdörtgen bağıntıya geçer', () => {
    const rect = uniformSpokeResistance({
      length: mm(0.3), width: mm(0.2), thickness: um(35), rho: RHO_CU_20,
    })
    const taper = taperSpokeResistance({
      length: mm(0.3), widthIn: mm(0.2), widthOut: mm(0.2), thickness: um(35), rho: RHO_CU_20,
    })
    expect(taper).toBeCloseTo(rect, 15)
    expect(rect).toBeCloseTo(REF.singleR, 12)
  })

  it('eşiğin iki yanında sonuç sürekli kalır', () => {
    const w = mm(0.2)
    const args = { length: mm(0.3), thickness: um(35), rho: RHO_CU_20 }
    // Eşiğin altında dikdörtgen limit, üstünde kapalı form çalışır. İki
    // geometri fiziksel olarak farklıdır (biri 5e-7, diğeri 2e-6 oranında
    // daralır), bu yüzden süreklilik mutlak değil **bağıl** ölçülür: eşikte
    // sıçrama olmamalı, fark geometrinin kendi farkı kadar kalmalı.
    const justBelow = taperSpokeResistance({
      ...args, widthIn: w, widthOut: w * (1 + TAPER_MIN_RELATIVE_DIFF * 0.5),
    })
    const justAbove = taperSpokeResistance({
      ...args, widthIn: w, widthOut: w * (1 + TAPER_MIN_RELATIVE_DIFF * 2),
    })
    const relJump = Math.abs(justAbove - justBelow) / justBelow
    expect(relJump).toBeLessThan(1e-5)

    // İkisi de dikdörtgen değerin bağıl olarak yanındadır
    expect(Math.abs(justBelow - REF.singleR) / REF.singleR).toBeLessThan(1e-5)
    expect(Math.abs(justAbove - REF.singleR) / REF.singleR).toBeLessThan(1e-5)
  })

  it('eşik geçişinde kapalı form sayısal olarak patlamaz', () => {
    const w = mm(0.2)
    const args = { length: mm(0.3), thickness: um(35), rho: RHO_CU_20 }
    // Eşiğin hemen üstünde pay ve payda birlikte küçülür; sonuç yine sonlu ve
    // dikdörtgen değere yakın olmalı — 0/0 kararsızlığına düşmemeli.
    for (const factor of [1.0001, 1.01, 1.5, 3, 10]) {
      const R = taperSpokeResistance({
        ...args, widthIn: w, widthOut: w * factor * TAPER_MIN_RELATIVE_DIFF + w,
      })
      expect(Number.isFinite(R)).toBe(true)
      expect(R).toBeGreaterThan(0)
    }
  })

  it('genişleyen spoke dikdörtgenden düşük direnç verir', () => {
    const taper = taperSpokeResistance({
      length: mm(0.3), widthIn: mm(0.2), widthOut: mm(0.4), thickness: um(35), rho: RHO_CU_20,
    })
    expect(taper).toBeLessThan(REF.singleR)
    // Kapalı form: ρL/[t(W₂−W₁)]·ln(W₂/W₁)
    const expected = (RHO_CU_20 * mm(0.3)) / (um(35) * mm(0.2)) * Math.log(2)
    expect(taper).toBeCloseTo(expected, 15)
  })

  it('daralan ve genişleyen aynı çift aynı direnci verir', () => {
    const a = taperSpokeResistance({
      length: mm(0.3), widthIn: mm(0.2), widthOut: mm(0.4), thickness: um(35), rho: RHO_CU_20,
    })
    const b = taperSpokeResistance({
      length: mm(0.3), widthIn: mm(0.4), widthOut: mm(0.2), thickness: um(35), rho: RHO_CU_20,
    })
    expect(a).toBeCloseTo(b, 15)
  })

  it('taper kipinde en yüksek yerel akım yoğunluğu en dar kesittedir', () => {
    const r = computeThermalRelief({
      ...base, spokeMode: SPOKE_TAPER, innerWidth: mm(0.2), outerWidth: mm(0.4),
    })
    // J_max = I_s / (t · min(W₁, W₂)) = 0.5 / (35e-6 × 0.2e-3)
    expect(r.results.maxLocalCurrentDensity).toBeCloseTo(0.5 / (um(35) * mm(0.2)), 0)
  })

  it('termal taper de eşit genişlikte dikdörtgen limite düşer', () => {
    const rect = spokeThermalResistance({
      length: mm(0.3), widthIn: mm(0.2), thickness: um(35), k: K_CU,
    })
    const taper = spokeThermalResistance({
      length: mm(0.3), widthIn: mm(0.2), widthOut: mm(0.2), thickness: um(35), k: K_CU,
    })
    expect(taper).toBeCloseTo(rect, 12)
    // Tek spoke termal direnci dizinin dört katıdır
    expect(rect).toBeCloseTo(REF.rth385 * 4, 6)
  })
})

describe('birbirinden farklı spoke’lar', () => {
  const custom = {
    ...base,
    spokeMode: SPOKE_CUSTOM,
    customSpokes: [
      { innerWidth: mm(0.2) },
      { innerWidth: mm(0.3) },
      { innerWidth: mm(0.15), length: mm(0.4) },
      { innerWidth: mm(0.25), thickness: um(70) },
    ],
  }
  const r = computeThermalRelief(custom)

  it('akım toplamı toplam akıma eşittir', () => {
    const sum = r.spokes.reduce((acc, sp) => acc + sp.current, 0)
    expect(sum).toBeCloseTo(2, 12)
  })

  it('paralel yapıda bütün spoke gerilim düşümleri aynıdır', () => {
    const v0 = r.spokes[0].voltageDrop
    for (const sp of r.spokes) expect(sp.voltageDrop).toBeCloseTo(v0, 15)
    expect(v0).toBeCloseTo(r.results.voltageDrop, 15)
  })

  it('ΣP_i ile I²·R_eq aynı sonucu verir', () => {
    expect(r.results.powerTotal).toBeCloseTo(r.results.powerFromEquivalent, 15)
  })

  it('geniş spoke daha çok akım taşır', () => {
    expect(r.spokes[1].current).toBeGreaterThan(r.spokes[0].current)
    expect(r.spokes[2].current).toBeLessThan(r.spokes[0].current)
  })

  it('dengesiz paylaşım uyarı üretir', () => {
    expect(r.warnings.map((w) => w.code)).toContain(TR_WARN_UNBALANCED_SHARING)
  })

  it('eşit spokelarda dengesizlik uyarısı verilmez', () => {
    const even = computeThermalRelief(base)
    expect(even.warnings.map((w) => w.code)).not.toContain(TR_WARN_UNBALANCED_SHARING)
  })

  it('spoke listesi boşsa açık hata döner', () => {
    const r0 = computeThermalRelief({ ...base, spokeMode: SPOKE_CUSTOM, customSpokes: [] })
    expect(r0.error).toBe(TR_ERR_NO_SPOKES)
    expectErrorShape(r0, 'no-spokes')
  })

  it('geçersiz spoke satırı sırasıyla bildirilir', () => {
    const bad = computeThermalRelief({
      ...base,
      spokeMode: SPOKE_CUSTOM,
      customSpokes: [{ innerWidth: mm(0.2) }, { innerWidth: -1 }],
    })
    expect(bad.error).toBe(TR_ERR_NON_POSITIVE)
    expect(bad.index).toBe(1)
    expectErrorShape(bad, 'custom-spoke')
  })
})

describe('thermal gap geometrisi', () => {
  it('pad çapı ve gap verilince plane açıklığı türetilir', () => {
    // D_clear = 1.0 + 2×0.25 = 1.5 mm
    const r = computeThermalRelief({
      ...base, padDiameter: mm(1), thermalGap: mm(0.25),
    })
    expect(r.results.clearanceDiameter).toBeCloseTo(mm(1.5), 15)
  })

  it('plane açıklığı verilince gap geriye çözülür', () => {
    const r = computeThermalRelief({
      ...base, padDiameter: mm(1), clearanceDiameter: mm(1.5),
    })
    expect(r.results.thermalGap).toBeCloseTo(mm(0.25), 15)
  })

  it('plane açıklığı pad çapından küçükse açık geometri hatası döner', () => {
    const r = computeThermalRelief({
      ...base, padDiameter: mm(1), clearanceDiameter: mm(0.8),
    })
    expect(r.error).toBe(TR_ERR_GEOMETRY)
    expect(r.variant).toBe(TR_VARIANT_CLEARANCE_UNDER_PAD)
    expectErrorShape(r, 'clearance')
  })

  it('spoke uzunluğu girilmemişse gap kullanılır ve varsayım bildirilir', () => {
    const r = computeThermalRelief({
      ...base, spokeLength: null, padDiameter: mm(1), thermalGap: mm(0.3),
    })
    expect(r.results.spokeLength).toBeCloseTo(mm(0.3), 15)
    expect(r.assumptions).toContain(ASSUMPTION_SPOKE_LENGTH_FROM_GAP)
    // Uzunluk gapten geldiğinde referans direnç yeniden çıkar
    expect(r.results.parallelResistance).toBeCloseTo(REF.parallelR, 12)
  })

  it('ne uzunluk ne gap varsa hesap yapılmaz', () => {
    const r = computeThermalRelief({ ...base, spokeLength: null })
    expect(r.error).toBe(TR_ERR_REQUIRED)
    expect(r.field).toBe('spokeLength')
  })
})

describe('geometrik ön kontroller', () => {
  it('örtüşme sınırı D_pad·sin(π/N) ile hesaplanır', () => {
    // N = 4 → sin(45°) = 0.7071 → 1.0 mm × 0.7071
    expect(overlapWidthLimit(mm(1), 4)).toBeCloseTo(mm(1) * Math.SQRT1_2, 15)
    expect(overlapWidthLimit(mm(1), 2)).toBeCloseTo(mm(1), 15)
    expect(overlapWidthLimit(mm(1), 0)).toBeNull()
    expect(overlapWidthLimit(0, 4)).toBeNull()
  })

  it('çevre doluluk göstergesi N·W/(π·D)', () => {
    expect(bridgeFraction(mm(1), 4, mm(0.2))).toBeCloseTo((4 * 0.2) / (Math.PI * 1), 12)
    expect(bridgeFraction(0, 4, mm(0.2))).toBeNull()
  })

  it('iç genişlik örtüşme sınırına ulaşınca uyarı ve danger üretir', () => {
    const r = computeThermalRelief({
      ...base, padDiameter: mm(1), innerWidth: mm(0.8),
    })
    expect(r.warnings.map((w) => w.code)).toContain(TR_WARN_SPOKE_OVERLAP)
    expect(r.checks.find((c) => c.id === CHECK_SPOKE_OVERLAP).status).toBe(STATUS_DANGER)
  })

  it('pad çapı yoksa örtüşme kontrolü değerlendirilmez', () => {
    const r = computeThermalRelief(base)
    expect(r.results.overlapLimit).toBeNull()
    expect(r.checks.find((c) => c.id === CHECK_SPOKE_OVERLAP).status).toBe(STATUS_UNKNOWN)
  })

  it('tek spoke uyarı üretir ama hesap yapılır', () => {
    const r = computeThermalRelief({ ...base, spokeCount: 1 })
    expect(r.valid).toBe(true)
    expect(r.warnings.map((w) => w.code)).toContain(TR_WARN_SINGLE_SPOKE)
    expect(r.results.parallelResistance).toBeCloseTo(REF.singleR, 12)
  })
})

describe('kullanıcı ve üretici limitleri', () => {
  it('kullanıcı limiti yoksa o konuda ok denmez', () => {
    const r = computeThermalRelief(base)
    for (const id of [
      CHECK_VOLTAGE_DROP, CHECK_POWER_LOSS, CHECK_CURRENT_DENSITY, CHECK_THERMAL_RESISTANCE,
    ]) {
      expect(r.checks.find((c) => c.id === id).status).toBe(STATUS_UNKNOWN)
    }
  })

  it('profil yoksa üretici kontrolleri unknown döner', () => {
    const r = computeThermalRelief(base)
    expect(r.checks.find((c) => c.id === CHECK_SPOKE_WIDTH).status).toBe(STATUS_UNKNOWN)
    expect(r.checks.find((c) => c.id === CHECK_THERMAL_GAP).status).toBe(STATUS_UNKNOWN)
    expect(r.assumptions).toContain(ASSUMPTION_NO_FAB_PROFILE)
  })

  it('üretici spoke genişliği sınırı değerlendirilir', () => {
    const r = computeThermalRelief({
      ...base, hasProfile: true, limits: { minThermalSpokeWidth: mm(0.15) },
    })
    expect(r.checks.find((c) => c.id === CHECK_SPOKE_WIDTH).status).toBe(STATUS_OK)
  })

  it('spoke genişliği sınırı yoksa genel iz genişliği sınırına düşülür', () => {
    const r = computeThermalRelief({
      ...base, hasProfile: true, limits: { minTraceWidth: mm(0.25) },
    })
    const c = r.checks.find((x) => x.id === CHECK_SPOKE_WIDTH)
    expect(c.required).toBeCloseTo(mm(0.25), 15)
    expect(c.status).toBe(STATUS_DANGER)
  })

  it('kullanıcı gerilim düşümü limiti değerlendirilir', () => {
    const ok = computeThermalRelief({ ...base, maxVoltageDrop: 1e-3 })
    expect(ok.checks.find((c) => c.id === CHECK_VOLTAGE_DROP).status).toBe(STATUS_OK)
    const bad = computeThermalRelief({ ...base, maxVoltageDrop: 1e-4 })
    expect(bad.checks.find((c) => c.id === CHECK_VOLTAGE_DROP).status).toBe(STATUS_DANGER)
  })

  it('termal direnç hedefi tavan kontrolüdür', () => {
    const ok = computeThermalRelief({ ...base, maxThermalResistance: 30 })
    expect(ok.checks.find((c) => c.id === CHECK_THERMAL_RESISTANCE).status).toBe(STATUS_OK)
    const bad = computeThermalRelief({ ...base, maxThermalResistance: 20 })
    expect(bad.checks.find((c) => c.id === CHECK_THERMAL_RESISTANCE).status).toBe(STATUS_DANGER)
  })
})

describe('geçersiz girdiler', () => {
  const bad = [
    ['akım eksik', { ...base, current: null }, TR_ERR_REQUIRED],
    ['akım sıfır', { ...base, current: 0 }, TR_ERR_NON_POSITIVE],
    ['akım NaN', { ...base, current: NaN }, TR_ERR_NOT_FINITE],
    ['kalınlık eksik', { ...base, copperThickness: null }, TR_ERR_REQUIRED],
    ['genişlik eksik', { ...base, innerWidth: null }, TR_ERR_REQUIRED],
    ['spoke sayısı sıfır', { ...base, spokeCount: 0 }, TR_ERR_NOT_INTEGER],
    ['spoke sayısı kesirli', { ...base, spokeCount: 2.5 }, TR_ERR_NOT_INTEGER],
    ['spoke sayısı negatif', { ...base, spokeCount: -2 }, TR_ERR_NOT_INTEGER],
    ['iletkenlik sıfır', { ...base, k: 0 }, TR_ERR_NON_POSITIVE],
    ['spoke kipi tanınmıyor', { ...base, spokeMode: 'radial' }, TR_ERR_SPOKE_MODE],
    ['taper dış genişliği eksik', { ...base, spokeMode: SPOKE_TAPER, outerWidth: null }, TR_ERR_REQUIRED],
  ]

  it.each(bad)('%s reddedilir', (_label, input, code) => {
    const r = computeThermalRelief(input)
    expect(r.error).toBe(code)
    expect(r.valid).toBeUndefined()
    expectErrorShape(r, _label)
  })

  it('spoke kipi listesi hata yükünde bildirilir', () => {
    expect(computeThermalRelief({ ...base, spokeMode: 'x' }).allowed).toEqual(SPOKE_MODES)
  })

  it('sonuçlarda NaN ya da Infinity bulunmaz', () => {
    const r = computeThermalRelief({
      ...base, padDiameter: mm(1), thermalGap: mm(0.3), deltaT: 20,
    })
    for (const v of Object.values(r.results)) {
      if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true)
    }
  })
})

describe('buildThermalReliefSweep', () => {
  it('spoke genişledikçe direnç ve gerilim düşümü azalır', () => {
    const pts = buildThermalReliefSweep(base, 'innerWidth', mm(0.1), mm(0.6), 21)
    expect(pts.length).toBe(21)
    for (let i = 1; i < pts.length; i += 1) {
      expect(pts[i].resistance).toBeLessThan(pts[i - 1].resistance)
      expect(pts[i].voltageDrop).toBeLessThan(pts[i - 1].voltageDrop)
      expect(pts[i].thermalResistance).toBeLessThan(pts[i - 1].thermalResistance)
    }
  })

  it('spoke sayısı tam sayı üretir ve tekrar eden nokta koymaz', () => {
    const pts = buildThermalReliefSweep(base, 'spokeCount', 1, 8, 41)
    expect(pts.every((p) => Number.isInteger(p.x))).toBe(true)
    const xs = pts.map((p) => p.x)
    expect(new Set(xs).size).toBe(xs.length)
    expect(xs[0]).toBe(1)
    expect(xs[xs.length - 1]).toBe(8)
  })

  it('spoke uzadıkça direnç artar', () => {
    const pts = buildThermalReliefSweep(base, 'spokeLength', mm(0.1), mm(1), 21)
    for (let i = 1; i < pts.length; i += 1) {
      expect(pts[i].resistance).toBeGreaterThan(pts[i - 1].resistance)
    }
  })

  it('geçersiz sweep parametreleri boş dizi döner', () => {
    expect(buildThermalReliefSweep(base, 'innerWidth', NaN, 1, 10)).toEqual([])
    expect(buildThermalReliefSweep(base, 'innerWidth', 0, 1, 1)).toEqual([])
  })
})
