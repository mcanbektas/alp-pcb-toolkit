import { describe, it, expect } from 'vitest'
import {
  parallelResistances, bitTime, sampleTime, cableDelay, roundTripDelay, fixedDelay,
  maxBusLength, splitTermination, canPhysicalLayer,
  differentialLoad, biasCurrent, idleDifferentialVoltage, biasResistorForTarget,
  biasPower, maxNodes, rs485PhysicalLayer,
  BUS_ERR_INVALID, BUS_ERR_FIXED_DELAY, BUS_ERR_DELAY_BUDGET, BUS_ERR_BIAS_UNREACHABLE,
} from './busPhysical'

describe('zaman temelleri', () => {
  it('1 Mbps için bit süresi 1 µs', () => {
    expect(bitTime({ bitrate: 1e6 })).toBeCloseTo(1e-6, 15)
  })

  it('sample point bit süresinin oranıdır', () => {
    expect(sampleTime({ bitrate: 1e6, samplePoint: 0.875 })).toBeCloseTo(0.875e-6, 15)
  })

  it('sample point 0–1 dışındaysa NaN', () => {
    expect(Number.isNaN(sampleTime({ bitrate: 1e6, samplePoint: 1.5 }))).toBe(true)
    expect(Number.isNaN(sampleTime({ bitrate: 1e6, samplePoint: 0 }))).toBe(true)
  })

  it('gidiş-dönüş tek yönün iki katı', () => {
    expect(cableDelay({ length: 40, delayPerMeter: 5e-9 })).toBeCloseTo(200e-9, 15)
    expect(roundTripDelay({ length: 40, delayPerMeter: 5e-9 })).toBeCloseTo(400e-9, 15)
  })

  it('sabit gecikme beş bileşenin toplamıdır', () => {
    const t = fixedDelay({
      controller: 10e-9, tx: 60e-9, rx: 60e-9, isolatorTx: 30e-9, isolatorRx: 30e-9,
    })
    expect(t).toBeCloseTo(190e-9, 15)
  })
})

describe('maksimum bus uzunluğu', () => {
  it('sabit gecikmeyi ÇIKARIP ikiye böler', () => {
    // (875 ns − 200 ns) / (2 × 5 ns/m) = 67.5 m
    const r = maxBusLength({ tSample: 875e-9, tFixed: 200e-9, delayPerMeter: 5e-9 })
    expect(r.length).toBeCloseTo(67.5, 9)
  })

  it('sabit gecikme sample point u aşarsa açık hata döner', () => {
    // Kablo sıfır uzunlukta olsa bile bütçe yetersiz.
    const r = maxBusLength({ tSample: 875e-9, tFixed: 1e-6, delayPerMeter: 5e-9 })
    expect(r.error).toBe(BUS_ERR_FIXED_DELAY)
    expect(r.length).toBeUndefined()
  })

  it('tam eşitlikte de hata döner', () => {
    expect(maxBusLength({ tSample: 875e-9, tFixed: 875e-9, delayPerMeter: 5e-9 }).error)
      .toBe(BUS_ERR_FIXED_DELAY)
  })
})

describe('CAN terminasyonu', () => {
  it('iki 120 Ω paralelde 60 Ω görünür', () => {
    expect(parallelResistances([120, 120])).toBeCloseTo(60, 12)
  })

  it('split terminasyon common-mode kolu ve kesim frekansı', () => {
    const r = splitTermination({ r1: 60, r2: 60, cSplit: 4.7e-9 })
    expect(r.total).toBeCloseTo(120, 12)
    expect(r.commonMode).toBeCloseTo(30, 12)
    expect(r.cutoff / 1e6).toBeCloseTo(1.129, 2)
  })

  it('kondansatör verilmezse kesim frekansı null', () => {
    expect(splitTermination({ r1: 60, r2: 60 }).cutoff).toBeNull()
  })
})

