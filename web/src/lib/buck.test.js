import { describe, it, expect } from 'vitest'
import {
  dutyCycleIdeal, dutyCycleApprox,
  inductorRippleCurrent, requiredInductance, rippleRatio, rippleCurrentFromRatio,
  inductorPeakCurrent, inductorMinCurrent, inductorRmsCurrent, ccmBoundaryCurrent,
  classifyConductionMode,
  capacitiveRippleVoltage, esrRippleVoltage, outputRippleApprox, minOutputCapacitance,
  inputCapacitorRmsCurrent,
  highSideConductionLoss, lowSideConductionLoss,
  diodeAverageCurrent, diodeConductionLoss, diodeReverseRecoveryLoss,
  deadTimeBodyDiodeLoss, inductorCopperLoss, junctionTemperature,
  buckConverterPlan,
  BUCK_ERR_INVALID, BUCK_ERR_STEP_UP, BUCK_MODE_CCM, BUCK_MODE_DCM,
} from './buck'

// REV2 §13.16 — V_in=24 V, V_out=12 V, I_out=5 A, f_sw=200 kHz, ΔI_L=1.5 A,
// 50 mV kapasitif ripple hedefiyle beklenen: D=0.5, L=20 µH, I_L,peak=5.75 A,
// I_CIN,RMS≈2.5 A, C_out,min≈18.75 µF.
describe('REV2 §13.16 referans testi', () => {
  const r = buckConverterPlan({
    vIn: 24, vOut: 12, iOut: 5, fsw: 200e3, deltaIL: 1.5, deltaVTarget: 0.05,
  })

  it('duty cycle 0.5', () => {
    expect(r.duty.ideal).toBeCloseTo(0.5, 12)
  })

  it('gerekli endüktans 20 µH', () => {
    expect(r.inductor.required * 1e6).toBeCloseTo(20, 9)
  })

  it('peak indüktör akımı 5.75 A', () => {
    expect(r.inductor.peak).toBeCloseTo(5.75, 12)
  })

  it('input capacitor RMS akımı ≈2.5 A', () => {
    expect(r.inputCapacitor.rmsCurrent).toBeCloseTo(2.5, 9)
  })

  it('minimum output capacitance ≈18.75 µF', () => {
    expect(r.outputCapacitance.min * 1e6).toBeCloseTo(18.75, 9)
  })

  it('bu çalışma noktası CCM sınırının içinde kalır', () => {
    expect(r.inductor.min).toBeCloseTo(4.25, 12) // I_out − ΔI_L/2, referans tabloya dahil değil ama tutarlılık için
    expect(r.inductor.mode).toBe(BUCK_MODE_CCM)
  })
})

