import { describe, it, expect } from 'vitest'
import {
  barrelOuterDiameter, barrelArea, viaElectrical,
  annularRing, aspectRatio, viaInductance, viaCapacitance, viaDiscontinuity,
  thermalVia, thermalViaCount,
  VIA_ERR_INVALID,
} from './via'

const mm = (x) => x * 1e-3

describe('spec §13 Test 2 — via direnci', () => {
  const Df = mm(0.30)
  const tp = mm(0.025)
  const H = mm(1.60)

  it('dış çap 0.35 mm', () => {
    expect(barrelOuterDiameter(Df, tp) * 1e3).toBeCloseTo(0.35, 12)
  })

  it('barrel kesit alanı ≈ 0.0255 mm²', () => {
    expect(barrelArea(Df, tp).area * 1e6).toBeCloseTo(0.0255, 4)
  })

  it('20 °C via direnci ≈ 1.08 mΩ', () => {
    const r = viaElectrical({ Df, tp, H, I: 1, T: 20 })
    expect(r.R * 1000).toBeCloseTo(1.08, 2)
  })
})

describe('barrel kesiti', () => {
  it('ince kaplama yaklaşımı alanı küçük gösterir — konservatiftir', () => {
    // A_tam = π·t_p·(D_f + t_p),  A_ince = π·D_f·t_p  →  fark tam olarak π·t_p²
    const Df = mm(0.3)
    const tp = mm(0.025)
    const b = barrelArea(Df, tp)
    expect(b.thinApprox).toBeLessThan(b.area)
    expect(b.thinErrorPct).toBeLessThan(0)
    expect(b.area - b.thinApprox).toBeCloseTo(Math.PI * tp * tp, 15)
  })

  it('kaplama inceldikçe yaklaşım gerçeğe yaklaşır', () => {
    const thick = barrelArea(mm(0.3), mm(0.05))
    const thin = barrelArea(mm(0.3), mm(0.005))
    expect(Math.abs(thin.thinErrorPct)).toBeLessThan(Math.abs(thick.thinErrorPct))
  })

  it('geçersiz geometri reddedilir', () => {
    expect(barrelArea(0, mm(0.025)).error).toBe(VIA_ERR_INVALID)
  })
})

describe('via elektriksel', () => {
  const base = { Df: mm(0.3), tp: mm(0.025), H: mm(1.6), I: 3 }

  it('gerilim düşümü ve güç akımla tutarlı', () => {
    const r = viaElectrical(base)
    expect(r.Vdrop).toBeCloseTo(3 * r.R, 15)
    expect(r.Ploss).toBeCloseTo(9 * r.R, 15)
  })

  it('sıcaklık direnci artırır', () => {
    const cold = viaElectrical({ ...base, T: 20 })
    const hot = viaElectrical({ ...base, T: 85 })
    expect(hot.R).toBeGreaterThan(cold.R)
  })

  it('akım kısıtından via sayısı', () => {
    const r = viaElectrical({ ...base, IsingleMax: 1 })
    expect(r.Ncurrent).toBe(3)
    expect(r.N).toBe(3)
  })

  it('gerilim düşümü kısıtından via sayısı', () => {
    const single = viaElectrical(base)
    // Tek via düşümünün üçte birini hedefle → 3 via gerekir
    const limit = single.Vdrop / 3
    const r = viaElectrical({ ...base, VdropMax: limit })
    expect(r.Nvoltage).toBe(3)
  })

  it('en kısıtlayıcı şart belirleyicidir', () => {
    const single = viaElectrical(base)
    const r = viaElectrical({ ...base, IsingleMax: 1, VdropMax: single.Vdrop / 5, Nmin: 2 })
    expect(r.N).toBe(5)
  })

  it('paralel via direnci N ile bölünür', () => {
    const r = viaElectrical({ ...base, IsingleMax: 1 })
    expect(r.Rparallel).toBeCloseTo(r.R / 3, 15)
    expect(r.IperVia).toBeCloseTo(1, 12)
  })
})

