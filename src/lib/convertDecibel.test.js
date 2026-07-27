import { describe, it, expect } from 'vitest'
import {
  powerRatioToDb, dbToPowerRatio,
  voltageRatioToDb, dbToVoltageRatio,
  powerRatioFromVoltageRatio, ratiosFromDb,
  wattToDbm, dbmToWatt, rmsVoltage,
  DBM_REF_W, DB_ERR_RATIO, DB_ERR_POWER, DB_ERR_INVALID, DB_ERR_RANGE,
} from './convertDecibel'

describe('güç oranı ↔ dB (spec §11.4)', () => {
  it('oran 1 → 0 dB', () => {
    expect(powerRatioToDb(1).dB).toBeCloseTo(0, 12)
  })

  it('oran 2 → 3.0103 dB (klasik 3 dB kuralı)', () => {
    expect(powerRatioToDb(2).dB).toBeCloseTo(3.0103, 4)
  })

  it('oran 100 → 20 dB, oran 1000 → 30 dB', () => {
    expect(powerRatioToDb(100).dB).toBeCloseTo(20, 12)
    expect(powerRatioToDb(1000).dB).toBeCloseTo(30, 12)
  })

  it('oran 1 altında dB negatiftir — zayıflama', () => {
    expect(powerRatioToDb(0.5).dB).toBeCloseTo(-3.0103, 4)
  })

  it('ters dönüşüm: 10^(G/10)', () => {
    expect(dbToPowerRatio(10).ratio).toBeCloseTo(10, 12)
    expect(dbToPowerRatio(3).ratio).toBeCloseTo(1.995262315, 8)
    expect(dbToPowerRatio(-3).ratio).toBeCloseTo(0.501187234, 8)
  })

  it('gidiş-dönüş kendini korur', () => {
    const back = dbToPowerRatio(powerRatioToDb(37.4).dB)
    expect(back.ratio).toBeCloseTo(37.4, 9)
  })
})

describe('gerilim oranı ↔ dB (empedanslar eşitken)', () => {
  it('oran 10 → 20 dB', () => {
    expect(voltageRatioToDb(10).dB).toBeCloseTo(20, 12)
  })

  it('oran 2 → 6.0206 dB', () => {
    expect(voltageRatioToDb(2).dB).toBeCloseTo(6.0206, 4)
  })

  it('aynı oranda gerilim dB değeri güç dB değerinin iki katıdır', () => {
    expect(voltageRatioToDb(7).dB).toBeCloseTo(2 * powerRatioToDb(7).dB, 12)
  })

  it('ters dönüşüm: 10^(G/20)', () => {
    expect(dbToVoltageRatio(20).ratio).toBeCloseTo(10, 12)
    expect(dbToVoltageRatio(6).ratio).toBeCloseTo(1.995262315, 8)
    expect(dbToVoltageRatio(-20).ratio).toBeCloseTo(0.1, 12)
  })

  it('güç oranı gerilim oranının karesidir', () => {
    const p = powerRatioFromVoltageRatio(2)
    expect(p.powerRatio).toBeCloseTo(4, 12)
    // 20·log10(2) ile 10·log10(4) aynı dB değerini verir
    expect(powerRatioToDb(p.powerRatio).dB).toBeCloseTo(voltageRatioToDb(2).dB, 12)
  })

  it('ratiosFromDb iki oranı tutarlı üretir', () => {
    const r = ratiosFromDb(12)
    expect(r.powerRatio).toBeCloseTo(15.848931925, 8)
    expect(r.voltageRatio).toBeCloseTo(3.981071706, 8)
    expect(r.voltageRatio * r.voltageRatio).toBeCloseTo(r.powerRatio, 9)
  })
})

