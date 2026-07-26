import { describe, it, expect } from 'vitest'
import {
  targetImpedance, minimumCapacitance,
  capacitorImpedance, selfResonantFrequency,
  parallelNetworkImpedance, identicalBank,
  planeCapacitance, pdnImpedance, loopInductance,
  PDN_ERR_INVALID, PDN_ERR_SINGULAR,
} from './pdn'
import { EPS0 } from './units'

const uF = (x) => x * 1e-6
const nH = (x) => x * 1e-9
const mm = (x) => x * 1e-3

describe('PDN hedef empedansı (spec §8.1)', () => {
  // spec §13 Test 3 — referans doğrulama testi
  it('referans: 1.0 V rayda %3 tolerans ve 5 A adım → 6 mΩ', () => {
    const r = targetImpedance({ Vrail: 1.0, tolerancePct: 3, deltaI: 5 })
    expect(r.deltaV).toBeCloseTo(0.03, 12)
    expect(r.Ztarget).toBeCloseTo(6e-3, 12)
    expect(r.fromTolerance).toBe(true)
  })

  it('ΔV doğrudan verilirse tolerans kullanılmaz', () => {
    const r = targetImpedance({ deltaV: 0.05, deltaI: 10 })
    expect(r.Ztarget).toBeCloseTo(5e-3, 15)
    expect(r.fromTolerance).toBe(false)
  })

  it('akım adımı yoksa hesap yapılmaz', () => {
    expect(targetImpedance({ Vrail: 1, tolerancePct: 3, deltaI: 0 }).error).toBe(PDN_ERR_INVALID)
  })

  it('ne ΔV ne de ray+tolerans verilmezse hata döner', () => {
    expect(targetImpedance({ deltaI: 5 }).error).toBe(PDN_ERR_INVALID)
  })

  it('sabit yatay hedef olduğunu bildirir', () => {
    expect(targetImpedance({ Vrail: 1.8, tolerancePct: 5, deltaI: 3 }).flatTarget).toBe(true)
  })

  it('akım adımı büyüdükçe hedef empedans düşer', () => {
    const a = targetImpedance({ Vrail: 1, tolerancePct: 3, deltaI: 5 })
    const b = targetImpedance({ Vrail: 1, tolerancePct: 3, deltaI: 10 })
    expect(b.Ztarget).toBeLessThan(a.Ztarget)
  })
})

describe('minimum ideal kapasite (spec §8.2)', () => {
  it('C = ΔI·Δt / ΔV', () => {
    const r = minimumCapacitance({ deltaI: 2, deltaT: 1e-6, deltaV: 0.05 })
    expect(r.charge).toBeCloseTo(2e-6, 15)
    expect(r.C).toBeCloseTo(4e-5, 15)
  })

  it('ESR ve ESL içermediğini bildirir', () => {
    expect(minimumCapacitance({ deltaI: 1, deltaT: 1e-6, deltaV: 0.1 }).includesEsrEsl).toBe(false)
  })

  it('geçersiz girdi reddedilir', () => {
    expect(minimumCapacitance({ deltaI: 0, deltaT: 1e-6, deltaV: 0.1 }).error).toBe(PDN_ERR_INVALID)
  })
})

describe('kapasitör empedansı (spec §8.2.1)', () => {
  const cap = { C: uF(0.1), ESR: 0.02, ESL: nH(1) }

  it('SRF = 1 / (2π√(ESL·C))', () => {
    const expected = 1 / (2 * Math.PI * Math.sqrt(cap.ESL * cap.C))
    expect(selfResonantFrequency({ C: cap.C, ESL: cap.ESL }).srf).toBeCloseTo(expected, 6)
  })

  it('SRF\'de |Z| ≈ ESR', () => {
    const srf = selfResonantFrequency({ C: cap.C, ESL: cap.ESL }).srf
    const z = capacitorImpedance({ ...cap, f: srf })
    expect(z.mag).toBeCloseTo(cap.ESR, 9)
    expect(Math.abs(z.im)).toBeLessThan(1e-9)
  })

  it('SRF altında kapasitif, üstünde endüktiftir', () => {
    const srf = selfResonantFrequency({ C: cap.C, ESL: cap.ESL }).srf
    expect(capacitorImpedance({ ...cap, f: srf / 10 }).inductive).toBe(false)
    expect(capacitorImpedance({ ...cap, f: srf * 10 }).inductive).toBe(true)
    expect(capacitorImpedance({ ...cap, f: srf * 10 }).aboveSrf).toBe(true)
  })

  it('|Z| = √(ESR² + (ωESL − 1/(ωC))²)', () => {
    const f = 1e7
    const w = 2 * Math.PI * f
    const X = w * cap.ESL - 1 / (w * cap.C)
    const z = capacitorImpedance({ ...cap, f })
    expect(z.mag).toBeCloseTo(Math.sqrt(cap.ESR ** 2 + X ** 2), 12)
  })

  it('ESL = 0 ise SRF sonsuzdur ve kapasitör hep kapasitiftir', () => {
    const z = capacitorImpedance({ C: uF(1), ESR: 0.01, ESL: 0, f: 1e9 })
    expect(z.srf).toBe(Infinity)
    expect(z.inductive).toBe(false)
  })
})

