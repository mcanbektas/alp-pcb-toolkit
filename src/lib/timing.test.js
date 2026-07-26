import { describe, it, expect } from 'vitest'
import { rcTime, rlTime, chargeVoltage, dischargeVoltage } from './timing'

describe('zaman sabitleri', () => {
  it('RC: τ = RC ve 1τ\'da %63.2', () => {
    const r = rcTime({ R: 1000, C: 1e-6 })
    expect(r.tau).toBeCloseTo(1e-3, 15)
    expect(r.t[0].pct).toBeCloseTo(63.212, 3)
    expect(r.t[4].pct).toBeCloseTo(99.326, 3)
  })

  it('RL: τ = L/R', () => {
    expect(rlTime({ R: 10, L: 1e-3 }).tau).toBeCloseTo(1e-4, 15)
  })

  it('%10–90 yükselme süresi τ·ln(9)', () => {
    const r = rcTime({ R: 1000, C: 1e-6 })
    expect(r.riseTime1090).toBeCloseTo(r.tau * Math.log(9), 15)
  })

  it('şarj eğrisi 1τ\'da %63.2\'ye ulaşır', () => {
    expect(chargeVoltage(5, 1e-3, 1e-3)).toBeCloseTo(5 * 0.63212, 4)
  })

  it('deşarj eğrisi 1τ\'da %36.8\'e iner', () => {
    expect(dischargeVoltage(5, 1e-3, 1e-3)).toBeCloseTo(5 * 0.36788, 4)
  })

  it('geçersiz girişte hesap yapmaz', () => {
    expect(rcTime({ R: 0, C: 1e-6 }).error).toBe('invalid')
    expect(rlTime({ R: 10, L: -1 }).error).toBe('invalid')
  })
})
