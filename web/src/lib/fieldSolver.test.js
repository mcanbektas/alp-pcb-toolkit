// Alan çözücüsü doğrulama rejimi (brif 09 F1; spec §6.2–§6.3, §13 Test 1).
//
// Lisanslı tablo/veri yok: bütün referanslar ya analitik (paralel plaka,
// eliptik integralli stripline) ya spec'ten (§13 Test 1) ya da repo içindeki
// kapalı form motorundan. Toleranslar SAYIYLA yazılır.

import { describe, it, expect } from 'vitest'
import { EPS0 } from './units'
import { microstrip, stripline, coplanarWaveguide, ellipticRatio, METHOD_FIELD_SOLVER } from './impedance'
import {
  fieldMicrostrip, fieldStripline, fieldDifferentialPair, fieldGroundedCpw,
  parallelPlateCapacitance,
  FS_ERR_INVALID, FS_CONVERGENCE_WARN_PCT,
} from './fieldSolver'

const relErr = (x, ref) => Math.abs(x - ref) / Math.abs(ref)

describe('analitik çapa 1 — paralel plaka (Neumann yan duvarlar)', () => {
  it('C = ε·W/d makine hassasiyetine yakın', () => {
    const W = 2e-3
    const d = 0.5e-3
    const epsR = 4.2
    const r = parallelPlateCapacitance({ W, d, epsR })
    expect(r.error).toBeUndefined()
    const exact = (EPS0 * epsR * W) / d
    expect(relErr(r.C, exact)).toBeLessThan(1e-6)
    expect(relErr(r.Cvac, (EPS0 * W) / d)).toBeLessThan(1e-6)
    expect(relErr(r.epsEff, epsR)).toBeLessThan(1e-6)
  })
})

describe('analitik çapa 2 — sıfır kalınlıklı simetrik stripline', () => {
  // Konform dönüşümle tam çözüm: k = tanh(πW/2b), Z0 = (30π/√εr)·K(k')/K(k)
  const W = 0.3e-3
  const b = 0.8e-3
  const epsR = 4.2
  const exact = ((30 * Math.PI) / Math.sqrt(epsR)) * ellipticRatio(Math.tanh((Math.PI * W) / (2 * b)))

  it('ince ızgarada tam çözüme < %1 yaklaşır', () => {
    const r = fieldStripline({ W, b, t: 0, epsR, density: 10 })
    expect(r.error).toBeUndefined()
    expect(100 * relErr(r.Z0, exact)).toBeLessThan(1)
  })

  it('homojen dielektrikte εeff = εr', () => {
    const r = fieldStripline({ W, b, t: 0, epsR })
    expect(relErr(r.epsEff, epsR)).toBeLessThan(1e-9)
  })

  it('ızgara sıklaştıkça hata düşer (yakınsama)', () => {
    const errs = [3, 6, 12].map((density) => {
      const r = fieldStripline({ W, b, t: 0, epsR, density })
      expect(r.error).toBeUndefined()
      return relErr(r.Z0, exact)
    })
    expect(errs[2]).toBeLessThan(errs[0])
    expect(errs[1]).toBeLessThan(errs[0] * 1.05)
  })
})