// Regresyon: ΔI_L üç girdiden türeyebiliyor (doğrudan ΔI_L / hedef ripple
// oranı / girilen indüktans) ve öncelik bu sıradadır. Girilen bobin
// kaybedince motor onu `chosen` alanında taşımaya devam ediyordu; ekran da
// "kullanılan indüktans" diye TAM ONU basıyordu. Sonuç: kullanıcı, hesaba hiç
// girmemiş bir bobinin peak/RMS akımını, ΔV_C'sini ve T_j'sini kendi
// parçasının sayıları sanıyordu. Artık `used` gerçekten kullanılanı,
// `rippleSource` kararı vereni, `chosenIgnored` de atılmayı bildiriyor.
describe('ΔI_L kaynağı ve kullanılan indüktans', () => {
  const ortak = { vIn: 12, vOut: 3.3, iOut: 2, fsw: 500e3 }

  it('yalnız indüktans verilince ripple ondan türer ve kullanılan odur', () => {
    const r = buckConverterPlan({ ...ortak, l: 47e-6 })
    expect(r.inductor.rippleSource).toBe('inductance')
    expect(r.inductor.used).toBe(47e-6)
    expect(r.inductor.chosenIgnored).toBe(false)
    // ΔI = (V_in − V_out)·D/(L·f) = 8.7 × 0.275 / (47e−6 × 500e3) = 2.3925/23.5
    expect(r.inductor.deltaIL).toBeCloseTo(0.1018085, 7)
  })

  it('ripple oranı da verilince O kazanır ve girilen bobin ATILIR', () => {
    const r = buckConverterPlan({ ...ortak, l: 47e-6, rippleTargetRatio: 0.3 })
    expect(r.inductor.rippleSource).toBe('ratio')
    expect(r.inductor.deltaIL).toBeCloseTo(0.6, 12) // 0.3 × 2 A
    expect(r.inductor.chosen).toBe(47e-6) // girdi korunur
    expect(r.inductor.chosenIgnored).toBe(true) // ama kullanılmadı
    // Kullanılan bobin, ripple hedefinden türeyen gerekli değerdir.
    expect(r.inductor.used).toBe(r.inductor.required)
    expect(r.inductor.used * 1e6).toBeCloseTo(7.9750, 4)
    expect(r.inductor.used).not.toBe(r.inductor.chosen)
  })

  it('türev sonuçlar KULLANILAN bobine aittir, girilene değil', () => {
    const r = buckConverterPlan({ ...ortak, l: 47e-6, rippleTargetRatio: 0.3 })
    // 47 µH gerçek olsaydı ΔI = 0.1019 A, peak = 2.051 A olurdu.
    // Hesap 7.975 µH'e ait: peak = I_out + ΔI/2 = 2 + 0.3 = 2.3 A.
    expect(r.inductor.peak).toBeCloseTo(2.3, 12)
    expect(r.inductor.peak).not.toBeCloseTo(2.051, 2)
  })

  it('doğrudan ΔI_L her ikisini de ezer', () => {
    const r = buckConverterPlan({ ...ortak, l: 47e-6, rippleTargetRatio: 0.3, deltaIL: 0.9 })
    expect(r.inductor.rippleSource).toBe('direct')
    expect(r.inductor.deltaIL).toBe(0.9)
    expect(r.inductor.chosenIgnored).toBe(true)
    expect(r.inductor.used).toBe(r.inductor.required)
  })

  it('bobin hiç verilmezse atılma bildirimi de yoktur', () => {
    const r = buckConverterPlan({ ...ortak, rippleTargetRatio: 0.3 })
    expect(r.inductor.chosen).toBeNull()
    expect(r.inductor.chosenIgnored).toBe(false)
    expect(r.inductor.used).toBe(r.inductor.required)
  })
})

describe('§13.3 duty cycle', () => {
  it('ideal D = V_out/V_in', () => {
    expect(dutyCycleIdeal({ vIn: 24, vOut: 12 })).toBeCloseTo(0.5, 12)
  })

  it('verim tahminli yaklaşım D ≈ V_out/(η·V_in)', () => {
    expect(dutyCycleApprox({ vIn: 24, vOut: 12, eta: 0.9 })).toBeCloseTo(12 / (0.9 * 24), 12)
  })

  it('V_in ≤ 0 veya V_out ≤ 0 için NaN', () => {
    expect(Number.isNaN(dutyCycleIdeal({ vIn: 0, vOut: 12 }))).toBe(true)
    expect(Number.isNaN(dutyCycleIdeal({ vIn: 24, vOut: 0 }))).toBe(true)
  })
})

describe('§13.4 indüktör ripple akımı', () => {
  it('ΔI_L = (V_in−V_out)·D/(L·f_sw), L=20µH ile referans ΔI_L=1.5 A üretir', () => {
    expect(inductorRippleCurrent({ vIn: 24, vOut: 12, d: 0.5, l: 20e-6, fsw: 200e3 }))
      .toBeCloseTo(1.5, 9)
  })

  it('hedef ripple’dan gerekli endüktans L=20µH (referans)', () => {
    expect(requiredInductance({ vIn: 24, vOut: 12, deltaIL: 1.5, fsw: 200e3 }) * 1e6)
      .toBeCloseTo(20, 9)
  })

  it('V_in ≤ V_out ise (step-up) NaN döner', () => {
    expect(Number.isNaN(inductorRippleCurrent({ vIn: 12, vOut: 12, d: 0.5, l: 20e-6, fsw: 200e3 }))).toBe(true)
    expect(Number.isNaN(requiredInductance({ vIn: 10, vOut: 12, deltaIL: 1.5, fsw: 200e3 }))).toBe(true)
  })

  it('ripple oranı ve tersi birbirini doğrular', () => {
    expect(rippleRatio({ deltaIL: 1.5, iOut: 5 })).toBeCloseTo(0.3, 12)
    expect(rippleCurrentFromRatio({ iOut: 5, rI: 0.3 })).toBeCloseTo(1.5, 12)
  })
})