describe('oran ≤ 0 — logaritma tanımsız', () => {
  it('sıfır oran hata kodu döner', () => {
    expect(powerRatioToDb(0).error).toBe(DB_ERR_RATIO)
    expect(voltageRatioToDb(0).error).toBe(DB_ERR_RATIO)
    expect(powerRatioFromVoltageRatio(0).error).toBe(DB_ERR_RATIO)
  })

  it('negatif oran hata kodu döner', () => {
    expect(powerRatioToDb(-2).error).toBe(DB_ERR_RATIO)
    expect(voltageRatioToDb(-0.5).error).toBe(DB_ERR_RATIO)
  })

  it('sonlu olmayan giriş ayrı kodla reddedilir', () => {
    expect(powerRatioToDb(NaN).error).toBe(DB_ERR_INVALID)
    expect(voltageRatioToDb(Infinity).error).toBe(DB_ERR_INVALID)
    expect(dbToPowerRatio(NaN).error).toBe(DB_ERR_INVALID)
    expect(dbToVoltageRatio(NaN).error).toBe(DB_ERR_INVALID)
  })

  it('hata dönüşünde sayısal alan üretilmez', () => {
    expect(powerRatioToDb(0).dB).toBeUndefined()
  })
})

describe('dBm — 1 mW referansına göre mutlak seviye', () => {
  it('1 mW = 0 dBm', () => {
    expect(wattToDbm(DBM_REF_W).dBm).toBeCloseTo(0, 12)
  })

  it('1 W = 30 dBm, 1 µW = −30 dBm', () => {
    expect(wattToDbm(1).dBm).toBeCloseTo(30, 12)
    expect(wattToDbm(1e-6).dBm).toBeCloseTo(-30, 12)
  })

  it('100 mW = 20 dBm', () => {
    expect(wattToDbm(0.1).dBm).toBeCloseTo(20, 12)
    expect(wattToDbm(0.1).mW).toBeCloseTo(100, 9)
  })

  it('ters dönüşüm: mW ve W birlikte tutarlı', () => {
    const a = dbmToWatt(30)
    expect(a.mW).toBeCloseTo(1000, 9)
    expect(a.W).toBeCloseTo(1, 12)

    const b = dbmToWatt(0)
    expect(b.mW).toBeCloseTo(1, 12)
    expect(b.W).toBeCloseTo(1e-3, 15)

    const c = dbmToWatt(-10)
    expect(c.mW).toBeCloseTo(0.1, 12)
    expect(c.W).toBeCloseTo(1e-4, 15)
  })

  it('P_W = 10^((dBm−30)/10) ile P_mW/1000 aynı sonucu verir', () => {
    const r = dbmToWatt(17)
    expect(r.W).toBeCloseTo(r.mW * DBM_REF_W, 12)
  })

  it('gidiş-dönüş kendini korur', () => {
    expect(dbmToWatt(wattToDbm(0.0347).dBm).W).toBeCloseTo(0.0347, 9)
  })

  it('sıfır ve negatif güç reddedilir — 0 W için dBm tanımsız', () => {
    expect(wattToDbm(0).error).toBe(DB_ERR_POWER)
    expect(wattToDbm(-1e-3).error).toBe(DB_ERR_POWER)
  })
})

describe('seviyenin RMS gerilim karşılığı (spec §9.4)', () => {
  it('0 dBm, 50 Ω üzerinde ≈ 223.6 mV RMS', () => {
    const v = rmsVoltage(dbmToWatt(0).W, 50)
    expect(v.V).toBeCloseTo(0.2236068, 6)
  })

  it('30 dBm, 50 Ω üzerinde ≈ 7.071 V RMS', () => {
    const v = rmsVoltage(dbmToWatt(30).W, 50)
    expect(v.V).toBeCloseTo(7.0710678, 6)
  })

  it('gerilim iki katına çıkınca güç 6.02 dB artar', () => {
    const a = rmsVoltage(1e-3, 50).V
    const b = rmsVoltage(4e-3, 50).V
    expect(b / a).toBeCloseTo(2, 12)
    expect(voltageRatioToDb(b / a).dB).toBeCloseTo(6.0206, 4)
  })

  it('geçersiz güç ve empedans reddedilir', () => {
    expect(rmsVoltage(0, 50).error).toBe(DB_ERR_POWER)
    expect(rmsVoltage(1e-3, 0).error).toBe(DB_ERR_INVALID)
    expect(rmsVoltage(1e-3, -50).error).toBe(DB_ERR_INVALID)
  })
})