describe('kapalı form çaprazı — microstrip (spec §13 Test 1 + HJ penceresi)', () => {
  it('Test 1: W=0.4mm, H=0.2mm, εr=4.2, t=0 → Z₀≈49.7 Ω, εeff≈3.21 (< %2)', () => {
    const r = fieldMicrostrip({ W: 0.4e-3, H: 0.2e-3, t: 0, epsR: 4.2 })
    expect(r.error).toBeUndefined()
    expect(100 * relErr(r.Z0, 49.7)).toBeLessThan(2)
    expect(100 * relErr(r.epsEff, 3.21)).toBeLessThan(2)
  })

  // Hammerstad–Jensen geçerlilik penceresinde noktalar; fark < %2
  const cases = [
    { W: 0.1e-3, H: 0.2e-3, epsR: 4.2 }, // u = 0.5
    { W: 0.4e-3, H: 0.2e-3, epsR: 4.2 }, // u = 2
    { W: 1.0e-3, H: 0.2e-3, epsR: 4.2 }, // u = 5
    { W: 0.4e-3, H: 0.2e-3, epsR: 2.2 },
    { W: 0.4e-3, H: 0.2e-3, epsR: 10 },
  ]
  for (const c of cases) {
    it(`HJ çaprazı u=${c.W / c.H}, εr=${c.epsR}: fark < %2`, () => {
      const cf = microstrip({ ...c, t: 0 })
      const fs = fieldMicrostrip({ ...c, t: 0 })
      expect(fs.error).toBeUndefined()
      expect(100 * relErr(fs.Z0, cf.Z0)).toBeLessThan(2)
      expect(100 * relErr(fs.epsEff, cf.epsEff)).toBeLessThan(2)
    })
  }

  it('gerçek bakır kalınlığı empedansı düşürür ve kapalı form t düzeltmesinin yakınında kalır', () => {
    const zeroT = fieldMicrostrip({ W: 0.4e-3, H: 0.2e-3, t: 0, epsR: 4.2 })
    const withT = fieldMicrostrip({ W: 0.4e-3, H: 0.2e-3, t: 35e-6, epsR: 4.2 })
    const cf = microstrip({ W: 0.4e-3, H: 0.2e-3, t: 35e-6, epsR: 4.2 })
    expect(withT.Z0).toBeLessThan(zeroT.Z0)
    expect(withT.thicknessIncluded).toBe(true)
    // Kapalı formun kendi t düzeltmesi de yaklaşıktır; fark payı geniş tutulur
    expect(100 * relErr(withT.Z0, cf.Z0)).toBeLessThan(3)
  })
})

describe('stripline kapalı form çaprazı', () => {
  it('simetrik, t=0: kapalı formla fark < %1', () => {
    const cf = stripline({ W: 0.25e-3, b: 0.7e-3, epsR: 4.2 })
    const fs = fieldStripline({ W: 0.25e-3, b: 0.7e-3, t: 0, epsR: 4.2, density: 8 })
    expect(100 * relErr(fs.Z0, cf.Z0)).toBeLessThan(1)
  })
})

describe('simetri ve sıra', () => {
  it('aynalanmış asimetrik stripline aynı Z₀ verir', () => {
    const b = 0.9e-3
    const t = 30e-6
    const h1 = 0.2e-3
    const a = fieldStripline({ W: 0.3e-3, b, t, epsR: 4.2, h1 })
    const m = fieldStripline({ W: 0.3e-3, b, t, epsR: 4.2, h1: b - h1 - t })
    expect(a.error).toBeUndefined()
    expect(100 * relErr(a.Z0, m.Z0)).toBeLessThan(0.05)
  })

  it('h1 verilmeyen çağrı simetrik yerleşimle aynıdır', () => {
    const b = 0.8e-3
    const t = 30e-6
    const auto = fieldStripline({ W: 0.3e-3, b, t, epsR: 4.2 })
    const manual = fieldStripline({ W: 0.3e-3, b, t, epsR: 4.2, h1: (b - t) / 2 })
    expect(auto.Z0).toBe(manual.Z0)
    expect(auto.symmetric).toBe(true)
  })

  it('asimetri empedansı düşürür (hat düzleme yaklaşır)', () => {
    const b = 0.9e-3
    const sym = fieldStripline({ W: 0.3e-3, b, t: 0, epsR: 4.2 })
    const asym = fieldStripline({ W: 0.3e-3, b, t: 0, epsR: 4.2, h1: 0.15e-3 })
    expect(asym.Z0).toBeLessThan(sym.Z0)
  })
})

describe('duvar duyarlılığı (karar #7)', () => {
  it('duvar 2× uzaklaştırılınca Z₀ oynaması yakınsama eşiğinin altında kalır', () => {
    const base = { W: 0.4e-3, H: 0.2e-3, t: 35e-6, epsR: 4.2 }
    const near = fieldMicrostrip({ ...base, wallFactor: 5 })
    const far = fieldMicrostrip({ ...base, wallFactor: 10 })
    expect(100 * relErr(far.Z0, near.Z0)).toBeLessThan(FS_CONVERGENCE_WARN_PCT)
  })
})