describe('§13.5 peak/RMS indüktör akımı ve CCM sınırı', () => {
  it('I_L,peak = I_out + ΔI_L/2', () => {
    expect(inductorPeakCurrent({ iOut: 5, deltaIL: 1.5 })).toBeCloseTo(5.75, 12)
  })

  it('I_L,min ÇIKARMA — negatif sonuç kırpılmaz', () => {
    expect(inductorMinCurrent({ iOut: 1, deltaIL: 3 })).toBeCloseTo(-0.5, 12)
  })

  it('I_L,RMS = √(I_out² + ΔI_L²/12)', () => {
    expect(inductorRmsCurrent({ iOut: 5, deltaIL: 1.5 })).toBeCloseTo(Math.sqrt(25 + 2.25 / 12), 12)
  })

  it('CCM sınırı I_out,boundary = ΔI_L/2', () => {
    expect(ccmBoundaryCurrent({ deltaIL: 1.5 })).toBeCloseTo(0.75, 12)
  })

  it('durum sınıflaması: I_L,min işaretine göre CCM/DCM, NaN için null', () => {
    expect(classifyConductionMode(4.25)).toBe(BUCK_MODE_CCM)
    expect(classifyConductionMode(-0.5)).toBe(BUCK_MODE_DCM)
    expect(classifyConductionMode(0)).toBe(BUCK_MODE_CCM) // sınırda tam CCM/DCM geçişi
    expect(classifyConductionMode(NaN)).toBeNull()
  })
})

describe('DCM senaryosu (I_out < I_out,boundary)', () => {
  // I_out=1 A, ΔI_L=3 A → I_L,min = 1 − 1.5 = −0.5 A, sınır 1.5 A > I_out.
  const r = buckConverterPlan({ vIn: 24, vOut: 12, iOut: 1, fsw: 200e3, deltaIL: 3 })

  it('I_L,min negatif, aynen döner (kırpılmaz)', () => {
    expect(r.inductor.min).toBeCloseTo(-0.5, 12)
  })

  it('mode DCM olarak işaretlenir', () => {
    expect(r.inductor.mode).toBe(BUCK_MODE_DCM)
    expect(r.inductor.boundaryCurrent).toBeCloseTo(1.5, 12)
  })

  it('hesap yine de r.ok true döner — DCM bir hata değil, mühendislik durumudur', () => {
    expect(r.ok).toBe(true)
  })
})

describe('§13.6 output ripple', () => {
  it('kapasitif ripple, ESR ripple ve iki terimli kaba toplam (ESL YOK)', () => {
    const deltaVC = capacitiveRippleVoltage({ deltaIL: 1.5, fsw: 200e3, cOut: 18.75e-6 })
    const deltaVEsr = esrRippleVoltage({ deltaIL: 1.5, esr: 0.01 })
    expect(deltaVC).toBeCloseTo(0.05, 9)
    expect(deltaVEsr).toBeCloseTo(0.015, 12)
    expect(outputRippleApprox({ deltaVC, deltaVEsr })).toBeCloseTo(0.065, 12)
  })

  it('hedef ripple’dan minimum output capacitance (referans 18.75 µF)', () => {
    expect(minOutputCapacitance({ deltaIL: 1.5, fsw: 200e3, deltaVTarget: 0.05 }) * 1e6)
      .toBeCloseTo(18.75, 9)
  })
})

describe('§13.7 input capacitor RMS akımı', () => {
  it('I_CIN,RMS ≈ I_out·√(D(1−D)), D=0.5 referansı 2.5 A', () => {
    expect(inputCapacitorRmsCurrent({ iOut: 5, d: 0.5 })).toBeCloseTo(2.5, 9)
  })

  it('D=0 veya D=1 sınırında akım sıfır', () => {
    expect(inputCapacitorRmsCurrent({ iOut: 5, d: 0 })).toBeCloseTo(0, 12)
    expect(inputCapacitorRmsCurrent({ iOut: 5, d: 1 })).toBeCloseTo(0, 12)
  })

  it('[0,1] dışı D için NaN', () => {
    expect(Number.isNaN(inputCapacitorRmsCurrent({ iOut: 5, d: 1.2 }))).toBe(true)
  })
})

