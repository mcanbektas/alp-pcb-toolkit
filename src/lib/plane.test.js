import { describe, it, expect } from 'vitest'
import {
  sheetResistance, stripResistance, powerPlane, parallelTraces, equivalentSingleWidth,
  PLANE_ERR_INVALID,
} from './plane'
import { RHO_CU_20 } from './units'

const OZ1 = 35e-6 // 1 oz bakır, metre

describe('kare direnci', () => {
  it('R_□ = ρ / t', () => {
    expect(sheetResistance(OZ1, 20)).toBeCloseTo(RHO_CU_20 / OZ1, 12)
  })

  it('1 oz bakır için yaklaşık 0.49 mΩ/□', () => {
    expect(sheetResistance(OZ1, 20) * 1000).toBeCloseTo(0.4926, 3)
  })

  it('sıcaklık arttıkça büyür', () => {
    expect(sheetResistance(OZ1, 85)).toBeGreaterThan(sheetResistance(OZ1, 20))
  })
})

describe('şerit direnci', () => {
  it('kare sayısıyla ölçeklenir', () => {
    const a = stripResistance({ L: 0.1, W: 0.01, t: OZ1 })
    expect(a.squares).toBeCloseTo(10, 12)
    expect(a.R).toBeCloseTo(a.Rsheet * 10, 12)
  })

  it('genişlik iki katına çıkınca direnç yarılanır', () => {
    const a = stripResistance({ L: 0.1, W: 0.01, t: OZ1 })
    const b = stripResistance({ L: 0.1, W: 0.02, t: OZ1 })
    expect(b.R).toBeCloseTo(a.R / 2, 12)
  })

  it('geçersiz geometride hesap yapmaz', () => {
    expect(stripResistance({ L: 0, W: 0.01, t: OZ1 }).error).toBe(PLANE_ERR_INVALID)
  })
})

describe('güç düzlemi', () => {
  const base = { L: 0.05, Wavg: 0.02, Wneck: 0.005, t: OZ1, I: 10 }

  it('boyun direnci ortalamadan yüksektir', () => {
    const r = powerPlane(base)
    expect(r.neck.R).toBeGreaterThan(r.average.R)
    // Genişlik oranı 4 → direnç oranı 4
    expect(r.neckFactor).toBeCloseTo(4, 9)
  })

  it('gerilim düşümü ve güç kaybı akımla tutarlı', () => {
    const r = powerPlane(base)
    expect(r.neck.Vdrop).toBeCloseTo(10 * r.neck.R, 12)
    expect(r.neck.Ploss).toBeCloseTo(100 * r.neck.R, 12)
  })

  it('besleme gerilimi verilirse yüzde düşüm hesaplanır', () => {
    const r = powerPlane({ ...base, Vsupply: 5 })
    expect(r.neck.pct).toBeCloseTo((100 * r.neck.Vdrop) / 5, 12)
  })

  it('boyun ortalamadan geniş olamaz', () => {
    expect(powerPlane({ ...base, Wneck: 0.05 }).error).toBe(PLANE_ERR_INVALID)
  })
})

describe('paralel yollar', () => {
  it('eşit yollarda akım eşit paylaşılır', () => {
    const r = parallelTraces({
      traces: [
        { L: 0.1, W: 1e-3, t: OZ1 },
        { L: 0.1, W: 1e-3, t: OZ1 },
      ],
      I: 2,
    })
    expect(r.branches[0].I).toBeCloseTo(1, 12)
    expect(r.branches[1].I).toBeCloseTo(1, 12)
    expect(r.imbalance).toBeCloseTo(0, 12)
  })

  it('eşdeğer direnç tek yolun yarısıdır', () => {
    const single = stripResistance({ L: 0.1, W: 1e-3, t: OZ1 })
    const r = parallelTraces({
      traces: [
        { L: 0.1, W: 1e-3, t: OZ1 },
        { L: 0.1, W: 1e-3, t: OZ1 },
      ],
      I: 2,
    })
    expect(r.Req).toBeCloseTo(single.R / 2, 12)
  })

  it('geniş yol daha çok akım çeker', () => {
    const r = parallelTraces({
      traces: [
        { L: 0.1, W: 1e-3, t: OZ1 },
        { L: 0.1, W: 3e-3, t: OZ1 },
      ],
      I: 4,
    })
    expect(r.branches[1].I).toBeCloseTo(3, 9)
    expect(r.branches[0].I).toBeCloseTo(1, 9)
    expect(r.imbalance).toBeGreaterThan(0)
  })

  it('akım payları toplamı bire eşittir', () => {
    const r = parallelTraces({
      traces: [
        { L: 0.05, W: 1e-3, t: OZ1 },
        { L: 0.1, W: 2e-3, t: OZ1 },
        { L: 0.2, W: 0.5e-3, t: OZ1 },
      ],
      I: 5,
    })
    expect(r.branches.reduce((a, b) => a + b.share, 0)).toBeCloseTo(1, 12)
    expect(r.branches.reduce((a, b) => a + b.I, 0)).toBeCloseTo(5, 12)
  })

  it('en yüksek akım yoğunluklu kol işaretlenir', () => {
    const r = parallelTraces({
      traces: [
        { L: 0.1, W: 1e-3, t: OZ1 },
        { L: 0.1, W: 3e-3, t: OZ1 },
      ],
      I: 4,
    })
    // Dar kol daha az akım taşır ama kesiti çok daha küçük olduğundan
    // yoğunluk ikisinde de eşittir; eşitlikte ilk kol seçilir
    expect(r.hottest.J).toBeCloseTo(r.branches[0].J, 6)
  })

  it('boş liste reddedilir', () => {
    expect(parallelTraces({ traces: [], I: 1 }).error).toBe(PLANE_ERR_INVALID)
  })
})

describe('eşdeğer tek yol genişliği', () => {
  it('paralel eşdeğeri tek yola çevirir', () => {
    const traces = [
      { L: 0.1, W: 1e-3, t: OZ1 },
      { L: 0.1, W: 1e-3, t: OZ1 },
    ]
    const r = parallelTraces({ traces, I: 2 })
    const W = equivalentSingleWidth({ Req: r.Req, L: 0.1, t: OZ1 })
    expect(W).toBeCloseTo(2e-3, 9)
  })
})
