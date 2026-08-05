import { describe, it, expect } from 'vitest'
import {
  EMC_ERR_INVALID, EMC_ERR_TOPOLOGY,
  idealCutoffFrequency, characteristicImpedance,
  dampingRatio, qualityFactor,
  inductorImpedance, capacitorImpedance, dampingBranchImpedance,
  seriesStage, shuntStage, cascadeAbcd,
  twoPortTransfer, twoPortOutputImpedance,
  filterNetwork, filterResponse,
  converterInputImpedance, impedanceRatio,
  commonModeImpedance, differentialModeImpedance,
  actualCutoffFrequency, dominatesCandidate,
  evaluateDampingCandidate, evaluateDampingCandidates,
} from './emcFilter'

// Referans senaryo — kararlar §1 / REV2 §12.12: L=10µH, C=10µF → f0≈15.915kHz, Z0=1Ω.
const REF_L = 10e-6
const REF_C = 10e-6

describe('idealCutoffFrequency / characteristicImpedance — REV2 §12.12 referans testi', () => {
  it('L=10µH, C=10µF için f0 ≈ 15.915 kHz üretir', () => {
    const f0 = idealCutoffFrequency({ L: REF_L, C: REF_C })
    expect(f0).toBeCloseTo(15915.49, 1)
  })

  it('L=10µH, C=10µF için Z0 = 1 Ω üretir', () => {
    expect(characteristicImpedance({ L: REF_L, C: REF_C })).toBeCloseTo(1, 9)
  })

  it('geçersiz girdide NaN döner, hata kodu değil (skaler fonksiyon sözleşmesi)', () => {
    expect(Number.isNaN(idealCutoffFrequency({ L: 0, C: REF_C }))).toBe(true)
    expect(Number.isNaN(characteristicImpedance({ L: REF_L, C: -1 }))).toBe(true)
  })
})

describe('dampingRatio / qualityFactor — REV2 §12.4 basitleştirilmiş referans', () => {
  it('R = Z0 iken ζ = 0.5 (kritik altı, klasik Q=1 noktası)', () => {
    const R = characteristicImpedance({ L: REF_L, C: REF_C }) // 1 Ω
    expect(dampingRatio({ R, L: REF_L, C: REF_C })).toBeCloseTo(0.5, 9)
    expect(qualityFactor({ R, L: REF_L, C: REF_C })).toBeCloseTo(1, 9)
  })

  it('R=0 için ζ=0 (sönümsüz) ve Q tanımsız (NaN)', () => {
    expect(dampingRatio({ R: 0, L: REF_L, C: REF_C })).toBe(0)
    expect(Number.isNaN(qualityFactor({ R: 0, L: REF_L, C: REF_C }))).toBe(true)
  })
})

describe('inductorImpedance / capacitorImpedance / dampingBranchImpedance', () => {
  it('inductorImpedance: Z_L = DCR + jωL', () => {
    const z = inductorImpedance({ dcr: 0.1, L: 10e-6, f: 15915.49 })
    expect(z.re).toBeCloseTo(0.1, 6)
    expect(z.im).toBeCloseTo(1, 2) // ωL ≈ 2π·15915.49·10e-6 ≈ 1 Ω @ f0
  })

  it('inductorImpedance: parazitik paralel kapasite ile öz-rezonans etkisini yansıtır', () => {
    const noParallel = inductorImpedance({ L: 10e-6, f: 50e6 })
    const withParallel = inductorImpedance({ L: 10e-6, f: 50e6, parallelC: 5e-12 })
    // Yüksek frekansta parazitik kapasite endüktif reaktansı düşürür (SRF etkisi).
    expect(withParallel.im).toBeLessThan(noParallel.im)
  })

  it('capacitorImpedance: Z_C = ESR + j(ωESL − 1/(ωC))', () => {
    const z = capacitorImpedance({ esr: 0.01, C: 10e-6, f: 15915.49 })
    expect(z.re).toBeCloseTo(0.01, 6)
    expect(z.im).toBeCloseTo(-1, 2) // -1/(ωC) ≈ -1 Ω @ f0
  })

  it('dampingBranchImpedance: C_D verilmezse saf dirençli kol (Z_D = R_D)', () => {
    const z = dampingBranchImpedance({ rD: 2, f: 1000 })
    expect(z).toEqual({ re: 2, im: 0 })
  })

  it('dampingBranchImpedance: C_D verilirse Z_D = R_D + 1/(jωC_D)', () => {
    const z = dampingBranchImpedance({ rD: 1, cD: 100e-6, f: 15915.49 })
    expect(z.re).toBeCloseTo(1, 6)
    expect(z.im).toBeLessThan(0)
  })

  it('geçersiz girdide {error: EMC_ERR_INVALID} döner (blok fonksiyon sözleşmesi)', () => {
    expect(inductorImpedance({ L: -1, f: 1000 })).toEqual({ error: EMC_ERR_INVALID })
    expect(capacitorImpedance({ C: 0, f: 1000 })).toEqual({ error: EMC_ERR_INVALID })
    expect(dampingBranchImpedance({ rD: -1, f: 1000 })).toEqual({ error: EMC_ERR_INVALID })
    expect(inductorImpedance({ L: 1e-6, f: 0 })).toEqual({ error: EMC_ERR_INVALID })
  })
})

