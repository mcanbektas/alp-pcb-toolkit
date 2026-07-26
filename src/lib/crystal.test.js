import { describe, it, expect } from 'vitest'
import {
  crystalLoad, crystalCapsForLoad,
  CRYSTAL_ERR_STRAY, CRYSTAL_ERR_PIN,
} from './crystal'

describe('kristal yük kapasitesi', () => {
  it('basitleştirilmiş model: C = 2(C_L − C_stray)', () => {
    const r = crystalCapsForLoad({ CL: 12, Cstray: 3 })
    expect(r.C).toBeCloseTo(18, 12)
    expect(r.simplified).toBe(true)
  })

  it('hesaplanan kapasitörler hedef C_L\'yi geri verir', () => {
    const r = crystalCapsForLoad({ CL: 12, Cstray: 3 })
    expect(crystalLoad({ C1: r.C, C2: r.C, Cstray: 3 }).CL).toBeCloseTo(12, 12)
  })

  it('pin kapasitesi dahil edildiğinde harici kapasitör küçülür', () => {
    const r = crystalCapsForLoad({ CL: 12, Cin: 4, Cout: 4, Cstray: 3 })
    expect(r.C).toBeCloseTo(14, 12)
    expect(r.simplified).toBe(false)
    expect(crystalLoad({ C1: r.C, C2: r.C, Cin: 4, Cout: 4, Cstray: 3 }).CL).toBeCloseTo(12, 12)
  })

  it('parazitik kapasite hedefi aşarsa hesap yapmaz', () => {
    expect(crystalCapsForLoad({ CL: 8, Cstray: 10 }).error).toBe(CRYSTAL_ERR_STRAY)
  })

  it('pin kapasitesi hedefi aşarsa hesap yapmaz', () => {
    expect(crystalCapsForLoad({ CL: 6, Cin: 20, Cout: 20 }).error).toBe(CRYSTAL_ERR_PIN)
  })
})