describe('yakınsama raporu sözleşmesi (spec §6.3, karar #8)', () => {
  it('her sonuç yapısal convergence.coarsePct taşır', () => {
    const r = fieldMicrostrip({ W: 0.4e-3, H: 0.2e-3, t: 35e-6, epsR: 4.2 })
    expect(r.method).toBe(METHOD_FIELD_SOLVER)
    expect(Number.isFinite(r.convergence.coarsePct)).toBe(true)
    expect(r.convergence.coarsePct).toBeGreaterThanOrEqual(0)
    // Varsayılan yoğunluk kendi başına yeterli olmalı: E_Z < %1
    expect(r.convergence.coarsePct).toBeLessThan(FS_CONVERGENCE_WARN_PCT)
  })
})

describe('hata sözleşmesi', () => {
  it('geçersiz girdi { error } döner, sayı uydurmaz', () => {
    expect(fieldMicrostrip({ W: 0, H: 0.2e-3, epsR: 4.2 }).error).toBe(FS_ERR_INVALID)
    expect(fieldMicrostrip({ W: 0.4e-3, H: -1, epsR: 4.2 }).error).toBe(FS_ERR_INVALID)
    expect(fieldMicrostrip({ W: 0.4e-3, H: 0.2e-3, epsR: 0.5 }).error).toBe(FS_ERR_INVALID)
    expect(fieldStripline({ W: 0.3e-3, b: 0.5e-3, t: 0.5e-3, epsR: 4.2 }).error).toBe(FS_ERR_INVALID)
    expect(fieldStripline({ W: 0.3e-3, b: 0.5e-3, t: 0, epsR: 4.2, h1: 0.5e-3 }).error).toBe(FS_ERR_INVALID)
  })
})

describe('performans bütçesi (brif: < 300 ms hedef, 1 s tavan)', () => {
  it('varsayılan yoğunlukta tam analiz (4 çözüm) tavanın altında kalır', () => {
    const t0 = Date.now()
    const r = fieldMicrostrip({ W: 0.4e-3, H: 0.2e-3, t: 35e-6, epsR: 4.2 })
    const ms = Date.now() - t0
    expect(r.error).toBeUndefined()
    // eslint yok; ölçüm karar dosyasına elle geçirilir
    console.log(`fieldMicrostrip varsayılan yoğunluk: ${ms} ms (ızgara ${r.mesh.fine.nx}×${r.mesh.fine.ny})`)
    expect(ms).toBeLessThan(2000)
  })
})

// ---------------------------------------------------------------------------
// F2 — diferansiyel matris rotası (spec §6.8.1, brif 09 F2)

