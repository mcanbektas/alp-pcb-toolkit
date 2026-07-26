import { describe, it, expect } from 'vitest'
import { ledResistor, LED_ERR_HEADROOM } from './led'

describe('LED seri direnci', () => {
  it('5 V, 2 V Vf, 20 mA → 150 Ω', () => {
    const r = ledResistor({ Vs: 5, Vf: 2, n: 1, I: 0.02 })
    expect(r.R).toBeCloseTo(150, 9)
    expect(r.P).toBeCloseTo(0.06, 9)
  })

  it('seri LED sayısı gerilim düşümünü toplar', () => {
    const r = ledResistor({ Vs: 12, Vf: 2, n: 3, I: 0.02 })
    expect(r.Vled).toBeCloseTo(6, 12)
    expect(r.R).toBeCloseTo(300, 9)
  })

  it('derating nominal güç şartını yükseltir', () => {
    const r = ledResistor({ Vs: 5, Vf: 2, I: 0.02, derating: 0.5 })
    expect(r.Prated).toBeCloseTo(0.12, 9)
  })

  it('yetersiz gerilim farkında hesap yapmaz', () => {
    const r = ledResistor({ Vs: 5, Vf: 3.2, n: 2, I: 0.02 })
    expect(r.error).toBe(LED_ERR_HEADROOM)
    expect(r.R).toBeUndefined()
  })
})