describe('annular ring', () => {
  it('nominal ring pad ve delik farkının yarısıdır', () => {
    const r = annularRing({ Dpad: mm(0.6), Ddrill: mm(0.3) })
    expect(r.nominal * 1e3).toBeCloseTo(0.15, 12)
  })

  it('toleranslar ringi tek yönde yer', () => {
    const r = annularRing({ Dpad: mm(0.6), Ddrill: mm(0.3), positionTol: mm(0.05), etchTol: mm(0.025) })
    expect(r.worst * 1e3).toBeCloseTo(0.075, 12)
    expect(r.breakout).toBe(false)
  })

  it('ring tükenirse breakout işaretlenir', () => {
    const r = annularRing({ Dpad: mm(0.45), Ddrill: mm(0.3), positionTol: mm(0.1) })
    expect(r.worst).toBeLessThanOrEqual(0)
    expect(r.breakout).toBe(true)
  })

  it('pad delikten küçükse hesap yapılmaz', () => {
    expect(annularRing({ Dpad: mm(0.3), Ddrill: mm(0.3) }).error).toBe(VIA_ERR_INVALID)
  })
})

describe('aspect ratio', () => {
  it('kart kalınlığı / delik çapı', () => {
    const r = aspectRatio({ boardThickness: mm(1.6), diameter: mm(0.2) })
    expect(r.ratio).toBeCloseTo(8, 12)
    expect(r.basis).toBe('drill')
  })

  it('kullanılan tanım sonuçla birlikte döner', () => {
    expect(aspectRatio({ boardThickness: mm(1.6), diameter: mm(0.2), basis: 'finished' }).basis)
      .toBe('finished')
  })
})

describe('via parazitikleri', () => {
  it('endüktans uzunlukla artar', () => {
    const short = viaInductance({ H: mm(0.8), D: mm(0.3) })
    const long = viaInductance({ H: mm(1.6), D: mm(0.3) })
    expect(long).toBeGreaterThan(short)
  })

  it('1.6 mm / 0.3 mm via ≈ 1.4 nH', () => {
    // L = 0.2·1.6·[ln(4·1.6/0.3) + 1]
    const expected = 0.2 * 1.6 * (Math.log((4 * 1.6) / 0.3) + 1)
    expect(viaInductance({ H: mm(1.6), D: mm(0.3) }) * 1e9).toBeCloseTo(expected, 9)
  })

  it('antipad daraldıkça kapasite artar', () => {
    const wide = viaCapacitance({ H: mm(1.6), Dpad: mm(0.6), Dantipad: mm(1.2), epsR: 4.2 })
    const narrow = viaCapacitance({ H: mm(1.6), Dpad: mm(0.6), Dantipad: mm(0.8), epsR: 4.2 })
    expect(narrow).toBeGreaterThan(wide)
  })

  it('antipad pad\'den küçükse hesap yapılmaz', () => {
    expect(viaCapacitance({ H: mm(1.6), Dpad: mm(0.6), Dantipad: mm(0.5), epsR: 4.2 })).toBeNaN()
  })

  it('parazitiklerden süreksizlik empedansı', () => {
    const d = viaDiscontinuity({ L: 1.4e-9, C: 0.3e-12 })
    expect(d.Z).toBeCloseTo(Math.sqrt(1.4e-9 / 0.3e-12), 6)
    expect(d.delay).toBeGreaterThan(0)
  })
})

describe('termal via dizisi', () => {
  const base = { Df: mm(0.3), tp: mm(0.025), H: mm(1.6) }

  it('tek via termal direnci pozitif', () => {
    const r = thermalVia({ ...base, N: 1 })
    expect(r.Rsingle).toBeGreaterThan(0)
    expect(r.Rarray).toBeCloseTo(r.Rsingle, 12)
  })

  it('N via paralel direnci N ile böler', () => {
    const r = thermalVia({ ...base, N: 9 })
    expect(r.Rarray).toBeCloseTo(r.Rsingle / 9, 12)
    expect(r.improvementVsOne).toBeCloseTo(9, 12)
  })

  it('bakır dolgu alanı artırır, direnci düşürür', () => {
    const open = thermalVia({ ...base, N: 1 })
    const filled = thermalVia({ ...base, N: 1, filled: true })
    expect(filled.area).toBeGreaterThan(open.area)
    expect(filled.Rsingle).toBeLessThan(open.Rsingle)
  })

  it('sıcaklık farkı verilirse iletilen ısı hesaplanır', () => {
    const r = thermalVia({ ...base, N: 9, deltaT: 20 })
    expect(r.Q).toBeCloseTo(20 / r.Rarray, 9)
  })

  it('sıcaklık farkı yoksa ısı akısı üretilmez', () => {
    expect(thermalVia({ ...base, N: 4 }).Q).toBeNull()
  })

  it('hedef ısı için via sayısı', () => {
    const one = thermalVia({ ...base, N: 1 })
    const need = thermalViaCount({ ...base, deltaT: 20, Q: 20 / (one.Rsingle / 4) })
    expect(need.N).toBe(4)
  })
})
