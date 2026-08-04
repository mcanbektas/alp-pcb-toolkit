import { describe, it, expect } from 'vitest'
import {
  targetImpedance, eslTotal, capacitorBranchImpedance, capacitorGroupImpedance,
  sharedIndividualGroupImpedance, selfResonantFrequency, capacitorGroupSrf,
  vrmImpedance, planeImpedance, pdnImpedanceAt, pdnResonanceSweep,
  minLowFrequencyCapacitance, capacitiveDroop, esrDroop, eslDroop, worstCaseDroopEstimate,
  deratedCapacitance, toleranceCapacitanceBand, pdnToleranceSweep,
  bandsOverTarget, bandUnderTargetPct, pdnResonanceAnalysis,
  PDNR_ERR_INVALID, PDNR_ERR_NO_BRANCHES, PDNR_ERR_DERATING_RANGE, PDNR_ERR_TOLERANCE_RANGE,
} from './pdnResonance'
import { parallel } from './complex'
import { SWEEP_ERR_NONPOSITIVE, SWEEP_ERR_RANGE } from './sweep'
import { PEAKS_ERR_THRESHOLD } from './peaks'

describe('§10.3 hedef empedans', () => {
  it('yüzde ripple V_rail·r/100 üzerinden ΔV verir', () => {
    // Aynı basit referans: 1.0 V, %3, 5 A → 6 mΩ (pdn.js'in kendi §8.1 örneğiyle aynı fizik)
    const r = targetImpedance({ Vrail: 1.0, ripplePct: 3, deltaI: 5 })
    expect(r.Ztarget).toBeCloseTo(0.006, 12)
    expect(r.fromRipplePct).toBe(true)
  })

  it('doğrudan ΔV verilirse ripple hesaplanmaz', () => {
    const r = targetImpedance({ deltaVAllowed: 0.05, deltaI: 10 })
    expect(r.Ztarget).toBeCloseTo(0.005, 12)
    expect(r.fromRipplePct).toBe(false)
  })

  it('deltaI olmadan hata', () => {
    expect(targetImpedance({ Vrail: 1, ripplePct: 3, deltaI: 0 }).error).toBe(PDNR_ERR_INVALID)
  })

  it('ne ΔV ne ripple verilirse hata', () => {
    expect(targetImpedance({ deltaI: 5 }).error).toBe(PDNR_ERR_INVALID)
  })
})

describe('§10.4 kondansatör modeli', () => {
  it('ESL_total üç terimin toplamı (L_via,eq dahil, kararlar §4)', () => {
    expect(eslTotal({ eslComponent: 0.3e-9, Lmount: 0.2e-9, LviaEq: 0.5e-9 })).toBeCloseTo(1e-9, 15)
  })

  it('negatif bileşen NaN', () => {
    expect(Number.isNaN(eslTotal({ eslComponent: -1e-9 }))).toBe(true)
  })

  it('Z_C = ESR + jωESL + 1/(jωC) — elle doğrulanmış nokta', () => {
    // C=1µF, ESR=10mΩ, ESL_total=1nH, f=1MHz
    const z = capacitorBranchImpedance({ f: 1e6, ESR: 0.01, ESLtotal: 1e-9, Ceffective: 1e-6 })
    expect(z.re).toBeCloseTo(0.01, 12)
    expect(z.im).toBeCloseTo(-0.1528717577847158, 9)
  })

  it('C verilmezse (≤0) hata', () => {
    expect(capacitorBranchImpedance({ f: 1e6, Ceffective: 0 }).error).toBe(PDNR_ERR_INVALID)
  })

  it('Z_C,N = Z_C / N', () => {
    const single = capacitorBranchImpedance({ f: 1e5, ESR: 0.02, ESLtotal: 2e-9, Ceffective: 10e-6 })
    const group = capacitorGroupImpedance({
      f: 1e5, ESR: 0.02, eslComponent: 2e-9, Ceffective: 10e-6, count: 4,
    })
    expect(group.re).toBeCloseTo(single.re / 4, 15)
    expect(group.im).toBeCloseTo(single.im / 4, 15)
  })

  it('count ≤ 0 hata', () => {
    expect(capacitorGroupImpedance({ f: 1e5, Ceffective: 1e-6, count: 0 }).error).toBe(PDNR_ERR_INVALID)
  })

  it('daha gerçekçi model: Z_shared + Z_individual/N', () => {
    const r = sharedIndividualGroupImpedance({
      Zshared: { re: 1, im: 2 }, Zindividual: { re: 4, im: 8 }, count: 4,
    })
    expect(r).toEqual({ re: 1 + 1, im: 2 + 2 })
  })
})

