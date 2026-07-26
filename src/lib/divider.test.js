import { describe, it, expect } from 'vitest'
import {
  voltageDivider, dividerRatio, dividerTolerance, dividerFindings,
  findDividerPair, sweepDivider, outputVoltage,
  DIVIDER_ERR_RANGE, DIVIDER_ERR_NO_PAIR,
} from './divider'

describe('spec §13 Test 6 — yüklü gerilim bölücü', () => {
  const Vin = 12
  const R1 = 27e3
  const R2 = 10e3

  it('yüksüz çıkış ≈ 3.243 V', () => {
    expect(voltageDivider({ Vin, R1, R2 }).Vout).toBeCloseTo(3.243, 3)
  })

  it('100 kΩ yükle R2_eff ≈ 9.091 kΩ', () => {
    expect(voltageDivider({ Vin, R1, R2, RL: 100e3 }).loaded.R2eff).toBeCloseTo(9090.909, 3)
  })

  it('100 kΩ yükle çıkış ≈ 3.023 V', () => {
    expect(voltageDivider({ Vin, R1, R2, RL: 100e3 }).loaded.Vout).toBeCloseTo(3.023, 3)
  })
})

describe('temel bölücü', () => {
  it('yük yokken loaded üretilmez', () => {
    const r = voltageDivider({ Vin: 12, R1: 27e3, R2: 10e3 })
    expect(r.loaded).toBeNull()
    expect(outputVoltage(r)).toBeCloseTo(r.Vout, 12)
  })

  it('güçlerin toplamı kaynaktan çekilen güce eşittir', () => {
    const r = voltageDivider({ Vin: 12, R1: 27e3, R2: 10e3 })
    expect(r.P1 + r.P2).toBeCloseTo(12 * r.Idiv, 12)
  })

  it('R1 + R2 sıfırsa hesap yapmaz', () => {
    expect(voltageDivider({ Vin: 12, R1: 0, R2: 0 }).error).toBeDefined()
  })
})

describe('bölücü oranı ve çift arama', () => {
  it('k ve R1/R2 oranını verir', () => {
    const r = dividerRatio(12, 3)
    expect(r.k).toBeCloseTo(0.25, 12)
    expect(r.ratio).toBeCloseTo(3, 12)
  })

  it('Vout ≥ Vin geçersizdir', () => {
    expect(dividerRatio(5, 5).error).toBe(DIVIDER_ERR_RANGE)
  })

  it('E24 çiftleri hedefe yakın sıralanır', () => {
    const r = findDividerPair({ Vin: 12, Vout: 3.3, series: 'E24', count: 3 })
    expect(r.pairs).toHaveLength(3)
    expect(Math.abs(r.pairs[0].EV)).toBeLessThan(1)
    expect(r.pairs[0].score).toBeLessThanOrEqual(r.pairs[1].score)
  })

  it('tam elde edilebilir oranda hata sıfıra iner', () => {
    // Vin/Vout = 2 → R1 = R2, her seride birebir karşılanır
    const r = findDividerPair({ Vin: 10, Vout: 5, series: 'E24', count: 1 })
    expect(r.pairs[0].R1).toBeCloseTo(r.pairs[0].R2, 9)
    expect(Math.abs(r.pairs[0].EV)).toBeLessThan(1e-9)
  })

  it('raporlanan Vout, çiftin kendi hesabıyla tutarlı', () => {
    const r = findDividerPair({ Vin: 12, Vout: 3.3, series: 'E96', count: 1 })
    const p = r.pairs[0]
    const check = voltageDivider({ Vin: 12, R1: p.R1, R2: p.R2 })
    expect(p.Vout).toBeCloseTo(check.Vout, 12)
    expect(p.EV).toBeCloseTo((100 * (check.Vout - 3.3)) / 3.3, 12)
  })

  it('güç sınırı aşan çiftler işaretlenir', () => {
    const r = findDividerPair({
      Vin: 12, Vout: 3.3, series: 'E24', count: 20,
      min: 10, max: 1e3, maxPowerEach: 0.01,
    })
    const over = r.pairs.filter((p) => p.overPower)
    expect(over.length).toBeGreaterThan(0)
    for (const p of over) expect(Math.max(p.P1, p.P2)).toBeGreaterThan(0.01)
  })

  it('aralıkta standart değer yoksa açık hata döner', () => {
    // E12'de 1.01k–1.09k arasına düşen değer yok (1k altında, 1.2k üstünde)
    const r = findDividerPair({ Vin: 12, Vout: 3.3, series: 'E12', min: 1.01e3, max: 1.09e3 })
    expect(r.error).toBe(DIVIDER_ERR_NO_PAIR)
    expect(r.pairs).toBeUndefined()
  })

  it('ters aralık oran hatası olarak değil, boş sonuç olarak döner', () => {
    expect(findDividerPair({ Vin: 12, Vout: 3.3, min: 1e6, max: 1e3 }).error).toBe(DIVIDER_ERR_NO_PAIR)
  })
})

