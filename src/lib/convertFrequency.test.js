import { describe, it, expect } from 'vitest'
import {
  periodFromFrequency, frequencyFromPeriod,
  angularFromFrequency, frequencyFromAngular,
  convertFrequency,
  SOURCE_FREQUENCY, SOURCE_PERIOD,
  FREQ_ERR_INVALID, FREQ_ERR_NONPOSITIVE, FREQ_ERR_RANGE,
} from './convertFrequency'

describe('f = 1/T ve T = 1/f', () => {
  it('1 kHz → 1 ms', () => {
    expect(periodFromFrequency(1000).period).toBeCloseTo(1e-3, 15)
  })

  it('10 ns → 100 MHz', () => {
    expect(frequencyFromPeriod(1e-8).frequency).toBeCloseTo(1e8, 3)
  })

  it('2.4 GHz → 416.667 ps', () => {
    expect(periodFromFrequency(2.4e9).period).toBeCloseTo(4.166666666666667e-10, 22)
  })

  it('gidiş-dönüş kimliği korunur', () => {
    for (const f of [1, 50, 1000, 32768, 25e6, 1e8, 2.4e9, 6e9]) {
      const T = periodFromFrequency(f).period
      expect(frequencyFromPeriod(T).frequency).toBeCloseTo(f, 6)
    }
  })
})

describe('açısal frekans ω = 2πf', () => {
  it('1 kHz → 6283.185 rad/s', () => {
    expect(angularFromFrequency(1000).omega).toBeCloseTo(6283.185307179586, 9)
  })

  it('100 MHz → 6.2832e8 rad/s', () => {
    expect(angularFromFrequency(1e8).omega).toBeCloseTo(628318530.7179586, 3)
  })

  it('ters dönüşüm f = ω/(2π)', () => {
    expect(frequencyFromAngular(2 * Math.PI * 25e6).frequency).toBeCloseTo(25e6, 6)
  })
})

describe('geçersiz giriş', () => {
  it('sıfır bölme yapmaz, kod döner', () => {
    expect(periodFromFrequency(0).error).toBe(FREQ_ERR_NONPOSITIVE)
    expect(frequencyFromPeriod(0).error).toBe(FREQ_ERR_NONPOSITIVE)
    expect(angularFromFrequency(0).error).toBe(FREQ_ERR_NONPOSITIVE)
  })

  it('negatif değer reddedilir', () => {
    expect(periodFromFrequency(-5).error).toBe(FREQ_ERR_NONPOSITIVE)
    expect(frequencyFromPeriod(-1e-9).error).toBe(FREQ_ERR_NONPOSITIVE)
  })

  it('sayı olmayan giriş reddedilir', () => {
    expect(periodFromFrequency(NaN).error).toBe(FREQ_ERR_INVALID)
    expect(periodFromFrequency(Infinity).error).toBe(FREQ_ERR_INVALID)
    expect(frequencyFromPeriod(undefined).error).toBe(FREQ_ERR_INVALID)
    expect(frequencyFromPeriod('1e-9').error).toBe(FREQ_ERR_INVALID)
  })

  it('sonuç temsil edilemiyorsa sessizce sonsuz dönmez', () => {
    // 1/1e-310 kayan nokta aralığını aşar
    expect(frequencyFromPeriod(1e-310).error).toBe(FREQ_ERR_RANGE)
    expect(angularFromFrequency(1e308).error).toBe(FREQ_ERR_RANGE)
  })
})

describe('convertFrequency', () => {
  it('frekanstan periyot ve açısal frekans', () => {
    const r = convertFrequency({ source: SOURCE_FREQUENCY, value: 1e8 })
    expect(r.frequency).toBe(1e8)
    expect(r.period).toBeCloseTo(1e-8, 18)
    expect(r.omega).toBeCloseTo(628318530.7179586, 3)
  })

  it('periyottan frekans ve açısal frekans', () => {
    const r = convertFrequency({ source: SOURCE_PERIOD, value: 1e-3 })
    expect(r.period).toBe(1e-3)
    expect(r.frequency).toBeCloseTo(1000, 9)
    expect(r.omega).toBeCloseTo(6283.185307179586, 9)
  })

  it('iki yön aynı çifti verir', () => {
    const a = convertFrequency({ source: SOURCE_FREQUENCY, value: 2.4e9 })
    const b = convertFrequency({ source: SOURCE_PERIOD, value: a.period })
    expect(b.frequency).toBeCloseTo(a.frequency, 3)
    expect(b.period).toBe(a.period)
  })

  it('bilinmeyen kaynak ve geçersiz değer hesap yapmaz', () => {
    expect(convertFrequency({ source: 'omega', value: 1 }).error).toBe(FREQ_ERR_INVALID)
    expect(convertFrequency({ source: SOURCE_FREQUENCY, value: 0 }).error).toBe(FREQ_ERR_NONPOSITIVE)
    expect(convertFrequency({ source: SOURCE_PERIOD, value: -1 }).error).toBe(FREQ_ERR_NONPOSITIVE)
  })
})