describe('§13.8 MOSFET iletim kaybı', () => {
  // I_L,RMS² = 25.1875 (referans senaryo)
  it('high-side ve low-side ayrı duty faktörüyle', () => {
    const iLRms2 = 25 + 2.25 / 12
    expect(highSideConductionLoss({ iLRms: Math.sqrt(iLRms2), rdsOnHs: 0.02, d: 0.5 }))
      .toBeCloseTo(iLRms2 * 0.02 * 0.5, 12)
    expect(lowSideConductionLoss({ iLRms: Math.sqrt(iLRms2), rdsOnLs: 0.015, d: 0.5 }))
      .toBeCloseTo(iLRms2 * 0.015 * 0.5, 12)
  })
})

describe('§13.10 asenkron diode kaybı', () => {
  it('ortalama akım ve iletim kaybı', () => {
    expect(diodeAverageCurrent({ iOut: 5, d: 0.5 })).toBeCloseTo(2.5, 12)
    expect(diodeConductionLoss({ vF: 0.5, iOut: 5, d: 0.5 })).toBeCloseTo(1.25, 12)
  })

  it('reverse recovery kaybı Q_rr·V_in·f_sw', () => {
    expect(diodeReverseRecoveryLoss({ qrr: 50e-9, vIn: 24, fsw: 200e3 })).toBeCloseTo(0.24, 9)
  })
})

describe('§13.11 dead-time body diode kaybı (senkron)', () => {
  it('varsayılan N_edges=2 ile', () => {
    expect(deadTimeBodyDiodeLoss({ vFBody: 0.7, iOut: 5, tDead: 20e-9, fsw: 200e3 }))
      .toBeCloseTo(0.7 * 5 * 20e-9 * 200e3 * 2, 12)
  })
})

describe('§13.12 indüktör bakır kaybı', () => {
  it('P = I_L,RMS²·DCR', () => {
    const iLRms2 = 25 + 2.25 / 12
    expect(inductorCopperLoss({ iLRms: Math.sqrt(iLRms2), dcr: 0.01 })).toBeCloseTo(iLRms2 * 0.01, 12)
  })
})

describe('§13.13 termal', () => {
  it('T_J = T_A + P·θ_JA', () => {
    expect(junctionTemperature({ tAmbient: 25, pDevice: 1, thetaJa: 40 })).toBeCloseTo(65, 12)
  })
})

describe('switching/gate kaybı — gateDriver.js’ten yeniden kullanım', () => {
  it('switching loss ½·V_in·I_out·(t_r+t_f)·f_sw', () => {
    const r = buckConverterPlan({
      vIn: 24, vOut: 12, iOut: 5, fsw: 200e3, deltaIL: 1.5,
      tr: 20e-9, tf: 30e-9,
    })
    expect(r.switching.loss).toBeCloseTo(0.5 * 24 * 5 * 50e-9 * 200e3, 9)
  })

  it('gate loss high-side + low-side toplamı', () => {
    const r = buckConverterPlan({
      vIn: 24, vOut: 12, iOut: 5, fsw: 200e3, deltaIL: 1.5,
      vg: 5, qgHs: 20e-9, qgLs: 15e-9,
    })
    expect(r.gate.hs).toBeCloseTo(20e-9 * 5 * 200e3, 12)
    expect(r.gate.ls).toBeCloseTo(15e-9 * 5 * 200e3, 12)
    expect(r.gate.total).toBeCloseTo(r.gate.hs + r.gate.ls, 12)
  })
})

describe('buckConverterPlan — hata kodları', () => {
  it('geçersiz temel girdi BUCK_ERR_INVALID döner', () => {
    expect(buckConverterPlan({ vIn: 0, vOut: 12, iOut: 5, fsw: 200e3, deltaIL: 1.5 }).error)
      .toBe(BUCK_ERR_INVALID)
  })

  it('V_out ≥ V_in (step-up) BUCK_ERR_STEP_UP döner', () => {
    expect(buckConverterPlan({ vIn: 12, vOut: 24, iOut: 5, fsw: 200e3, deltaIL: 1.5 }).error)
      .toBe(BUCK_ERR_STEP_UP)
  })

  it('ripple’ı belirleyen üç yoldan (deltaIL, l, rippleTargetRatio) hiçbiri verilmezse BUCK_ERR_INVALID', () => {
    expect(buckConverterPlan({ vIn: 24, vOut: 12, iOut: 5, fsw: 200e3 }).error).toBe(BUCK_ERR_INVALID)
  })

  it('l verilirse ΔI_L ondan türetilir', () => {
    const r = buckConverterPlan({ vIn: 24, vOut: 12, iOut: 5, fsw: 200e3, l: 20e-6 })
    expect(r.inductor.deltaIL).toBeCloseTo(1.5, 9)
  })

  it('rippleTargetRatio verilirse ΔI_L ondan türetilir', () => {
    const r = buckConverterPlan({ vIn: 24, vOut: 12, iOut: 5, fsw: 200e3, rippleTargetRatio: 0.3 })
    expect(r.inductor.deltaIL).toBeCloseTo(1.5, 9)
  })
})