describe('§10.5 self resonance', () => {
  it('f_SRF = 1/(2π√(ESL·C)) — elle doğrulanmış nokta', () => {
    expect(selfResonantFrequency({ ESLtotal: 1e-9, C: 1e-6 })).toBeCloseTo(5032921.210448704, 3)
  })

  it('geçersiz girdide NaN (hata kodu değil, skaler döner)', () => {
    expect(Number.isNaN(selfResonantFrequency({ ESLtotal: 0, C: 1e-6 }))).toBe(true)
  })

  it('grup kısayolu doğrudan ESL bileşenlerinden hesaplar', () => {
    const g = { eslComponent: 0.5e-9, Lmount: 0.3e-9, LviaEq: 0.2e-9, Ceffective: 1e-6 }
    expect(capacitorGroupSrf(g)).toBeCloseTo(selfResonantFrequency({ ESLtotal: 1e-9, C: 1e-6 }), 12)
  })
})

describe('§10.6 VRM modeli', () => {
  it('basit seri model Z_VRM = R + jωL', () => {
    const z = vrmImpedance({ f: 1e6, R: 0.01, L: 10e-9 })
    expect(z.re).toBeCloseTo(0.01, 12)
    expect(z.im).toBeCloseTo(2 * Math.PI * 1e6 * 10e-9, 12)
  })

  it('çıkış kondansatörü verilince kol paralel kompleks kurulur', () => {
    const f = 1000
    const z = vrmImpedance({ f, R: 0.01, L: 0, C: 100e-6 })
    const omega = 2 * Math.PI * f
    const expected = parallel([{ re: 0.01, im: 0 }, { re: 0, im: -1 / (omega * 100e-6) }])
    expect(z.re).toBeCloseTo(expected.re, 15)
    expect(z.im).toBeCloseTo(expected.im, 15)
    // elle doğrulanmış nokta (bkz. görev notları)
    expect(z.re).toBeCloseTo(0.009999605231408795, 12)
    expect(z.im).toBeCloseTo(-0.00006282937266758388, 12)
  })

  it('negatif R veya L hata', () => {
    expect(vrmImpedance({ f: 1e6, R: -1 }).error).toBe(PDNR_ERR_INVALID)
  })
})

describe('§10.7 plane modeli', () => {
  it('Z_plane = R + jωL + 1/(jωC) — elle doğrulanmış nokta', () => {
    const z = planeImpedance({ f: 1e6, R: 0.01, L: 2e-9, C: 10e-9 })
    expect(z.re).toBeCloseTo(0.01, 12)
    expect(z.im).toBeCloseTo(-15.902927938575175, 6)
  })

  it('C olmadan hata (lumped model C zorunlu)', () => {
    expect(planeImpedance({ f: 1e6, R: 0.01, L: 1e-9 }).error).toBe(PDNR_ERR_INVALID)
  })
})

describe('§10.8 toplam empedans', () => {
  it('tek VRM kolu doğrudan Z_VRM olur', () => {
    const z = pdnImpedanceAt({ f: 1e5, vrm: { R: 0.05, L: 1e-9 } })
    expect(z.re).toBeCloseTo(0.05, 12)
  })

  it('VRM + kondansatör grubu paralel (Y_total = Σ1/Z_k) — complex.js.parallel ile birebir', () => {
    const f = 1000
    const vrm = { R: 0.01, L: 0 }
    const group = { ESR: 0, eslComponent: 0, Ceffective: 100e-6, count: 1 }
    const z = pdnImpedanceAt({ f, vrm, capGroups: [group] })

    const omega = 2 * Math.PI * f
    const expected = parallel([{ re: 0.01, im: 0 }, { re: 0, im: -1 / (omega * 100e-6) }])
    expect(z.re).toBeCloseTo(expected.re, 15)
    expect(z.im).toBeCloseTo(expected.im, 15)
  })

  it('hiç kol yoksa hata', () => {
    expect(pdnImpedanceAt({ f: 1e5 }).error).toBe(PDNR_ERR_NO_BRANCHES)
  })

  it('plane kolu ağa girer', () => {
    const z = pdnImpedanceAt({ f: 1e5, plane: { C: 1e-6 } })
    expect(Number.isFinite(z.re)).toBe(true)
    expect(Number.isFinite(z.im)).toBe(true)
  })
})

