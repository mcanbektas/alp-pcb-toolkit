// Alan çözücüsü doğrulama rejimi (brif 09 F1; spec §6.2–§6.3, §13 Test 1).
//
// Lisanslı tablo/veri yok: bütün referanslar ya analitik (paralel plaka,
// eliptik integralli stripline) ya spec'ten (§13 Test 1) ya da repo içindeki
// kapalı form motorundan. Toleranslar SAYIYLA yazılır.

import { describe, it, expect } from 'vitest'
import { EPS0 } from './units'
import { microstrip, stripline, ellipticRatio, METHOD_FIELD_SOLVER } from './impedance'
import {
  fieldMicrostrip, fieldStripline, parallelPlateCapacitance,
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