describe('buckConverterPlan — opsiyonel bloklar', () => {
  const base = { vIn: 24, vOut: 12, iOut: 5, fsw: 200e3, deltaIL: 1.5 }

  it('verilmeyen bloklar null döner, uydurma varsayım kurulmaz', () => {
    const r = buckConverterPlan(base)
    expect(r.outputRipple).toBeNull()
    expect(r.outputCapacitance).toBeNull()
    expect(r.conduction.highSide).toBeNull()
    expect(r.conduction.lowSide).toBeNull()
    expect(r.conduction.isSynchronous).toBe(false)
    expect(r.switching).toBeNull()
    expect(r.gate).toBeNull()
    expect(r.diode).toBeNull()
    expect(r.deadTime).toBeNull()
    expect(r.thermal.highSide).toBeNull()
    expect(r.thermal.lowSide).toBeNull()
    expect(r.thermal.inductor).toBeNull()
  })

  it('rdsOnLs verilmezse asenkron: vF verilince diode bloğu dolar', () => {
    const r = buckConverterPlan({ ...base, vF: 0.5 })
    expect(r.conduction.isSynchronous).toBe(false)
    expect(r.diode).not.toBeNull()
    expect(r.diode.conductionLoss).toBeCloseTo(0.5 * 5 * 0.5, 12)
    expect(r.diode.reverseRecoveryLoss).toBeNull() // qrr verilmedi
    expect(r.deadTime).toBeNull()
  })

  it('rdsOnLs verilirse senkron: diode bloğu KAPANIR, dead-time açılabilir', () => {
    const r = buckConverterPlan({
      ...base, rdsOnHs: 0.02, rdsOnLs: 0.015, vF: 0.5, vFBody: 0.7, tDead: 20e-9,
    })
    expect(r.conduction.isSynchronous).toBe(true)
    expect(r.conduction.lowSide).not.toBeNull()
    expect(r.diode).toBeNull() // senkronda diode formülü uygulanmaz
    expect(r.deadTime).not.toBeNull()
    expect(r.deadTime.loss).toBeGreaterThan(0)
  })

  it('termal blok yalnız θ_JA ve T_A birlikte verildiğinde dolar', () => {
    const r = buckConverterPlan({
      ...base, rdsOnHs: 0.02, thetaJaHs: 40, tAmbient: 25,
    })
    expect(r.thermal.highSide).toBeCloseTo(25 + r.conduction.highSide.loss * 40, 9)
  })

  it('totalLossApprox mevcut terimlerin toplamıdır (async örnek)', () => {
    const r = buckConverterPlan({
      ...base, rdsOnHs: 0.02, dcr: 0.01, tr: 20e-9, tf: 30e-9, vF: 0.5, qrr: 50e-9,
    })
    const expected = r.conduction.highSide.loss + r.switching.loss
      + r.diode.conductionLoss + r.diode.reverseRecoveryLoss + r.inductor.copperLoss
    expect(r.totalLossApprox).toBeCloseTo(expected, 9)
  })

  it('totalLossApprox mevcut terimlerin toplamıdır (senkron örnek)', () => {
    const r = buckConverterPlan({
      ...base, rdsOnHs: 0.02, rdsOnLs: 0.015, dcr: 0.01,
      vg: 5, qgHs: 20e-9, qgLs: 15e-9, vFBody: 0.7, tDead: 20e-9,
    })
    const expected = r.conduction.highSide.loss + r.conduction.lowSide.loss
      + r.gate.total + r.deadTime.loss + r.inductor.copperLoss
    expect(r.totalLossApprox).toBeCloseTo(expected, 9)
  })
})