// Yukarıdaki capacitorImpedance testleri ESL'i HİÇ VERMİYOR: `esl = 0`
// varsayılanıyla ωESL terimi çarpılan sıfır olduğu için, o terim `esl/ω` yazılsa
// bile fark etmezdi. Aşağıdaki blok ESL'i açık veriyor ve seri rezonansı sınıyor.
describe('capacitorImpedance — ωESL terimi ve seri rezonans', () => {
  // ESL = 1 nH, C = 10 µF seçildi çünkü √(L·C) = √(1e-9 · 1e-5) = 1e-7 ve
  // ω_SRF = 1/√(L·C) = 1e7 rad/s TAM çıkıyor; f = ω/2π ile üç nokta elle çözülür.
  const esl = 1e-9
  const C = 10e-6
  const esr = 0.02
  const fOf = (omega) => omega / (2 * Math.PI)

  it('SRF ün onda birinde kol kapasitif: X = 1e−3 − 0.1 = −0.099 Ω', () => {
    // ω = 1e6 → ωESL = 1e6·1e-9 = 1e-3 ; 1/(ωC) = 1/(1e6·1e-5) = 0.1
    const z = capacitorImpedance({ esr, esl, C, f: fOf(1e6) })
    expect(z.re).toBeCloseTo(0.02, 12)
    expect(z.im).toBeCloseTo(-0.099, 9)
    // |Z| = √(0.02² + 0.099²) = √0.010201 = 0.101 (tam kare)
    expect(mag(z)).toBeCloseTo(0.101, 9)
  })

  it('SRF de reaktans SIFIRLANIR ve |Z| tam olarak ESR ye iner', () => {
    // ω = 1e7 → ωESL = 0.01 ; 1/(ωC) = 1/(1e7·1e-5) = 0.01 → fark 0
    const z = capacitorImpedance({ esr, esl, C, f: fOf(1e7) })
    expect(z.im).toBeCloseTo(0, 12)
    expect(mag(z)).toBeCloseTo(0.02, 12)
  })

  it('SRF ün on katında kol ENDÜKTİF: X = 0.1 − 1e−3 = +0.099 Ω', () => {
    // ω = 1e8 → ωESL = 0.1 ; 1/(ωC) = 1/(1e8·1e-5) = 1e-3
    // İşaret POZİTİF olmak zorunda: ESL terimi olmasaydı (ya da `esl/ω`
    // yazılsaydı) reaktans burada da negatif kalırdı.
    const z = capacitorImpedance({ esr, esl, C, f: fOf(1e8) })
    expect(z.im).toBeCloseTo(0.099, 9)
    expect(z.im).toBeGreaterThan(0)
    expect(mag(z)).toBeCloseTo(0.101, 9)
  })

  it('|Z| seri rezonansta MİNİMUMDUR — iki yanında dekad başına ~5 kat büyür', () => {
    const below = mag(capacitorImpedance({ esr, esl, C, f: fOf(1e6) }))
    const at = mag(capacitorImpedance({ esr, esl, C, f: fOf(1e7) }))
    const above = mag(capacitorImpedance({ esr, esl, C, f: fOf(1e8) }))
    expect(at).toBeLessThan(below)
    expect(at).toBeLessThan(above)
    // Simetri: ωESL ve 1/(ωC) rolleri takas olduğu için iki yan eşit çıkar.
    expect(above).toBeCloseTo(below, 9)
    // ESL yokken |Z| SRF üstünde 0.0200 e inerdi (yani minimum ORADA olurdu) —
    // bu iddia o mutasyonda kırılır.
    expect(above / at).toBeCloseTo(5.05, 2) // 0.101 / 0.02
  })

  it('ESL verilmeyen kol yüksek frekansta hâlâ kapasitiftir (varsayılan 0)', () => {
    const z = capacitorImpedance({ esr, C, f: fOf(1e8) })
    expect(z.im).toBeCloseTo(-1e-3, 12)
  })
})