describe('§10.9 rezonans/antirezonans tespiti — peaks.js çağrısı', () => {
  // Bulk (düşük SRF, düşük frekans) + MLCC (yüksek SRF, yüksek frekans)
  // klasik iki-kademeli decoupling antirezonansı: SRF'ler arasında |Z| tepesi.
  const bulk = { ESR: 0.01, eslComponent: 5e-9, Ceffective: 100e-6, count: 1 }
  const mlcc = { ESR: 0.02, eslComponent: 0.5e-9, Ceffective: 100e-9, count: 1 }
  const bulkSrf = selfResonantFrequency({ ESLtotal: 5e-9, C: 100e-6 })
  const mlccSrf = selfResonantFrequency({ ESLtotal: 0.5e-9, C: 100e-9 })

  it('iki SRF arasında en az bir doğrulanmış antirezonans (peak) tepesi bulur', () => {
    const s = pdnResonanceSweep({
      fMin: 1e3, fMax: 1e8, points: 400, capGroups: [bulk, mlcc], threshold: 3,
    })
    expect(s.error).toBeUndefined()
    expect(s.peaks.length).toBeGreaterThanOrEqual(1)
    const worst = s.peaks.reduce((a, b) => (b.magnitude > a.magnitude ? b : a))
    expect(worst.freq).toBeGreaterThan(bulkSrf)
    expect(worst.freq).toBeLessThan(mlccSrf)
    expect(worst.prominence).toBeGreaterThanOrEqual(3)
  })

  it('target oranı magnitude/Ztarget olarak eklenir', () => {
    const s = pdnResonanceSweep({
      fMin: 1e3, fMax: 1e8, points: 400, capGroups: [bulk, mlcc], threshold: 3, Ztarget: 0.05,
    })
    const p = s.peaks[0]
    expect(p.ratioToTarget).toBeCloseTo(p.magnitude / 0.05, 12)
  })

  it('Ztarget verilmezse ratioToTarget null', () => {
    const s = pdnResonanceSweep({ fMin: 1e3, fMax: 1e8, points: 400, capGroups: [bulk, mlcc] })
    expect(s.peaks[0].ratioToTarget).toBeNull()
  })

  it('sweep in ilk/son noktası doğrulanmış listeye asla girmez (uç nokta dışlama)', () => {
    const s = pdnResonanceSweep({ fMin: 1e3, fMax: 1e8, points: 400, capGroups: [bulk, mlcc] })
    const lastIndex = s.freqs.length - 1
    for (const c of [...s.peaks, ...s.valleys]) {
      expect(c.startIndex).not.toBe(0)
      expect(c.endIndex).not.toBe(lastIndex)
    }
  })

  it('eşik yükseltilince zayıf tepeler doğrulanmış listeden düşer (prominence eşiği ileri geçirilir)', () => {
    const low = pdnResonanceSweep({ fMin: 1e3, fMax: 1e8, points: 400, capGroups: [bulk, mlcc], threshold: 0.5 })
    const high = pdnResonanceSweep({ fMin: 1e3, fMax: 1e8, points: 400, capGroups: [bulk, mlcc], threshold: 20 })
    expect(low.peaks.length).toBeGreaterThanOrEqual(high.peaks.length)
    expect(low.threshold).toBe(0.5)
    expect(high.threshold).toBe(20)
  })

  it('aralık dışı eşik peaks.js hatasını birebir yansıtır (motor kendi mantığını yazmaz)', () => {
    const s = pdnResonanceSweep({ fMin: 1e3, fMax: 1e8, points: 400, capGroups: [bulk, mlcc], threshold: 25 })
    expect(s.error).toBe(PEAKS_ERR_THRESHOLD)
  })

  it('geçersiz frekans aralığı sweep.js hatasını birebir yansıtır', () => {
    const s1 = pdnResonanceSweep({ fMin: 0, fMax: 1e8, points: 10, capGroups: [bulk] })
    expect(s1.error).toBe(SWEEP_ERR_NONPOSITIVE)
    const s2 = pdnResonanceSweep({ fMin: 1e8, fMax: 1e3, points: 10, capGroups: [bulk] })
    expect(s2.error).toBe(SWEEP_ERR_RANGE)
  })
})