// --- ASİMETRİK DUTY (D = 0.25) ----------------------------------------------
//
// Yukarıdaki plan testlerinin neredeyse tamamı REV2 §13.16 referansında, yani
// V_in=24 / V_out=12 → D=0.5'te koşuyor. D=0.5'te `d` ile `1−d` SAYICA AYNIDIR:
// low-side iletim kaybının (1−D) çarpanı D yapılsa, diyot ortalama akımı
// I_out·(1−D) yerine I_out·D yazılsa hiçbir test kırılmazdı. Bu blok aynı
// motoru V_in=24 / V_out=6 → D=0.25 çalışma noktasında sınar; beklenen sayılar
// elle hesaplanıp yazıldı (hesap her testin yorumunda).
describe('asimetrik duty (V_in=24, V_out=6 → D=0.25)', () => {
  const asim = {
    vIn: 24, vOut: 6, iOut: 4, fsw: 200e3, deltaIL: 1.2,
  }
  // I_L,RMS² = I_out² + ΔI_L²/12 = 16 + 1.44/12 = 16 + 0.12 = 16.12 A²
  const ILRMS2 = 16.12

  it('D = 6/24 = 0.25 — ve 1−D = 0.75, ikisi artık ayırt edilebilir', () => {
    expect(dutyCycleIdeal({ vIn: 24, vOut: 6 })).toBeCloseTo(0.25, 12)
  })

  it('low-side iletim kaybı (1−D) ile, high-side D ile çarpılır', () => {
    // I_L,RMS = 4 A (doğrudan verildi) → I² = 16 A², R_DS(on) = 20 mΩ
    //   HS : 16 × 0.02 × 0.25 = 0.08 W
    //   LS : 16 × 0.02 × 0.75 = 0.24 W
    // (1−d) → d mutasyonunda LS 0.08 W'a düşer; d → (1−d) mutasyonunda HS
    // 0.24 W'a çıkar. D=0.5'te ikisi de 0.16 W olurdu ve fark görünmezdi.
    expect(highSideConductionLoss({ iLRms: 4, rdsOnHs: 0.02, d: 0.25 })).toBeCloseTo(0.08, 12)
    expect(lowSideConductionLoss({ iLRms: 4, rdsOnLs: 0.02, d: 0.25 })).toBeCloseTo(0.24, 12)
    // Oran tam olarak (1−D)/D = 3 olmalı.
    expect(
      lowSideConductionLoss({ iLRms: 4, rdsOnLs: 0.02, d: 0.25 })
      / highSideConductionLoss({ iLRms: 4, rdsOnHs: 0.02, d: 0.25 }),
    ).toBeCloseTo(3, 12)
  })

  it('diyot ortalama akımı ve iletim kaybı (1−D) ile ölçeklenir', () => {
    // I_D,avg = I_out·(1−D) = 4 × 0.75 = 3 A     (I_out·D olsaydı 1 A)
    // P_D     = V_F·I_out·(1−D) = 0.5 × 4 × 0.75 = 1.5 W  (D ile 0.5 W)
    expect(diodeAverageCurrent({ iOut: 4, d: 0.25 })).toBeCloseTo(3, 12)
    expect(diodeConductionLoss({ vF: 0.5, iOut: 4, d: 0.25 })).toBeCloseTo(1.5, 12)
  })

  it('input capacitor RMS akımı √(D(1−D)) ile: 4·√0.1875 = √3', () => {
    // D(1−D) = 0.25 × 0.75 = 0.1875 ; √0.1875 = 0.4330127…
    // 4 × 0.4330127 = 1.7320508 = √3.  D² mutasyonu 4×0.25 = 1 A verirdi.
    expect(inputCapacitorRmsCurrent({ iOut: 4, d: 0.25 })).toBeCloseTo(1.7320508075688772, 12)
    // Simetri: D ve 1−D takas edilince aynı akım çıkar (fonksiyon simetriktir).
    expect(inputCapacitorRmsCurrent({ iOut: 4, d: 0.75 }))
      .toBeCloseTo(inputCapacitorRmsCurrent({ iOut: 4, d: 0.25 }), 12)
  })

  it('asenkron plan: diyot bloğu (1−D) ile dolar', () => {
    const r = buckConverterPlan({ ...asim, rdsOnHs: 0.02, vF: 0.5 })
    expect(r.duty.ideal).toBeCloseTo(0.25, 12)
    expect(r.inductor.rms ** 2).toBeCloseTo(ILRMS2, 9)
    // HS: 16.12 × 0.02 × 0.25 = 0.0806 W
    expect(r.conduction.highSide.loss).toBeCloseTo(0.0806, 12)
    expect(r.diode.avgCurrent).toBeCloseTo(3, 12)
    expect(r.diode.conductionLoss).toBeCloseTo(1.5, 12)
    expect(r.inputCapacitor.rmsCurrent).toBeCloseTo(1.7320508075688772, 12)
    // Gerekli endüktans: V_out(V_in−V_out)/(ΔI_L·f·V_in)
    //   = 6 × 18 / (1.2 × 200e3 × 24) = 108/5.76e6 = 18.75 µH
    expect(r.inductor.required * 1e6).toBeCloseTo(18.75, 9)
  })

  it('senkron plan: LS kaybı HS kaybının tam üç katı', () => {
    const r = buckConverterPlan({ ...asim, rdsOnHs: 0.02, rdsOnLs: 0.02 })
    // HS: 16.12 × 0.02 × 0.25 = 0.0806 W ; LS: 16.12 × 0.02 × 0.75 = 0.2418 W
    expect(r.conduction.highSide.loss).toBeCloseTo(0.0806, 12)
    expect(r.conduction.lowSide.loss).toBeCloseTo(0.2418, 12)
    expect(r.conduction.isSynchronous).toBe(true)
  })
})