describe('İki-kapılı (ABCD) makinesi', () => {
  it('seriesStage: A=D=1, C=0, B=Z', () => {
    const z = { re: 3, im: 4 }
    const m = seriesStage(z)
    expect(m).toEqual({
      A: { re: 1, im: 0 }, B: z, C: { re: 0, im: 0 }, D: { re: 1, im: 0 },
    })
  })

  it('shuntStage: A=D=1, B=0, C=1/Z', () => {
    const m = shuntStage({ re: 2, im: 0 })
    expect(m.C.re).toBeCloseTo(0.5, 9)
    expect(m.C.im).toBeCloseTo(0, 9)
  })

  it('cascadeAbcd: tek aşamalı zincir aşamanın kendisiyle aynıdır', () => {
    const stage = seriesStage({ re: 1, im: 2 })
    const chained = cascadeAbcd([stage])
    expect(chained.A).toEqual(stage.A)
    expect(chained.B).toEqual(stage.B)
  })

  it('cascadeAbcd: boş zincir birim matristir', () => {
    const identity = cascadeAbcd([])
    expect(identity).toEqual({
      A: { re: 1, im: 0 }, B: { re: 0, im: 0 }, C: { re: 0, im: 0 }, D: { re: 1, im: 0 },
    })
  })
})

// --- Aracın ana fiziği: twoPortTransfer / twoPortOutputImpedance -------------
//
// Transfer fonksiyonunun TAMAMI bu iki bağıntıda: filterResponse yalnızca
// kaynak/yük empedansını kurup bunları çağırıyor. Aşağıdaki vakalar bilerek
// SAF DİRENÇLİ ve tek aşamalı seçildi — beklenen sayı devre teorisiyle elle
// çözülüp yazıldı, motorun ifadesinden türetilmedi.

const mag = (z) => Math.hypot(z.re, z.im)

describe('twoPortTransfer — elle çözülebilir vakalar', () => {
  it('birim ABCD (ağ yok): Vout/Vsource = Z_L/(Z_L+Z_s)', () => {
    // Zs=10, ZL=30 → basit gerilim bölücü: 30/(30+10) = 0.75
    const h = twoPortTransfer({
      abcd: cascadeAbcd([]),
      zSource: { re: 10, im: 0 },
      zLoad: { re: 30, im: 0 },
    })
    expect(h.re).toBeCloseTo(0.75, 12)
    expect(h.im).toBeCloseTo(0, 12)
  })

  it('yalnız seri empedans: Z_L/(Z+Z_L) — B terimi paydada görünmeli', () => {
    // Z=10 seri, Zs=0, ZL=30 → 30/(10+30) = 0.75
    // B (= seri empedans) paydadan düşerse sonuç 30/30 = 1 olurdu.
    const h = twoPortTransfer({
      abcd: seriesStage({ re: 10, im: 0 }),
      zSource: { re: 0, im: 0 },
      zLoad: { re: 30, im: 0 },
    })
    expect(h.re).toBeCloseTo(0.75, 12)
    expect(h.im).toBeCloseTo(0, 12)
  })

  it('yalnız şönt empedans: Z_s ile (Z_şönt ∥ Z_L) arasındaki bölücü', () => {
    // Z_şönt=30, ZL=30 → paralel 15 Ω. Zs=10 ile bölücü: 15/(10+15) = 0.6
    // Motorun ifadesiyle de örtüşür: 30/(30 + 0 + (1/30)·10·30 + 10) = 30/50.
    // C·Z_s·Z_L terimi paydadan düşerse 30/40 = 0.75 çıkardı.
    const h = twoPortTransfer({
      abcd: shuntStage({ re: 30, im: 0 }),
      zSource: { re: 10, im: 0 },
      zLoad: { re: 30, im: 0 },
    })
    expect(h.re).toBeCloseTo(0.6, 12)
    expect(h.im).toBeCloseTo(0, 12)
  })

  it('seri reaktans X = R: |H| = 1/√2, yani −3.0103 dB', () => {
    // Z = j10, ZL = 10, Zs = 0 → H = 10/(10+j10) = (1−j)/2 = 0.5 − j0.5
    const h = twoPortTransfer({
      abcd: seriesStage({ re: 0, im: 10 }),
      zSource: { re: 0, im: 0 },
      zLoad: { re: 10, im: 0 },
    })
    expect(h.re).toBeCloseTo(0.5, 12)
    expect(h.im).toBeCloseTo(-0.5, 12) // işaret: endüktif seri kol fazı geriletir
    expect(mag(h)).toBeCloseTo(0.7071067811865476, 12)
    expect(20 * Math.log10(mag(h))).toBeCloseTo(-3.0103, 4)
  })
})

