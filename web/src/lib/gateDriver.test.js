import { describe, it, expect } from 'vitest'
import {
  averageGateCurrent, gateDrivePower, totalResistance, millerCurrent, millerTime,
  externalResistorForTarget, switchingLoss, cossLoss, externalResistorLoss, gateDriverPlan,
  GD_ERR_INVALID, GD_ERR_NEGATIVE_RESISTANCE, GD_ERR_DRIVER_CURRENT,
} from './gateDriver'

describe('REV2 §6.12 referans testi', () => {
  // Q_g = 40 nC, Q_gd = 10 nC, V_drive = 10 V, V_plateau = 5 V,
  // R_total = 10 Ω, f_sw = 100 kHz
  const r = gateDriverPlan({
    qg: 40e-9, qgd: 10e-9, vDrive: 10, vPlateau: 5, vOff: 0,
    rExtOn: 10, rExtOff: 10, fsw: 100e3,
  })

  it('ortalama gate akımı 4 mA', () => {
    expect(r.averageCurrent * 1e3).toBeCloseTo(4, 9)
  })

  it('gate sürme gücü 40 mW', () => {
    expect(r.gatePower * 1e3).toBeCloseTo(40, 9)
  })

  it('Miller akımı 0.5 A', () => {
    expect(r.on.current).toBeCloseTo(0.5, 12)
  })

  it('Miller süresi 20 ns', () => {
    expect(r.on.millerTime * 1e9).toBeCloseTo(20, 9)
  })
})

describe('temel büyüklükler', () => {
  it('ortalama akım MOSFET sayısıyla ölçeklenir', () => {
    expect(averageGateCurrent({ qg: 40e-9, fsw: 100e3, count: 3 })).toBeCloseTo(12e-3, 12)
  })

  it('negatif turn-off gerilimi salınımı büyütür', () => {
    // ΔV = 10 − (−5) = 15 V
    expect(gateDrivePower({ qg: 40e-9, vOn: 10, vOff: -5, fsw: 100e3 })).toBeCloseTo(60e-3, 12)
  })

  it('toplam direnç dört bileşenin toplamı', () => {
    expect(totalResistance({ driver: 1, internal: 2, external: 6, trace: 0.5 })).toBeCloseTo(9.5, 12)
  })

  it('sıfır salınımda NaN döner', () => {
    expect(Number.isNaN(gateDrivePower({ qg: 40e-9, vOn: 10, vOff: 10, fsw: 100e3 }))).toBe(true)
  })
})

describe('driver akım limiti', () => {
  it('dirençten çıkan akım limitin altındaysa limit devreye girmez', () => {
    const r = millerCurrent({ vDrive: 10, vPlateau: 5, rTotal: 10, driverLimit: 2 })
    expect(r.actual).toBeCloseTo(0.5, 12)
    expect(r.driverLimited).toBe(false)
  })

  it('direnç küçükse akımı driver sınırlar', () => {
    const r = millerCurrent({ vDrive: 10, vPlateau: 5, rTotal: 1, driverLimit: 2 })
    expect(r.resistive).toBeCloseTo(5, 12)
    expect(r.actual).toBeCloseTo(2, 12)
    expect(r.driverLimited).toBe(true)
  })

  it('sınırlı akım Miller süresini uzatır', () => {
    const limited = millerCurrent({ vDrive: 10, vPlateau: 5, rTotal: 1, driverLimit: 2 })
    expect(millerTime({ qgd: 10e-9, current: limited.actual }) * 1e9).toBeCloseTo(5, 9)
  })
})