describe('paralel kapasitör ağı (spec §8.2.2)', () => {
  const cap = { C: uF(0.1), ESR: 0.02, ESL: nH(1) }

  it('N adet aynı kapasitör empedansı N kat düşürür', () => {
    const f = 1e7
    const one = parallelNetworkImpedance([cap], f)
    const four = parallelNetworkImpedance([{ ...cap, count: 4 }], f)
    expect(four.mag).toBeCloseTo(one.mag / 4, 12)
  })

  it('eşdeğerler: C_eq = N·C, ESR_eq = ESR/N, ESL_eq = ESL/N', () => {
    const b = identicalBank({ ...cap, count: 4 })
    expect(b.Ceq).toBeCloseTo(4 * cap.C, 18)
    expect(b.ESReq).toBeCloseTo(cap.ESR / 4, 15)
    expect(b.ESLeq).toBeCloseTo(cap.ESL / 4, 18)
    // Ortak via varsa bu ölçekleme geçerli değildir
    expect(b.idealSharing).toBe(true)
  })

  // Anti-rezonans yalnızca kompleks admitans toplamıyla çıkar; büyüklükleri
  // toplayan bir uygulama bu testi geçemez.
  it('farklı değerli kapasitörler anti-rezonans tepesi üretir', () => {
    const big = { C: uF(10), ESR: 0.005, ESL: nH(2) }
    const small = { C: uF(0.01), ESR: 0.05, ESL: nH(0.5) }

    const srfBig = selfResonantFrequency({ C: big.C, ESL: big.ESL }).srf
    const srfSmall = selfResonantFrequency({ C: small.C, ESL: small.ESL }).srf
    expect(srfBig).toBeLessThan(srfSmall)

    // İki SRF arasında bir yerde tepe olmalı: büyük kapasitör endüktif,
    // küçük kapasitör hâlâ kapasitif → paralel rezonans
    let peak = { f: 0, mag: 0 }
    const steps = 400
    for (let i = 0; i < steps; i++) {
      const f = srfBig * Math.pow(srfSmall / srfBig, i / (steps - 1))
      const z = parallelNetworkImpedance([big, small], f)
      if (z.mag > peak.mag) peak = { f, mag: z.mag }
    }

    const atBig = parallelNetworkImpedance([big, small], srfBig).mag
    const atSmall = parallelNetworkImpedance([big, small], srfSmall).mag
    expect(peak.mag).toBeGreaterThan(atBig)
    expect(peak.mag).toBeGreaterThan(atSmall)
    expect(peak.f).toBeGreaterThan(srfBig)
    expect(peak.f).toBeLessThan(srfSmall)
  })

  // Kayıpsız kapasitör bu modelde dejenere: SRF'de empedans sıfır,
  // anti-rezonans tepesi sonsuz. Tahmin üretmek yerine hata döner.
  it('ESR = 0 olan kapasitör reddedilir; tahmin üretilmez', () => {
    const ideal = { C: uF(1), ESR: 0, ESL: nH(1) }
    expect(parallelNetworkImpedance([ideal], 1e6).error).toBe(PDN_ERR_SINGULAR)
    const srf = selfResonantFrequency({ C: ideal.C, ESL: ideal.ESL }).srf
    expect(parallelNetworkImpedance([ideal], srf).error).toBe(PDN_ERR_SINGULAR)
  })

  it('boş liste reddedilir', () => {
    expect(parallelNetworkImpedance([], 1e6).error).toBe(PDN_ERR_INVALID)
  })
})