describe('twoPortOutputImpedance — elle çözülebilir vakalar', () => {
  it('birim ABCD (ağ yok): Z_out = Z_s', () => {
    const z = twoPortOutputImpedance({
      abcd: cascadeAbcd([]),
      zSource: { re: 7, im: 0 },
    })
    // (0 + 7·1)/(1 + 7·0) = 7 — ağ yokken geriye bakılan tek şey kaynaktır.
    // D terimi düşerse 0, C terimi bozulursa payda değişirdi.
    expect(z.re).toBeCloseTo(7, 12)
    expect(z.im).toBeCloseTo(0, 12)
  })

  it('yalnız seri empedans: Z_out = Z_s + Z (seri empedanslar toplanır)', () => {
    // Zs=5, Z=10 → (10 + 5·1)/(1 + 5·0) = 15
    const z = twoPortOutputImpedance({
      abcd: seriesStage({ re: 10, im: 0 }),
      zSource: { re: 5, im: 0 },
    })
    expect(z.re).toBeCloseTo(15, 12)
    expect(z.im).toBeCloseTo(0, 12)
  })

  it('yalnız şönt empedans: Z_out = Z_s ∥ Z_şönt', () => {
    // Zs=10, Z_şönt=30 → paralel = 10·30/40 = 7.5
    // Motorun ifadesi: (0 + 10·1)/(1 + 10·(1/30)) = 10/(4/3) = 7.5 — aynı sayı.
    // Paydadaki Z_s·C terimi düşerse 10 çıkardı (paralelleme kaybolurdu).
    const z = twoPortOutputImpedance({
      abcd: shuntStage({ re: 30, im: 0 }),
      zSource: { re: 10, im: 0 },
    })
    expect(z.re).toBeCloseTo(7.5, 12)
    expect(z.im).toBeCloseTo(0, 12)
  })
})

describe('filterNetwork — topoloji dispatch', () => {
  it('bilinmeyen topoloji EMC_ERR_TOPOLOGY döner', () => {
    const r = filterNetwork({ topology: 'bogus', f: 1000, network: {} })
    expect(r).toEqual({ error: EMC_ERR_TOPOLOGY })
  })

  it('lc topolojisi geçerli ağda {abcd} döner', () => {
    const r = filterNetwork({
      topology: 'lc', f: 15915.49, network: { L: REF_L, C: REF_C },
    })
    expect(r.error).toBeUndefined()
    expect(r.abcd).toBeDefined()
  })

  it('geçersiz komponent değeri alt hatayı olduğu gibi taşır', () => {
    const r = filterNetwork({
      topology: 'lc', f: 1000, network: { L: -1, C: REF_C },
    })
    expect(r).toEqual({ error: EMC_ERR_INVALID })
  })
})

describe('filterResponse — LC alçak geçiren davranışı', () => {
  const network = { L: REF_L, C: REF_C }
  const base = {
    topology: 'lc', network, rSource: 0.1, lSource: 1e-6, rLoad: 10,
  }

  it('geçiş bandında (f << f0) kazanç yaklaşık 0 dB civarındadır', () => {
    const r = filterResponse({ ...base, f: 100 })
    expect(r.error).toBeUndefined()
    expect(r.gainDb).toBeGreaterThan(-1)
    expect(r.gainDb).toBeLessThan(1)
  })

  it('durdurma bandında (f >> f0) güçlü zayıflatma vardır', () => {
    const low = filterResponse({ ...base, f: 100 })
    const high = filterResponse({ ...base, f: 10e6 })
    expect(high.gainDb).toBeLessThan(low.gainDb - 60)
  })

  it('insertion loss durdurma bandında pozitif ve büyüktür', () => {
    const r = filterResponse({ ...base, f: 5e6 })
    expect(r.insertionLossDb).toBeGreaterThan(20)
  })

  it('pi topolojisi aynı L/C ile lc topolojisinden durdurma bandında daha güçlü zayıflatır', () => {
    const piNet = {
      L: REF_L, C1: REF_C, C2: REF_C,
    }
    const lc = filterResponse({ ...base, f: 5e6 })
    const pi = filterResponse({
      topology: 'pi', network: piNet, rSource: 0.1, lSource: 1e-6, rLoad: 10, f: 5e6,
    })
    expect(pi.error).toBeUndefined()
    expect(pi.gainDb).toBeLessThan(lc.gainDb)
  })

  it('cm-choke topolojisi (DM ekleme yolu) geçerli ağda hesaplanır', () => {
    const r = filterResponse({
      topology: 'cm-choke',
      network: { lLeak: 1e-6, cLL: 1e-6 },
      rSource: 0.1,
      lSource: 0,
      rLoad: 10,
      f: 100e3,
    })
    expect(r.error).toBeUndefined()
    expect(Number.isFinite(r.gainDb)).toBe(true)
  })

  it('geçersiz yük direncinde EMC_ERR_INVALID döner', () => {
    expect(filterResponse({ ...base, f: 1000, rLoad: 0 })).toEqual({ error: EMC_ERR_INVALID })
  })
})