describe('bölücü toleransı (§3.4)', () => {
  const base = { Vin: 12, R1: 27e3, R2: 10e3 }

  it('tolerans sıfırken üç değer de eşittir', () => {
    const t = dividerTolerance({ ...base })
    expect(t.min).toBeCloseTo(t.nom, 12)
    expect(t.max).toBeCloseTo(t.nom, 12)
    expect(t.spread).toBeCloseTo(0, 12)
  })

  it('worst-case köşe: V_out(maks) = R1 min + R2 maks', () => {
    const t = dividerTolerance({ ...base, tolR1: 1, tolR2: 1 })
    const byHand = voltageDivider({ Vin: 12, R1: 27e3 * 0.99, R2: 10e3 * 1.01 })
    expect(t.max).toBeCloseTo(byHand.Vout, 12)
    expect(t.min).toBeLessThan(t.nom)
    expect(t.max).toBeGreaterThan(t.nom)
  })

  it('Vin toleransı çıkışa doğrudan çarpan olarak geçer', () => {
    const t = dividerTolerance({ ...base, tolVin: 5 })
    expect(t.max).toBeCloseTo(t.nom * 1.05, 12)
    expect(t.min).toBeCloseTo(t.nom * 0.95, 12)
  })

  it('yük altında da köşeleri hesaplar', () => {
    const t = dividerTolerance({ ...base, RL: 100e3, tolR1: 1, tolR2: 1 })
    expect(t.nom).toBeCloseTo(voltageDivider({ ...base, RL: 100e3 }).loaded.Vout, 12)
    expect(t.min).toBeLessThan(t.max)
  })
})

describe('bölücü değerlendirmesi', () => {
  it('ağır yük sertlik kontrolünü düşürür', () => {
    const stiff = dividerFindings({ Vin: 12, R1: 270, R2: 100, RL: 100e3 })
    const soft = dividerFindings({ Vin: 12, R1: 270e3, R2: 100e3, RL: 10e3 })
    const s1 = stiff.findings.find((f) => f.code === 'stiffness')
    const s2 = soft.findings.find((f) => f.code === 'stiffness')
    expect(s1.level).toBe('ok')
    expect(s2.level).toBe('danger')
    expect(s1.ratio).toBeGreaterThan(s2.ratio)
  })

  it('güç sınırı aşıldığında danger döner', () => {
    const r = dividerFindings({ Vin: 12, R1: 100, R2: 100, maxPowerEach: 0.05 })
    expect(r.findings.find((f) => f.code === 'power').level).toBe('danger')
  })

  it('yüksek kaynak empedansı işaretlenir', () => {
    expect(
      dividerFindings({ Vin: 12, R1: 1e6, R2: 1e6 }).findings.find((f) => f.code === 'source-impedance').level,
    ).toBe('danger')
  })

  it('yük yokken yükleme bulguları üretilmez', () => {
    const r = dividerFindings({ Vin: 12, R1: 27e3, R2: 10e3 })
    expect(r.findings.some((f) => f.code === 'loading-error')).toBe(false)
  })

  it('hedef sapması kabul sınırına göre değerlendirilir', () => {
    const ok = dividerFindings({ Vin: 12, R1: 27e3, R2: 10e3, targetVout: 3.3, acceptPct: 2 })
    expect(ok.findings.find((f) => f.code === 'target-error').level).toBe('ok')
    const bad = dividerFindings({ Vin: 12, R1: 27e3, R2: 10e3, targetVout: 5, acceptPct: 2 })
    expect(bad.findings.find((f) => f.code === 'target-error').level).toBe('danger')
  })

  it('bulgular yalnızca kod ve sayı taşır — gösterim biçimi içermez', () => {
    const r = dividerFindings({ Vin: 12, R1: 27e3, R2: 10e3, RL: 10e3 })
    for (const f of r.findings) {
      expect(typeof f.code).toBe('string')
      expect(['ok', 'warn', 'danger']).toContain(f.level)
    }
  })
})

describe('grafik taraması', () => {
  it('R_L taramasında büyük yükte yüksüz çıkışa yakınsar', () => {
    const rows = sweepDivider({ Vin: 12, R1: 27e3, R2: 10e3, RL: null, param: 'RL', from: 100, to: 1e9, steps: 40 })
    const unloaded = voltageDivider({ Vin: 12, R1: 27e3, R2: 10e3 }).Vout
    expect(rows).toHaveLength(40)
    expect(rows[rows.length - 1].y).toBeCloseTo(unloaded, 4)
    expect(rows[0].y).toBeLessThan(unloaded)
  })

  it('tarama monoton artan', () => {
    const rows = sweepDivider({ Vin: 12, R1: 27e3, R2: 10e3, param: 'RL', from: 100, to: 1e8, steps: 30 })
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].y).toBeGreaterThanOrEqual(rows[i - 1].y)
    }
  })

  it('tolerans verilirse her noktada alt/üst sınır üretir', () => {
    const rows = sweepDivider({
      Vin: 12, R1: 27e3, R2: 10e3, param: 'R2', from: 1e3, to: 100e3, steps: 10,
      tol: { tolR1: 1, tolR2: 1, tolVin: 0 },
    })
    for (const p of rows) {
      expect(p.lo).toBeLessThan(p.y)
      expect(p.hi).toBeGreaterThan(p.y)
    }
  })

  it('geçersiz aralıkta boş döner', () => {
    expect(sweepDivider({ Vin: 12, R1: 1, R2: 1, param: 'RL', from: 100, to: 10 })).toEqual([])
  })
})