describe('§10.10 düşük frekans droop tahmini (worst-case, kararlar §5 istisnası)', () => {
  it('C_min ≥ ΔI·Δt/ΔV', () => {
    expect(minLowFrequencyCapacitance({ deltaI: 5, deltaT: 1e-6, deltaV: 0.05 })).toBeCloseTo(1e-4, 12)
  })

  it('ΔV_C aynı bağıntının verilen C için çözümü', () => {
    expect(capacitiveDroop({ deltaI: 5, deltaT: 1e-6, C: 1e-4 })).toBeCloseTo(0.05, 12)
  })

  it('ΔV_ESR = ΔI·ESR_eq', () => {
    expect(esrDroop({ deltaI: 5, ESReq: 0.01 })).toBeCloseTo(0.05, 12)
  })

  it('ΔV_ESL = L_eq·(ΔI/t_rise)', () => {
    expect(eslDroop({ Leq: 1e-9, deltaI: 5, tRise: 100e-9 })).toBeCloseTo(0.05, 12)
  })

  it('üç droop bileşeni cebirsel toplanır ve etiketlenir', () => {
    const r = worstCaseDroopEstimate({
      deltaI: 5, deltaT: 1e-6, tRise: 100e-9, C: 1e-4, ESReq: 0.01, Leq: 1e-9,
    })
    expect(r.total).toBeCloseTo(0.05 + 0.05 + 0.05, 9)
    expect(r.engineeringRule).toBe('worst-case-time-domain-estimate')
  })

  it('geçersiz girdide hata', () => {
    expect(worstCaseDroopEstimate({ deltaI: 0, deltaT: 1e-6, C: 1e-4 }).error).toBe(PDNR_ERR_INVALID)
  })
})

describe('§10.11 tolerans', () => {
  it('C_effective = C_nominal·K_DCbias·K_temp·K_aging', () => {
    const r = deratedCapacitance({ Cnominal: 100e-6, kDcBias: 0.8, kTemperature: 0.9, kAging: 0.95 })
    expect(r.Ceffective).toBeCloseTo(100e-6 * 0.8 * 0.9 * 0.95, 15)
  })

  it('katsayı [0,1] dışındaysa hata', () => {
    expect(deratedCapacitance({ Cnominal: 1e-6, kDcBias: 1.2 }).error).toBe(PDNR_ERR_DERATING_RANGE)
    expect(deratedCapacitance({ Cnominal: 1e-6, kTemperature: -0.1 }).error).toBe(PDNR_ERR_DERATING_RANGE)
  })

  it('katsayı verilmezse varsayılan 1 (derating yok)', () => {
    const r = deratedCapacitance({ Cnominal: 100e-6 })
    expect(r.Ceffective).toBeCloseTo(100e-6, 15)
  })

  it('tolerans bandı Cmin/Cnominal/Cmax verir', () => {
    const r = toleranceCapacitanceBand({ Cnominal: 100e-6, tolerancePct: 20 })
    expect(r.Cmin).toBeCloseTo(80e-6, 15)
    expect(r.Cmax).toBeCloseTo(120e-6, 15)
  })

  it('%100 üstü tolerans Cmin negatif üretir — SIFIRA KIRPILMAZ, hata döner', () => {
    const r = toleranceCapacitanceBand({ Cnominal: 100e-6, tolerancePct: 150 })
    expect(r.error).toBe(PDNR_ERR_TOLERANCE_RANGE)
    expect(r.Cmin).toBeLessThan(0) // ham (kırpılmamış) değer korunur
  })

  it('pdnToleranceSweep min/nominal/max üç ayrı sweep döner', () => {
    const bulk = { ESR: 0.01, eslComponent: 5e-9, Cnominal: 100e-6, tolerancePct: 20, count: 1 }
    const mlcc = { ESR: 0.02, eslComponent: 0.5e-9, Cnominal: 100e-9, tolerancePct: 10, count: 1 }
    const t = pdnToleranceSweep({ fMin: 1e3, fMax: 1e8, points: 100, capGroups: [bulk, mlcc], threshold: 3 })
    expect(t.error).toBeUndefined()
    expect(t.min.maxImpedance).toBeGreaterThan(0)
    expect(t.nominal.maxImpedance).toBeGreaterThan(0)
    expect(t.max.maxImpedance).toBeGreaterThan(0)
    // Daha büyük etkin kapasite SRF'i düşürür — min/max eğrileri nominal'den ayrışmalı
    expect(t.min.maxImpedance).not.toBeCloseTo(t.max.maxImpedance, 6)
  })

  it('boş grup listesi hata', () => {
    expect(pdnToleranceSweep({ fMin: 1e3, fMax: 1e8, points: 10, capGroups: [] }).error).toBe(PDNR_ERR_INVALID)
  })
})