// Yukarıdaki cm-choke testi yalnızca `Number.isFinite(gainDb)` diyor — kazanç
// SIFIR da olsa, işareti ters de olsa, DM ağı hiç kurulmasa da geçerdi. Aşağıdaki
// çalışma noktası bilerek TAM SAYI çıkacak şekilde seçildi.
describe('cm-choke DM yolu — çıplak kazanç değeri', () => {
  // ω = 1e6 rad/s (f = ω/2π), L_leak = 60 µH, C_LL = 150 nF, R_s = 0, R_L = 10 Ω.
  // Elle:
  //   Z_leak = jωL      = j·1e6·60e-6      = j60 Ω
  //   Z_C    = 1/(jωC)  = −j/(1e6·150e-9)  = −j6.6667 Ω
  //   ABCD (seri Z_leak · şönt Z_C):
  //     A = 1 + Z_leak/Z_C = 1 − ω²·L·C = 1 − 9 = −8
  //     B = Z_leak = j60 ; C = 1/Z_C = j0.15 ; D = 1
  //   Z_s = 0 olduğundan payda = A·Z_L + B = −8·10 + j60 = −80 + j60
  //   |payda| = √(6400+3600) = √10000 = 100  →  |H| = 10/100 = 0.1
  //   G = 20·log10(0.1) = −20 dB  (TAM)
  const cm = {
    topology: 'cm-choke',
    network: { lLeak: 60e-6, cLL: 150e-9 },
    rSource: 0,
    lSource: 0,
    rLoad: 10,
    f: 1e6 / (2 * Math.PI),
  }

  it('kazanç tam olarak −20 dB (|H| = 0.1)', () => {
    const r = filterResponse(cm)
    expect(r.error).toBeUndefined()
    expect(mag(r.h)).toBeCloseTo(0.1, 12)
    expect(r.gainDb).toBeCloseTo(-20, 9)
  })

  it('kaynak empedansı sıfırken insertion loss tam olarak +20 dB', () => {
    // Filtresiz durum: H₀ = Z_L/(Z_s+Z_L) = 10/10 = 1 → 0 dB.
    // IL = 0 − (−20) = 20 dB.
    const r = filterResponse(cm)
    expect(r.insertionLossDb).toBeCloseTo(20, 9)
  })

  it('filtre çıkış empedansı Z_out = B/A = j60/(−8) = −j7.5 Ω', () => {
    // Z_s = 0 olduğu için Z_out = B/A; saf kapasitif (negatif reaktans) çıkar.
    const r = filterResponse(cm)
    expect(r.zOutFilter.re).toBeCloseTo(0, 9)
    expect(r.zOutFilter.im).toBeCloseTo(-7.5, 9)
  })
})