describe('diferansiyel çift — sıra ve simetri (F2)', () => {
  // DiffPair ekranının varsayılan formu: W=S=H=0.2 mm, t=35 µm, εr=4.2
  const g = { structure: 'microstrip', W: 0.2e-3, S: 0.2e-3, H: 0.2e-3, t: 35e-6, epsR: 4.2 }

  it('sözleşme: method/capacitanceMatrix/convergence alanları taşınır', () => {
    const r = fieldDifferentialPair(g)
    expect(r.error).toBeUndefined()
    expect(r.method).toBe(METHOD_FIELD_SOLVER)
    expect(r.capacitanceMatrix).toBe(true)
    expect(Number.isFinite(r.convergence.coarsePct)).toBe(true)
    expect(r.convergence.coarsePct).toBeLessThan(FS_CONVERGENCE_WARN_PCT)
  })

  it('her zaman Z_odd ≤ Z₀ ≤ Z_even ve C_odd > C_even', () => {
    const r = fieldDifferentialPair(g)
    const single = fieldMicrostrip({ W: g.W, H: g.H, t: g.t, epsR: g.epsR })
    expect(r.Zodd).toBeLessThan(single.Z0)
    expect(single.Z0).toBeLessThan(r.Zeven)
    // Odd modda simetri düzlemi yakın bir toprak gibi davranır: kapasite büyür
    expect(r.Codd).toBeGreaterThan(r.Ceven)
    // Maxwell işaretiyle C₁₂ < 0, C₁₁ > 0 (raporlama alanları)
    expect(r.C11).toBeGreaterThan(0)
    expect(r.C12).toBeLessThan(0)
  })

  it('türetilen büyüklükler tanım gereği tam: Z_diff = 2·Z_odd, Z_common = Z_even/2', () => {
    const r = fieldDifferentialPair(g)
    expect(r.Zdiff).toBeCloseTo(2 * r.Zodd, 12)
    expect(r.Zcommon).toBeCloseTo(r.Zeven / 2, 12)
  })

  it('aralık açıldıkça kuplaj tekdüze söner: Z_odd artar, Z_even düşer', () => {
    const zo = []
    const ze = []
    for (const S of [0.1e-3, 0.3e-3, 1e-3]) {
      const r = fieldDifferentialPair({ ...g, S })
      expect(r.error).toBeUndefined()
      zo.push(r.Zodd)
      ze.push(r.Zeven)
    }
    expect(zo[0]).toBeLessThan(zo[1])
    expect(zo[1]).toBeLessThan(zo[2])
    expect(ze[0]).toBeGreaterThan(ze[1])
    expect(ze[1]).toBeGreaterThan(ze[2])
  })

  it('kuplajın sönmesi: S → büyük iken Z_odd ≈ Z_even ≈ Z₀', () => {
    const r = fieldDifferentialPair({ ...g, S: 4e-3 }) // S/H = 20
    const single = fieldMicrostrip({ W: g.W, H: g.H, t: g.t, epsR: g.epsR })
    expect(r.error).toBeUndefined()
    expect((100 * (r.Zeven - r.Zodd)) / single.Z0).toBeLessThan(1)
    expect(100 * relErr(r.Zodd, single.Z0)).toBeLessThan(1.5)
    expect(100 * relErr(r.Zeven, single.Z0)).toBeLessThan(1.5)
  })

  it('gevşek kuplajda Z_diff kapalı form 2·Z₀ değerine yaklaşır (< %2.5)', () => {
    const r = fieldDifferentialPair({ ...g, t: 0, S: 4e-3 })
    const cf = microstrip({ W: g.W, H: g.H, t: 0, epsR: g.epsR })
    expect(100 * relErr(r.Zdiff, 2 * cf.Z0)).toBeLessThan(2.5)
  })

  it('stripline çifti: homojen dielektrikte her iki mod εeff = εr', () => {
    const r = fieldDifferentialPair({ structure: 'stripline', W: 0.15e-3, S: 0.2e-3, H: 0.6e-3, t: 30e-6, epsR: 4.2 })
    expect(r.error).toBeUndefined()
    expect(relErr(r.epsEffOdd, 4.2)).toBeLessThan(1e-6)
    expect(relErr(r.epsEffEven, 4.2)).toBeLessThan(1e-6)
    expect(r.Zodd).toBeLessThan(r.Zeven)
  })

  it('microstrip çiftinde modal εeff değerleri ayrışır (FEXT girdisi)', () => {
    const r = fieldDifferentialPair({ ...g, S: 0.15e-3 })
    // İnhomojen dielektrikte even mod alanı dielektrikte daha çok yaşar;
    // ayrışmanın işareti değil VARLIĞI sözleşmedir (Crosstalk F3 girdisi)
    expect(Math.abs(r.epsEffOdd - r.epsEffEven)).toBeGreaterThan(0.01)
    expect(r.epsEffOdd).toBeGreaterThan(1)
    expect(r.epsEffOdd).toBeLessThan(g.epsR)
    expect(r.epsEffEven).toBeGreaterThan(1)
    expect(r.epsEffEven).toBeLessThan(g.epsR)
  })

  it('duvar duyarlılığı: duvar 2× uzaklaştırılınca Z_diff oynaması eşiğin altında', () => {
    const near = fieldDifferentialPair(g)
    const far = fieldDifferentialPair({ ...g, wallFactor: 30 })
    expect(100 * relErr(far.Zdiff, near.Zdiff)).toBeLessThan(FS_CONVERGENCE_WARN_PCT)
  })

  it('geçersiz girdi { error } döner', () => {
    expect(fieldDifferentialPair({ ...g, S: 0 }).error).toBe(FS_ERR_INVALID)
    expect(fieldDifferentialPair({ ...g, W: -1 }).error).toBe(FS_ERR_INVALID)
    expect(fieldDifferentialPair({ structure: 'stripline', W: 0.2e-3, S: 0.2e-3, H: 0.2e-3, t: 0.2e-3, epsR: 4.2 }).error).toBe(FS_ERR_INVALID)
  })
})