describe('§10.12 sonuçlar — target bandı ve toplayıcı', () => {
  // Sentetik, elle kurgulanmış dB dizisi: [−10,−5,5,10,−5] dB, Ztarget=1 (0 dB)
  // freqs 1,10,100,1e3,1e4 (ondalık log adımlar). Geçişler enterpolasyonla:
  //   10→100 arası (−5→5 dB) t=0.5  → f=10^1.5
  //   1e3→1e4 arası (10→−5 dB) t=2/3 → f=10^(3+2/3)
  const freqs = [1, 10, 100, 1e3, 1e4]
  const dbToMag = (db) => 10 ** (db / 20)
  const magnitudes = [-10, -5, 5, 10, -5].map(dbToMag)

  it('target üstü tek bir bant, uçları enterpolasyonla kestirilir', () => {
    const r = bandsOverTarget({ freqs, magnitudes, Ztarget: 1 })
    expect(r.error).toBeUndefined()
    expect(r.bands).toHaveLength(1)
    expect(r.bands[0].start).toBeCloseTo(10 ** 1.5, 9)
    expect(r.bands[0].end).toBeCloseTo(10 ** (3 + 2 / 3), 6)
  })

  it('target altı bant yüzdesi log-frekans ağırlıklı', () => {
    const pct = bandUnderTargetPct({ freqs, magnitudes, Ztarget: 1 })
    expect(pct).toBeCloseTo((1 + 0.5 + 0 + 1 / 3) / 4 * 100, 6)
  })

  it('geçersiz Ztarget hata/NaN döner', () => {
    expect(bandsOverTarget({ freqs, magnitudes, Ztarget: 0 }).error).toBe(PDNR_ERR_INVALID)
    expect(Number.isNaN(bandUnderTargetPct({ freqs, magnitudes, Ztarget: 0 }))).toBe(true)
  })

  it('pdnResonanceAnalysis hepsini tek çağrıda toplar', () => {
    const bulk = { ESR: 0.01, eslComponent: 5e-9, Ceffective: 100e-6, count: 1 }
    const mlcc = { ESR: 0.02, eslComponent: 0.5e-9, Ceffective: 100e-9, count: 1 }
    const r = pdnResonanceAnalysis({
      fMin: 1e3, fMax: 1e8, points: 400, Vrail: 1.0, ripplePct: 5, deltaI: 5,
      capGroups: [bulk, mlcc], threshold: 3,
    })
    expect(r.ok).toBe(true)
    expect(r.target.Ztarget).toBeCloseTo(0.05 / 5, 12)
    expect(r.maxImpedance).toBeGreaterThan(0)
    expect(r.worstAntiresonance).not.toBeNull()
    expect(r.groupSrf).toHaveLength(2)
    expect(r.groupSrf[0].srf).toBeCloseTo(selfResonantFrequency({ ESLtotal: 5e-9, C: 100e-6 }), 3)
    expect(Array.isArray(r.overTargetBands)).toBe(true)
    expect(r.underTargetPct).toBeGreaterThanOrEqual(0)
    expect(r.underTargetPct).toBeLessThanOrEqual(100)
  })

  it('geçersiz üst düzey girdide hata (deltaI eksik)', () => {
    const r = pdnResonanceAnalysis({
      fMin: 1e3, fMax: 1e8, points: 10, Vrail: 1, ripplePct: 5, deltaI: 0,
      capGroups: [{ Ceffective: 1e-6 }],
    })
    expect(r.error).toBe(PDNR_ERR_INVALID)
  })
})