// "f0 ün çok üstünde 60 dB düştü" iddiası mertebeyi HİÇ ölçmez: 20 dB/dekad
// (birinci mertebe, yalnız seri L) da 40 dB/dekad (ikinci mertebe, L-C) da bu
// eşiği geçer. Bu blok eğimin kendisini ölçer.
describe('durdurma bandı — ikinci mertebe eğimi (dekad başına −40 dB)', () => {
  // Kaynak/yük parazitiği bilerek yok: R_s = 0, L_s = 0 → payda = A·Z_L + B.
  // f0 ün çok üstünde A ≈ −ω²LC olduğundan |H| ≈ 1/(ω²LC), yani ω² ile düşer.
  //   L = 10 µH, C = 10 µF → LC = 1e-10
  //   ω = 1e7 → ω²LC = 1e14·1e-10 = 1e4  → |H| ≈ 1e-4 → −80 dB
  //   ω = 1e8 → ω²LC = 1e16·1e-10 = 1e6  → |H| ≈ 1e-6 → −120 dB
  const pure = {
    topology: 'lc',
    network: { L: REF_L, C: REF_C },
    rSource: 0,
    lSource: 0,
    rLoad: 10,
  }
  const gainAt = (omega) => filterResponse({ ...pure, f: omega / (2 * Math.PI) }).gainDb

  it('ω = 1e7 rad/s te kazanç ≈ −80 dB', () => {
    expect(gainAt(1e7)).toBeCloseTo(-80, 2)
  })

  it('ω = 1e8 rad/s te kazanç ≈ −120 dB', () => {
    expect(gainAt(1e8)).toBeCloseTo(-120, 2)
  })

  it('bir dekad = 40 dB — birinci mertebe (20 dB/dekad) bu testi GEÇEMEZ', () => {
    expect(gainAt(1e7) - gainAt(1e8)).toBeCloseTo(40, 2)
    // Karşılaştırma tabanı: aynı seri bobin TEK BAŞINA (şönt kondansatör yok)
    // dekad başına yalnız 20 dB düşerdi.
    const firstOrder = (omega) => {
      const h = twoPortTransfer({
        abcd: seriesStage({ re: 0, im: omega * REF_L }),
        zSource: { re: 0, im: 0 },
        zLoad: { re: 10, im: 0 },
      })
      return 20 * Math.log10(mag(h))
    }
    const firstOrderSlope = firstOrder(1e7) - firstOrder(1e8)
    expect(firstOrderSlope).toBeGreaterThan(19.5)
    expect(firstOrderSlope).toBeLessThan(20.5)
  })
})

describe('converterInputImpedance — REV2 §12.7', () => {
  it('Vin=12V, Pout=10W, η=0.9 için R_in,neg = 12.96 Ω', () => {
    const r = converterInputImpedance({ vIn: 12, pOut: 10, efficiency: 0.9 })
    expect(r.error).toBeUndefined()
    expect(r.pIn).toBeCloseTo(11.1111, 3)
    expect(r.rInNeg).toBeCloseTo(12.96, 6)
    expect(r.z).toEqual({ re: -12.96, im: 0 })
  })

  it('verim (0,1] dışındaysa EMC_ERR_INVALID döner', () => {
    expect(converterInputImpedance({ vIn: 12, pOut: 10, efficiency: 1.1 })).toEqual({ error: EMC_ERR_INVALID })
    expect(converterInputImpedance({ vIn: 12, pOut: 10, efficiency: 0 })).toEqual({ error: EMC_ERR_INVALID })
  })
})

describe('impedanceRatio — K_Z', () => {
  it('|Z_out,filter|/|Z_in,converter| oranını hesaplar', () => {
    const kz = impedanceRatio({
      zOutFilter: { re: 3, im: 4 }, // |.|=5
      zInConverter: { re: -10, im: 0 }, // |.|=10
    })
    expect(kz).toBeCloseTo(0.5, 9)
  })

  it('sıfır büyüklüklü Z_in için NaN döner', () => {
    expect(Number.isNaN(impedanceRatio({
      zOutFilter: { re: 1, im: 0 }, zInConverter: { re: 0, im: 0 },
    }))).toBe(true)
  })
})

describe('commonModeImpedance / differentialModeImpedance — REV2 §12.9', () => {
  it('Z_CM ≈ R_DCR + jωL_CM', () => {
    const z = commonModeImpedance({ dcr: 0.05, lCm: 1e-3, f: 100e3 })
    expect(z.re).toBeCloseTo(0.05, 6)
    expect(z.im).toBeCloseTo(2 * Math.PI * 100e3 * 1e-3, 3)
  })

  it('Z_DM ≈ R_DCR + jωL_leak', () => {
    const z = differentialModeImpedance({ dcr: 0.05, lLeak: 1e-6, f: 100e3 })
    expect(z.re).toBeCloseTo(0.05, 6)
    expect(z.im).toBeCloseTo(2 * Math.PI * 100e3 * 1e-6, 3)
  })
})

describe('actualCutoffFrequency — enterpolasyon', () => {
  it('bilinen doğrusal (log f, dB) düşüşünde tam geçiş noktasını bulur', () => {
    // dB, log10(f) ile doğrusal düşüyor: db = -db/decade * (log10(f)-log10(f[0]))
    const freqs = [1000, 10000, 100000]
    const gainsDb = [0, -10, -20] // decade başına -10dB, referans 0dB @ f=1000
    // -3dB hedefi: 1000 ile 10000 arasında, log-doğrusal enterpolasyonla f = 1000*10^0.3
    const f3db = actualCutoffFrequency(freqs, gainsDb)
    expect(f3db).toBeCloseTo(1000 * 10 ** 0.3, 0)
  })

  it('sweep aralığında geçiş yoksa null döner (uydurma referans yok)', () => {
    const freqs = [1000, 2000, 3000]
    const gainsDb = [0, -0.1, -0.2] // hiç -3dB'ye inmiyor
    expect(actualCutoffFrequency(freqs, gainsDb)).toBeNull()
  })
})