describe('düzlem kapasitansı (spec §8.2.3)', () => {
  it('C = ε₀·εr·A/d', () => {
    const area = 0.01 // 100 cm²
    const d = mm(0.1)
    const r = planeCapacitance({ area, d, epsR: 4.2 })
    expect(r.C).toBeCloseTo((EPS0 * 4.2 * area) / d, 18)
  })

  it('kenar saçılmasının dahil olmadığını bildirir', () => {
    expect(planeCapacitance({ area: 0.01, d: mm(0.1), epsR: 4.2 }).fringingIncluded).toBe(false)
  })

  it('dielektrik inceldikçe kapasite artar', () => {
    const thick = planeCapacitance({ area: 0.01, d: mm(0.2), epsR: 4.2 })
    const thin = planeCapacitance({ area: 0.01, d: mm(0.1), epsR: 4.2 })
    expect(thin.C).toBeGreaterThan(thick.C)
  })
})

describe('toplam PDN empedansı (spec §8.2.4)', () => {
  const cap = { C: uF(0.1), ESR: 0.02, ESL: nH(1), count: 10 }

  it('paralel bileşenler empedansı yalnız kapasitörlerden düşük yapar', () => {
    const f = 1e6
    const capsOnly = pdnImpedance({ caps: [cap], f })
    const withVrm = pdnImpedance({ caps: [cap], vrm: { R: 0.01 }, f })
    expect(withVrm.mag).toBeLessThan(capsOnly.mag)
  })

  // Bank SRF'si ≈ 15.9 MHz (C_eq = 1 µF, ESL_eq = 0.1 nH)
  it('ağ kapasitif bölgedeyken düzlem kapasitansı empedansı düşürür', () => {
    const f = 1e6
    const without = pdnImpedance({ caps: [cap], f })
    expect(without.inductive).toBe(false)
    const withPlane = pdnImpedance({ caps: [cap], Cplane: 1e-9, f })
    expect(withPlane.mag).toBeLessThan(without.mag)
  })

  // Spec §8.2.2'nin bahsettiği anti-rezonans: ağ endüktif hale geldikten sonra
  // paralel eklenen kapasite empedansı DÜŞÜRMEZ, tepe üretir. Bu ekranda
  // gösterilmesi gereken davranıştır — "kapasitör ekle, empedans düşer"
  // sezgisinin kırıldığı yer burasıdır.
  it('ağ endüktif bölgedeyken düzlem kapasitansı anti-rezonans tepesi üretir', () => {
    const f = 1e8
    const without = pdnImpedance({ caps: [cap], f })
    expect(without.inductive).toBe(true)

    const withPlane = pdnImpedance({ caps: [cap], Cplane: 1e-9, f })
    expect(withPlane.mag).toBeGreaterThan(without.mag)
    expect(withPlane.losslessPlane).toBe(true)

    // Düzlem kapasitesi tarandığında bir tepe bulunmalı; tepe ne uçta olmalı
    let peak = { C: 0, mag: 0 }
    const steps = 400
    for (let i = 0; i < steps; i++) {
      const C = 1e-10 * Math.pow(1e4, i / (steps - 1))
      const z = pdnImpedance({ caps: [cap], Cplane: C, f })
      if (z.mag > peak.mag) peak = { C, mag: z.mag }
    }
    expect(peak.C).toBeGreaterThan(1e-10)
    expect(peak.C).toBeLessThan(1e-6)
    expect(peak.mag).toBeGreaterThan(without.mag)
  })

  it('bağlantı loop endüktansının dahil olmadığını bildirir', () => {
    expect(pdnImpedance({ caps: [cap], f: 1e6 }).mountingIncluded).toBe(false)
  })

  it('hiçbir bileşen verilmezse hata döner', () => {
    expect(pdnImpedance({ caps: [], f: 1e6 }).error).toBe(PDN_ERR_INVALID)
  })

  it('VRM tek başına da modellenebilir', () => {
    const r = pdnImpedance({ caps: [], vrm: { R: 0.005, L: nH(500) }, f: 1e3 })
    expect(r.mag).toBeGreaterThan(0)
  })
})

describe('bağlantı loop endüktansı (spec §8.2.4)', () => {
  it('dört terim toplanır', () => {
    const r = loopInductance({ eslComponent: nH(0.5), Lmount: nH(0.3), Lvia: nH(1.2), Lspread: nH(0.2) })
    expect(r.total).toBeCloseTo(nH(2.2), 18)
  })

  it('baskın terimin payını bildirir', () => {
    const r = loopInductance({ eslComponent: nH(0.5), Lmount: nH(0.3), Lvia: nH(1.2), Lspread: nH(0.2) })
    expect(r.shares.via).toBeGreaterThan(r.shares.component)
    expect(Object.values(r.shares).reduce((a, x) => a + x, 0)).toBeCloseTo(1, 12)
  })

  it('hepsi sıfırsa hata döner', () => {
    expect(loopInductance({}).error).toBe(PDN_ERR_INVALID)
  })
})