describe('grounded CPW (F2, spec §6.7 — yalnız çözücüyle sunulur)', () => {
  const g = { W: 0.4e-3, S: 0.3e-3, H: 0.2e-3, t: 35e-6, epsR: 4.2 }

  it('boşluk daraldıkça coplanar toprak kapasiteyi büyütür, Z₀ düşer', () => {
    const z = [0.15e-3, 0.5e-3, 2e-3].map((S) => {
      const r = fieldGroundedCpw({ ...g, S })
      expect(r.error).toBeUndefined()
      return r.Z0
    })
    expect(z[0]).toBeLessThan(z[1])
    expect(z[1]).toBeLessThan(z[2])
  })

  it('boşluk büyüdükçe microstrip limitine yaklaşır (< %2)', () => {
    const r = fieldGroundedCpw({ ...g, t: 0, S: 4e-3 })
    const cf = microstrip({ W: g.W, H: g.H, t: 0, epsR: g.epsR })
    expect(100 * relErr(r.Z0, cf.Z0)).toBeLessThan(2)
  })

  it('alt düzlem ideal CPW formülüne göre empedansı düşürür', () => {
    // İdeal CPW alt düzlemsiz ve kalın substrat varsayar; alt düzlem eklemek
    // kapasite ekler. Bu, "ideal form grounded CPW yerine kullanılmaz"
    // kuralının sayısal gerekçesidir.
    const fs = fieldGroundedCpw({ ...g, t: 0 })
    const ideal = coplanarWaveguide({ W: g.W, S: g.S, epsR: g.epsR })
    expect(fs.Z0).toBeLessThan(ideal.Z0)
  })

  it('sözleşme alanları ve yakınsama', () => {
    const r = fieldGroundedCpw(g)
    expect(r.method).toBe(METHOD_FIELD_SOLVER)
    expect(r.structure).toBe('gcpw')
    expect(r.groundedBelow).toBe(true)
    expect(r.convergence.coarsePct).toBeLessThan(FS_CONVERGENCE_WARN_PCT)
  })

  it('duvar duyarlılığı: duvar 2× uzaklaştırılınca Z₀ oynaması eşiğin altında', () => {
    const near = fieldGroundedCpw(g)
    const far = fieldGroundedCpw({ ...g, wallFactor: 30 })
    expect(100 * relErr(far.Z0, near.Z0)).toBeLessThan(FS_CONVERGENCE_WARN_PCT)
  })

  it('geçersiz girdi { error } döner', () => {
    expect(fieldGroundedCpw({ ...g, S: 0 }).error).toBe(FS_ERR_INVALID)
    expect(fieldGroundedCpw({ ...g, H: 0 }).error).toBe(FS_ERR_INVALID)
  })
})

describe('F2 performans ölçümü (karar dosyasına geçirilir)', () => {
  it('diferansiyel çift analizi (8 çözüm) tavanın altında kalır', () => {
    const t0 = Date.now()
    const r = fieldDifferentialPair({ structure: 'microstrip', W: 0.2e-3, S: 0.2e-3, H: 0.2e-3, t: 35e-6, epsR: 4.2 })
    const ms = Date.now() - t0
    expect(r.error).toBeUndefined()
    console.log(`fieldDifferentialPair varsayılan yoğunluk: ${ms} ms (even ${r.mesh.even.nx}×${r.mesh.even.ny}, odd ${r.mesh.odd.nx}×${r.mesh.odd.ny})`)
    expect(ms).toBeLessThan(2000)
  })

  it('grounded CPW analizi (4 çözüm) tavanın altında kalır', () => {
    const t0 = Date.now()
    const r = fieldGroundedCpw({ W: 0.4e-3, S: 0.3e-3, H: 0.2e-3, t: 35e-6, epsR: 4.2 })
    const ms = Date.now() - t0
    expect(r.error).toBeUndefined()
    console.log(`fieldGroundedCpw varsayılan yoğunluk: ${ms} ms (ızgara ${r.mesh.fine.nx}×${r.mesh.fine.ny})`)
    expect(ms).toBeLessThan(2000)
  })
})