describe('dominatesCandidate — kararlar §3.3 Pareto tanımı', () => {
  it('üç metrikte de eşit-veya-daha-iyi ve en az birinde kesin daha iyi ise domine eder', () => {
    const a = { gPeakDb: -2, aTargetDb: 40, pRD: 0.1 }
    const b = { gPeakDb: 1, aTargetDb: 35, pRD: 0.2 }
    expect(dominatesCandidate(a, b)).toBe(true)
    expect(dominatesCandidate(b, a)).toBe(false)
  })

  it('iki aday birbirine göre karışık (biri peaking, diğeri attenuation üstün) ise kimse domine etmez', () => {
    const a = { gPeakDb: -3, aTargetDb: 30, pRD: 0.1 }
    const b = { gPeakDb: -1, aTargetDb: 40, pRD: 0.1 }
    expect(dominatesCandidate(a, b)).toBe(false)
    expect(dominatesCandidate(b, a)).toBe(false)
  })

  it('tamamen özdeş adaylar birbirini domine etmez (kesin daha iyi şartı yok)', () => {
    const a = { gPeakDb: -2, aTargetDb: 40, pRD: 0.1 }
    const b = { gPeakDb: -2, aTargetDb: 40, pRD: 0.1 }
    expect(dominatesCandidate(a, b)).toBe(false)
    expect(dominatesCandidate(b, a)).toBe(false)
  })
})

describe('evaluateDampingCandidate — REV2 §12.8, kararlar §3.3', () => {
  const network = { L: REF_L, C: REF_C }
  const shared = {
    topology: 'lc',
    network,
    rSource: 0.1,
    lSource: 1e-6,
    rLoad: 10, // Z0=1Ω'dan büyük yük — dampingsiz belirgin peaking bekleniyor
    fMin: 1e3,
    fMax: 1e6,
    fNoise: 150e3,
    vSource: 1,
    vIn: 12,
    pOut: 10,
    efficiency: 0.9,
  }

  it('eksik limits (requiredAttenuationDb / dampingPowerMaxW) EMC_ERR_INVALID döner', () => {
    const r = evaluateDampingCandidate({ ...shared, damping: { rD: 1, cD: 100e-6 }, limits: {} })
    expect(r).toEqual({ error: EMC_ERR_INVALID })
  })

  it('sönümsüz aday (damping=null), yüksek Rload ile açıkça UYGUNSUZ çıkar (gain peaking > 0dB)', () => {
    const r = evaluateDampingCandidate({
      ...shared,
      damping: null,
      limits: { requiredAttenuationDb: 20, dampingPowerMaxW: 10 },
    })
    expect(r.error).toBeUndefined()
    expect(r.pRD).toBe(0) // damping kolu yok → güç kaybı tanım gereği sıfır
    expect(r.gPeakDb).toBeGreaterThan(0) // peaking mevcut, 0dB sınırını aşıyor
    expect(r.suitable.gainPeak).toBe(false)
    expect(r.meetsAll).toBe(false)
  })

  it('iyi sönümlenmiş aday, gevşek limitlerle açıkça UYGUN çıkar (dört koşul da true)', () => {
    // R_D=1Ω (≈Z0, §12.8 başlangıç tahmini) tek başına bu devrede (Rload=10Ω,
    // yani Z0'ın 10 katı — güçlü kaynak eşleşmemesi) tepe kazancını 0dB altına
    // indirmeye YETMİYOR (doğrulandı: gPeakDb ≈ +0.22dB). C_D'yi büyütmek
    // (100µF yerine 470µF) dampingi geniş bantta etkinleştirip tepeyi -0.8dB'ye
    // çekiyor — sayısal olarak doğrulanmış, hiçbir sabit formülden gelmiyor
    // (REV2 §12.8: "Damping capacitance için sabit tek formül kullanılmaz").
    const r = evaluateDampingCandidate({
      ...shared,
      damping: { rD: 0.5, cD: 470e-6 },
      limits: { requiredAttenuationDb: 10, dampingPowerMaxW: 10 },
    })
    expect(r.error).toBeUndefined()
    expect(r.suitable.gainPeak).toBe(true)
    expect(r.suitable.attenuation).toBe(true)
    expect(r.suitable.impedanceRatio).toBe(true)
    expect(r.suitable.dampingPower).toBe(true)
    expect(r.meetsAll).toBe(true)
    expect(r.gPeakDb).toBeLessThanOrEqual(0)
    expect(r.pRD).toBeGreaterThan(0) // damping kolu akım taşıyor, kayıp sıfırdan büyük
  })

  it('çok sıkı gerekli attenuation hedefi tek başına uygunsuzluk üretebilir', () => {
    const r = evaluateDampingCandidate({
      ...shared,
      damping: { rD: 1, cD: 100e-6 },
      limits: { requiredAttenuationDb: 500, dampingPowerMaxW: 10 }, // fiziksel olarak ulaşılamaz
    })
    expect(r.error).toBeUndefined()
    expect(r.suitable.attenuation).toBe(false)
    expect(r.meetsAll).toBe(false)
  })

  it('geçerli sweep aralığı olmadan sweep.js hata kodunu olduğu gibi taşır', () => {
    const r = evaluateDampingCandidate({
      ...shared,
      damping: { rD: 1, cD: 100e-6 },
      fMin: -1,
      limits: { requiredAttenuationDb: 10, dampingPowerMaxW: 10 },
    })
    expect(r.error).toBeDefined()
    expect(r.error).not.toBe(EMC_ERR_INVALID) // sweep.js kendi kodunu taşımalı (örn. log-axis-nonpositive)
  })
})