// Mevcut termal test (`termal blok yalnız θ_JA ve T_A birlikte verildiğinde
// dolar`) t_r/t_f VERMİYOR, dolayısıyla switching kaybı null kalıyor ve
// `pDevice = highSide.loss + (switching?.loss ?? 0)` ifadesinden switching
// terimi tümüyle silinse test yine geçerdi. Aşağıdaki senaryo t_r/t_f veriyor.
describe('termal — switching kaybı high-side T_J hesabına GİRER', () => {
  const r = buckConverterPlan({
    vIn: 24, vOut: 6, iOut: 4, fsw: 200e3, deltaIL: 1.2,
    rdsOnHs: 0.02, rdsOnLs: 0.02, dcr: 0.01,
    tr: 20e-9, tf: 30e-9,
    thetaJaHs: 40, thetaJaLs: 50, thetaJaInductor: 30, tAmbient: 25,
  })

  it('switching kaybı ½·V_in·I_out·(t_r+t_f)·f_sw = 0.48 W', () => {
    // 0.5 × 24 × 4 × 50e-9 × 200e3 = 48 × 1e-5 = 0.48 W
    expect(r.switching.loss).toBeCloseTo(0.48, 12)
  })

  it('T_J,HS = 25 + (0.0806 + 0.48)·40 = 47.424 °C', () => {
    // İletim 0.0806 W + switching 0.48 W = 0.5606 W ; × 40 K/W = 22.424 K
    // Switching terimi pDevice'tan silinseydi 25 + 0.0806×40 = 28.224 °C çıkardı.
    expect(r.thermal.highSide).toBeCloseTo(47.424, 9)
    expect(r.thermal.highSide).not.toBeCloseTo(28.224, 2)
  })

  it('T_J,LS = 25 + 0.2418·50 = 37.09 °C — switching low-side e EKLENMEZ', () => {
    // Anahtarlama kaybı yalnız high-side MOSFET'e yazılır (senkron buck'ta LS
    // ZVS'e yakın anahtarlar). LS'e de eklenseydi 25 + 0.7218×50 = 61.09 °C.
    expect(r.thermal.lowSide).toBeCloseTo(37.09, 9)
    expect(r.thermal.lowSide).not.toBeCloseTo(61.09, 2)
  })

  it('T_J,indüktör = 25 + 0.1612·30 = 29.836 °C (yalnız bakır kaybı)', () => {
    // P_Cu = I_L,RMS²·DCR = 16.12 × 0.01 = 0.1612 W
    expect(r.inductor.copperLoss).toBeCloseTo(0.1612, 12)
    expect(r.thermal.inductor).toBeCloseTo(29.836, 9)
  })
})