describe('hedef süreden harici direnç', () => {
  it('toplam dirençten diğer bileşenleri ÇIKARIR', () => {
    // I_target = 10 nC / 20 ns = 0.5 A → R_total = 5 V / 0.5 A = 10 Ω
    // R_ext = 10 − 1 − 2 − 0.5 = 6.5 Ω
    const r = externalResistorForTarget({
      qgd: 10e-9, targetTime: 20e-9, vDrive: 10, vPlateau: 5,
      driver: 1, internal: 2, trace: 0.5,
    })
    expect(r.targetCurrent).toBeCloseTo(0.5, 12)
    expect(r.rTotalTarget).toBeCloseTo(10, 12)
    expect(r.external).toBeCloseTo(6.5, 12)
  })

  it('iç dirençler hedefi aşarsa negatif direnç hatası döner', () => {
    // R_total,target = 10 Ω ama driver + internal = 15 Ω
    const r = externalResistorForTarget({
      qgd: 10e-9, targetTime: 20e-9, vDrive: 10, vPlateau: 5,
      driver: 10, internal: 5,
    })
    expect(r.error).toBe(GD_ERR_NEGATIVE_RESISTANCE)
    expect(r.external).toBeLessThan(0) // sessizce sıfıra kırpılmaz
  })

  it('geçersiz hedef süre hatadır', () => {
    expect(externalResistorForTarget({ qgd: 10e-9, targetTime: 0, vDrive: 10, vPlateau: 5 }).error)
      .toBe(GD_ERR_INVALID)
  })
})

describe('kayıplar', () => {
  it('switching kaybı ½·V·I·(tr+tf)·f', () => {
    expect(switchingLoss({ vds: 400, id: 10, tr: 20e-9, tf: 30e-9, fsw: 100e3 }))
      .toBeCloseTo(0.5 * 400 * 10 * 50e-9 * 100e3, 9)
  })

  it('E_oss verilmişse ½·C·V² yerine o kullanılır', () => {
    expect(cossLoss({ eoss: 5e-6, coss: 1e-9, vds: 400, fsw: 100e3 })).toBeCloseTo(0.5, 9)
    expect(cossLoss({ coss: 1e-9, vds: 400, fsw: 100e3 })).toBeCloseTo(8, 9)
  })

  it('harici direnç kaybı direnç oranıyla dağılır', () => {
    expect(externalResistorLoss({ pGate: 40e-3, external: 6, rTotal: 10 })).toBeCloseTo(24e-3, 12)
  })
})

describe('gateDriverPlan', () => {
  const base = {
    qg: 40e-9, qgd: 10e-9, vDrive: 10, vPlateau: 5, vOff: 0,
    rExtOn: 10, rExtOff: 5, fsw: 100e3,
  }

  it('turn-on ve turn-off ayrı hesaplanır', () => {
    const r = gateDriverPlan(base)
    expect(r.on.current).toBeCloseTo(0.5, 12) // (10−5)/10
    expect(r.off.current).toBeCloseTo(1, 12) // (5−0)/5
    expect(r.off.millerTime).toBeLessThan(r.on.millerTime)
  })

  it('hedef süre verilmezse blok null kalır', () => {
    const r = gateDriverPlan(base)
    expect(r.targetOn).toBeNull()
    expect(r.targetOff).toBeNull()
  })

  it('hedef süre verilirse iki yön için ayrı direnç önerir', () => {
    const r = gateDriverPlan({ ...base, targetOnTime: 20e-9, targetOffTime: 20e-9 })
    expect(r.targetOn.external).toBeCloseTo(10, 12) // 5 V / 0.5 A
    expect(r.targetOff.external).toBeCloseTo(10, 12) // 5 V / 0.5 A
  })

  it('gerilim sıralaması bozuksa hata döner', () => {
    expect(gateDriverPlan({ ...base, vPlateau: 12 }).error).toBe(GD_ERR_INVALID)
    expect(gateDriverPlan({ ...base, vOff: 6 }).error).toBe(GD_ERR_INVALID)
  })

  it('switching kaybı ancak tüm girdiler varsa hesaplanır', () => {
    expect(gateDriverPlan(base).switchingLoss).toBeNull()
    const r = gateDriverPlan({ ...base, vds: 400, id: 10, tr: 20e-9, tf: 30e-9 })
    expect(r.switchingLoss).toBeGreaterThan(0)
  })

  it('driver limitine takılan taraf kendi .error alanında GD_ERR_DRIVER_CURRENT taşır, r.ok true kalır', () => {
    const r = gateDriverPlan({ ...base, driverPeakSource: 0.2 }) // 0.5 A yerine 0.2 A ile sınırlı
    expect(r.ok).toBe(true)
    expect(r.on.driverLimited).toBe(true)
    expect(r.on.error).toBe(GD_ERR_DRIVER_CURRENT)
    expect(r.off.driverLimited).toBe(false)
    expect(r.off.error).toBeUndefined()
  })
})