describe('taşma — sonuç kayan nokta aralığının dışına çıkınca hata kodu', () => {
  // Sınır 10^308 civarındadır: 10^(G/10) yaklaşık G = 3082.5 dB'de,
  // 10^(G/20) yaklaşık G = 6165 dB'de taşar.

  it('sınırın altındaki sonlu girişte davranış değişmez', () => {
    const p = dbToPowerRatio(3000)
    expect(p.error).toBeUndefined()
    expect(p.ratio).toBeCloseTo(1e300, -290)
    expect(Number.isFinite(p.ratio)).toBe(true)

    const v = dbToVoltageRatio(6000)
    expect(v.error).toBeUndefined()
    expect(Number.isFinite(v.ratio)).toBe(true)

    const w = dbmToWatt(3000)
    expect(w.error).toBeUndefined()
    expect(Number.isFinite(w.mW)).toBe(true)
    expect(Number.isFinite(w.W)).toBe(true)
  })

  it('günlük değerler etkilenmez', () => {
    expect(dbToPowerRatio(10).ratio).toBeCloseTo(10, 12)
    expect(dbToVoltageRatio(20).ratio).toBeCloseTo(10, 12)
    expect(dbmToWatt(30).W).toBeCloseTo(1, 12)
    expect(dbToPowerRatio(0).error).toBeUndefined()
    expect(dbToVoltageRatio(0).error).toBeUndefined()
    expect(dbmToWatt(0).error).toBeUndefined()
  })

  it('aşırı kazanç ve seviye aralık koduyla reddedilir', () => {
    expect(dbToPowerRatio(3100).error).toBe(DB_ERR_RANGE)
    expect(dbToVoltageRatio(6200).error).toBe(DB_ERR_RANGE)
    expect(dbmToWatt(3200).error).toBe(DB_ERR_RANGE)
  })

  it('W taşarken mW sonlu kalsa bile hata döner', () => {
    // 10^(dBm/10) 3082.5 dB'de, 10^((dBm−30)/10) 3112.5 dB'de taşar
    expect(dbmToWatt(3100).error).toBe(DB_ERR_RANGE)
  })

  it('gerilim oranının karesi taşarsa hata döner', () => {
    expect(powerRatioFromVoltageRatio(1e200).error).toBe(DB_ERR_RANGE)
    expect(powerRatioFromVoltageRatio(1e150).error).toBeUndefined()
  })

  it('mW karşılığı taşan güç aralık koduyla reddedilir', () => {
    expect(wattToDbm(1e306).error).toBe(DB_ERR_RANGE)
    expect(wattToDbm(1e300).error).toBeUndefined()
  })

  it('RMS gerilim taşarsa hata döner', () => {
    expect(rmsVoltage(1e300, 1e300).error).toBe(DB_ERR_RANGE)
  })

  it('ratiosFromDb taşmayı aynı kodla iletir', () => {
    expect(ratiosFromDb(3100).error).toBe(DB_ERR_RANGE)
    expect(ratiosFromDb(100).error).toBeUndefined()
  })

  it('hata dönüşünde sayısal alan üretilmez — Infinity kullanıcıya sızmaz', () => {
    const r = dbToPowerRatio(3100)
    expect(r.ratio).toBeUndefined()
    expect(r.dB).toBeUndefined()
    expect(dbmToWatt(3200).W).toBeUndefined()
    expect(dbmToWatt(3200).mW).toBeUndefined()
  })
})