describe('evaluateDampingCandidates — çoklu aday + Pareto işaretleme (kararlar §3.3)', () => {
  const network = { L: REF_L, C: REF_C }
  const shared = {
    topology: 'lc',
    network,
    rSource: 0.1,
    lSource: 1e-6,
    rLoad: 10,
    fMin: 1e3,
    fMax: 1e6,
    fNoise: 150e3,
    vSource: 1,
    vIn: 12,
    pOut: 10,
    efficiency: 0.9,
    limits: { requiredAttenuationDb: 10, dampingPowerMaxW: 10 },
  }

  it('{candidates, dominated} yapısını döner, uzunluklar eşleşir', () => {
    const r = evaluateDampingCandidates({
      ...shared,
      candidates: [null, { rD: 1, cD: 100e-6 }, { rD: 0.5, cD: 100e-6 }],
    })
    expect(r.error).toBeUndefined()
    expect(r.candidates).toHaveLength(3)
    expect(r.dominated).toHaveLength(3)
    r.candidates.forEach((c, i) => expect(c.dominated).toBe(r.dominated[i]))
  })

  it('uygun olmayan (sönümsüz) aday için dominated null döner — Pareto uygulanamaz', () => {
    const r = evaluateDampingCandidates({
      ...shared,
      candidates: [null, { rD: 1, cD: 100e-6 }],
    })
    expect(r.candidates[0].meetsAll).toBe(false)
    expect(r.candidates[0].dominated).toBeNull()
  })

  it('tek uygun aday kendi kendini domine edemez (dominated=false)', () => {
    const r = evaluateDampingCandidates({
      ...shared,
      candidates: [{ rD: 0.5, cD: 470e-6 }],
    })
    expect(r.candidates[0].meetsAll).toBe(true)
    expect(r.candidates[0].dominated).toBe(false)
  })

  it('boş aday listesinde EMC_ERR_INVALID döner', () => {
    expect(evaluateDampingCandidates({ ...shared, candidates: [] })).toEqual({ error: EMC_ERR_INVALID })
  })

  it('iki UYGUN aday arasında gerçek Pareto dominansı doğru işaretlenir', () => {
    // Sayısal olarak doğrulandı (aynı devre, ızgara taraması): rD=0.1/cD=10mF
    // adayı rD=0.15/cD=470µF adayına göre HER ÜÇ ana metrikte de eşit-veya-
    // daha-iyi ve ikisinde KESİN daha iyi (gPeakDb: -6.25 vs -0.02dB,
    // aTargetDb: 43.08 vs 41.61dB, pRD: 2.311 vs 2.346W) — kararlar §3.3
    // tanımına göre birinci aday ikinciyi domine eder.
    const r = evaluateDampingCandidates({
      ...shared,
      candidates: [{ rD: 0.1, cD: 0.01 }, { rD: 0.15, cD: 470e-6 }],
    })
    expect(r.error).toBeUndefined()
    expect(r.candidates[0].meetsAll).toBe(true)
    expect(r.candidates[1].meetsAll).toBe(true)
    expect(r.candidates[0].dominated).toBe(false) // baskın aday
    expect(r.candidates[1].dominated).toBe(true) // baskılanan aday
  })
})