describe('canPhysicalLayer', () => {
  const base = {
    bitrate: 1e6, samplePoint: 0.875, busLength: 40, delayPerMeter: 5e-9,
    controllerDelay: 10e-9, txDelay: 60e-9, rxDelay: 60e-9,
  }

  it('gecikme bütçesini ve marjı verir', () => {
    const r = canPhysicalLayer(base)
    expect(r.fixedDelay).toBeCloseTo(130e-9, 15)
    expect(r.roundTrip).toBeCloseTo(400e-9, 15)
    expect(r.loopDelay).toBeCloseTo(530e-9, 15)
    expect(r.margin).toBeCloseTo(345e-9, 15)
    expect(r.budgetExceeded).toBe(false)
  })

  it('bütçe aşılınca hata kodu taşır', () => {
    const r = canPhysicalLayer({ ...base, busLength: 200 })
    expect(r.budgetExceeded).toBe(true)
    expect(r.budgetError).toBe(BUS_ERR_DELAY_BUDGET)
  })

  it('maksimum uzunluk sabit gecikmeden türer', () => {
    const r = canPhysicalLayer(base)
    expect(r.maxLength).toBeCloseTo((875e-9 - 130e-9) / 1e-8, 6)
  })

  it('izolatör gecikmesi bütçeyi daraltır', () => {
    const a = canPhysicalLayer(base)
    const b = canPhysicalLayer({ ...base, isolatorTxDelay: 100e-9, isolatorRxDelay: 100e-9 })
    expect(b.maxLength).toBeLessThan(a.maxLength)
  })

  it('stub gecikmesi ve yükselme süresi oranı', () => {
    const r = canPhysicalLayer({ ...base, stubLength: 0.3, riseTime: 20e-9 })
    expect(r.stub.roundTrip).toBeCloseTo(3e-9, 15)
    expect(r.stub.ratio).toBeCloseTo(0.15, 9)
  })

  it('geçersiz bitrate hatadır', () => {
    expect(canPhysicalLayer({ ...base, bitrate: 0 }).error).toBe(BUS_ERR_INVALID)
  })
})

describe('RS-485 yük ve bias', () => {
  it('receiver yükü diferansiyel yükü düşürür', () => {
    expect(differentialLoad({ terminations: [120, 120] })).toBeCloseTo(60, 12)
    expect(differentialLoad({ terminations: [120, 120], receiverEq: 12e3 }))
      .toBeCloseTo((60 * 12e3) / (60 + 12e3), 9)
  })

  it('bias akımı seri zincirden geçer', () => {
    // 5 V / (470 + 60 + 470) = 5 mA
    expect(biasCurrent({ vcc: 5, rPullUp: 470, rAB: 60, rPullDown: 470 }))
      .toBeCloseTo(5e-3, 12)
  })

  it('idle gerilim akım × diferansiyel yük', () => {
    expect(idleDifferentialVoltage({ vcc: 5, rPullUp: 470, rAB: 60, rPullDown: 470 }))
      .toBeCloseTo(0.3, 12)
  })

  it('hedef idle gerilimden bias direnci', () => {
    const r = biasResistorForTarget({ vcc: 5, rAB: 60, target: 0.3 })
    expect(r.ideal).toBeCloseTo(470, 9)
    expect(r.standard).toBe(470)
    // Standart dirençle hesap YENİDEN yapılır
    expect(r.achieved).toBeCloseTo(0.3, 9)
  })

  it('besleme geriliminden büyük hedef ulaşılamaz', () => {
    expect(biasResistorForTarget({ vcc: 5, rAB: 60, target: 5 }).error)
      .toBe(BUS_ERR_BIAS_UNREACHABLE)
    expect(biasResistorForTarget({ vcc: 5, rAB: 60, target: 6 }).error)
      .toBe(BUS_ERR_BIAS_UNREACHABLE)
  })

  it('bias direnç gücü I²R', () => {
    expect(biasPower({ current: 5e-3, resistance: 470 })).toBeCloseTo(11.75e-3, 12)
  })

  it('unit load düğüm sayısını belirler', () => {
    expect(maxNodes({ unitLoad: 1 })).toBe(32)
    expect(maxNodes({ unitLoad: 0.5 })).toBe(64)
    expect(maxNodes({ unitLoad: 0.125 })).toBe(256)
  })
})

describe('rs485PhysicalLayer', () => {
  it('bias verilince akım, gerilim ve eşik marjı döner', () => {
    const r = rs485PhysicalLayer({
      vcc: 5, terminations: [120, 120], rPullUp: 470, rPullDown: 470, receiverThreshold: 0.2,
    })
    expect(r.bias.current).toBeCloseTo(5e-3, 12)
    expect(r.bias.idleVoltage).toBeCloseTo(0.3, 12)
    expect(r.bias.thresholdMargin).toBeCloseTo(0.1, 12)
  })

  it('bias verilmezse blok null kalır', () => {
    const r = rs485PhysicalLayer({ vcc: 5, terminations: [120, 120] })
    expect(r.bias).toBeNull()
  })

  it('hedef verilince direnç önerisi gelir', () => {
    const r = rs485PhysicalLayer({ vcc: 5, terminations: [120, 120], targetIdle: 0.3 })
    expect(r.biasTarget.standard).toBe(470)
  })

  it('geçersiz besleme hatadır', () => {
    expect(rs485PhysicalLayer({ vcc: 0, terminations: [120, 120] }).error).toBe(BUS_ERR_INVALID)
  })
})
