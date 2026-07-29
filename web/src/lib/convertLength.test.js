import { describe, it, expect } from 'vitest'
import {
  convertLength, toMeters, fromMeters, allLengths, roundingComparison,
  nearestCommonMil, unitFactor,
  lengthRange, LEN_MAX_METERS,
  MM_PER_INCH, MM_PER_MIL, MIL_PER_INCH, MIL_PER_MM, MIL_PER_MM_ROUNDED,
  LEN_ERR_UNIT, LEN_ERR_INVALID, LEN_ERR_RANGE,
} from './convertLength'
import { expectErrorShapes } from './errorShape.testkit'

describe('tanım gereği tam sabitler (spec §11.1)', () => {
  it('1 inch = 25.4 mm', () => {
    expect(convertLength(1, 'inch', 'mm').value).toBeCloseTo(25.4, 12)
    expect(MM_PER_INCH).toBe(25.4)
  })

  it('1 mil = 0.001 inch = 0.0254 mm', () => {
    expect(convertLength(1, 'mil', 'inch').value).toBeCloseTo(0.001, 15)
    expect(convertLength(1, 'mil', 'mm').value).toBeCloseTo(0.0254, 15)
    expect(MM_PER_MIL).toBe(0.0254)
    expect(MIL_PER_INCH).toBe(1000)
  })

  it('1 µm = 0.001 mm', () => {
    expect(convertLength(1, 'µm', 'mm').value).toBeCloseTo(0.001, 15)
    expect(convertLength(1, 'mm', 'µm').value).toBeCloseTo(1000, 9)
  })

  it('1 mm = 1/0.0254 mil = 39.37007874… (39.3701 değil)', () => {
    expect(convertLength(1, 'mm', 'mil').value).toBeCloseTo(39.37007874015748, 12)
    expect(MIL_PER_MM).toBeCloseTo(39.37007874015748, 12)
    expect(MIL_PER_MM).not.toBe(MIL_PER_MM_ROUNDED)
  })
})

describe('çift yönlü dönüşüm', () => {
  it('6 mil = 0.1524 mm (tipik yol genişliği)', () => {
    expect(convertLength(6, 'mil', 'mm').value).toBeCloseTo(0.1524, 12)
    expect(convertLength(0.1524, 'mm', 'mil').value).toBeCloseTo(6, 9)
  })

  it('gidiş-dönüş başlangıç değerini verir', () => {
    const mm = convertLength(7, 'mil', 'mm').value
    expect(convertLength(mm, 'mm', 'mil').value).toBeCloseTo(7, 12)
    const m = convertLength(2.5, 'cm', 'm').value
    expect(convertLength(m, 'm', 'cm').value).toBeCloseTo(2.5, 12)
  })

  it('aynı birime dönüşüm değeri değiştirmez', () => {
    expect(convertLength(3.75, 'mm', 'mm').value).toBeCloseTo(3.75, 15)
  })

  it('metre ara adımı doğru: 25.4 mm = 0.0254 m', () => {
    expect(convertLength(25.4, 'mm', 'm').meters).toBeCloseTo(0.0254, 15)
    expect(toMeters(25.4, 'mm')).toBeCloseTo(0.0254, 15)
    expect(fromMeters(0.0254, 'mil')).toBeCloseTo(1000, 9)
  })

  it('bilinmeyen birim sessizce 1 kabul edilmez', () => {
    expect(convertLength(1, 'mm', 'furlong').error).toBe(LEN_ERR_UNIT)
    expect(convertLength(1, 'yard', 'mm').error).toBe(LEN_ERR_UNIT)
    expect(Number.isNaN(unitFactor('furlong'))).toBe(true)
    expect(Number.isNaN(toMeters(1, 'furlong'))).toBe(true)
  })

  it('sonlu olmayan değer reddedilir', () => {
    expect(convertLength(NaN, 'mm', 'mil').error).toBe(LEN_ERR_INVALID)
    expect(convertLength(Infinity, 'mm', 'mil').error).toBe(LEN_ERR_INVALID)
  })
})

describe('kayan nokta aralığının dışına taşma', () => {
  it('sonuç temsil edilemiyorsa Infinity değil aralık hatası döner', () => {
    const r = convertLength(1e308, 'm', 'µm')
    expect(r.error).toBe(LEN_ERR_RANGE)
    expect(r.value).toBeUndefined()
    expect(convertLength(1e306, 'm', 'mil').error).toBe(LEN_ERR_RANGE)
  })

  it('aralık içinde kalan büyük değer hâlâ çevrilir', () => {
    const big = convertLength(1e300, 'm', 'µm')
    expect(big.error).toBeUndefined()
    expect(Number.isFinite(big.value)).toBe(true)
    expect(big.value / 1e306).toBeCloseTo(1, 9)
  })

  it('birim tablosunun bir hanesi taşarsa tablo hiç üretilmez', () => {
    expect(allLengths(1e305)).toBeNull() // µm karşılığı 1e311
    expect(allLengths(1e300)).not.toBeNull()
  })

  it('yuvarlama karşılaştırması NaN fark döndürmez', () => {
    // 1e304 m: iki mil değeri de taşar, fark ∞ − ∞ = NaN olurdu
    expect(roundingComparison(1e304)).toBeNull()
    expect(roundingComparison(1e300).diff).toBeGreaterThan(0)
    expect(Number.isFinite(roundingComparison(1e300).diff)).toBe(true)
  })
})

describe('kullanıcıya söylenen sayısal geçerlilik aralığı', () => {
  it('üst sınır en küçük birimden (µm) türetilir', () => {
    // Number.MAX_VALUE = 1.7976931348623157e308, µm çarpanı 1e-6
    // → sınır 1.7976931348623154e302 m
    expect(LEN_MAX_METERS / 1e302).toBeCloseTo(1.7976931348623154, 12)
    expect(lengthRange().maxMeters).toBe(LEN_MAX_METERS)
    expect(lengthRange().minMeters).toBe(0)
  })

  it('sınır dahildir: tam sınırda tablo ve karşılaştırma hâlâ üretilir', () => {
    expect(allLengths(LEN_MAX_METERS)).not.toBeNull()
    expect(roundingComparison(LEN_MAX_METERS)).not.toBeNull()
    expect(convertLength(LEN_MAX_METERS, 'm', 'µm').error).toBeUndefined()
  })

  it('bir kayan nokta adımı yukarısında µm hanesi taşar', () => {
    const over = LEN_MAX_METERS * (1 + Number.EPSILON)
    expect(over).toBeGreaterThan(LEN_MAX_METERS)
    expect(allLengths(over)).toBeNull()
    expect(convertLength(over, 'm', 'µm').error).toBe(LEN_ERR_RANGE)
  })

  it('aynı sınır mm, mil ve µm karşılıklarıyla tutarlı', () => {
    const g = lengthRange()
    // 1.7976931348623154e302 m → /1e-3 = 1.7976931348623156e305 mm
    expect(g.maxMm / 1e305).toBeCloseTo(1.7976931348623156, 12)
    // → /2.54e-5 = 7.077532027016989e306 mil
    expect(g.maxMil / 1e306).toBeCloseTo(7.077532027016989, 12)
    // → /1e-6 = 1.7976931348623155e308 µm, kayan nokta tavanına oturur
    expect(g.maxUm / 1e308).toBeCloseTo(1.7976931348623155, 12)
    expect(Number.isFinite(g.maxUm)).toBe(true)
  })
})

describe('tüm birimlerdeki karşılık', () => {
  it('1 inch tüm birimlerde tutarlı', () => {
    const u = allLengths(0.0254)
    expect(u.m).toBeCloseTo(0.0254, 15)
    expect(u.cm).toBeCloseTo(2.54, 12)
    expect(u.mm).toBeCloseTo(25.4, 12)
    expect(u.um).toBeCloseTo(25400, 6)
    expect(u.mil).toBeCloseTo(1000, 9)
    expect(u.inch).toBeCloseTo(1, 12)
  })

  it('1 mm tüm birimlerde tutarlı', () => {
    const u = allLengths(0.001)
    expect(u.um).toBeCloseTo(1000, 9)
    expect(u.cm).toBeCloseTo(0.1, 12)
    expect(u.mil).toBeCloseTo(39.37007874015748, 12)
    expect(u.inch).toBeCloseTo(0.03937007874015748, 15)
  })

  it('sıfır uzunluk her birimde sıfırdır', () => {
    const u = allLengths(0)
    expect(u.mm).toBe(0)
    expect(u.mil).toBe(0)
  })

  it('sonlu olmayan giriş null döner', () => {
    expect(allLengths(NaN)).toBeNull()
    expect(allLengths(Infinity)).toBeNull()
  })
})

describe('yuvarlatılmış 39.3701 kuralının sapması', () => {
  it('1 m için tam kural 39370.0787… mil verir', () => {
    const c = roundingComparison(1)
    expect(c.mm).toBeCloseTo(1000, 9)
    expect(c.exact).toBeCloseTo(39370.07874015748, 8)
    expect(c.rounded).toBeCloseTo(39370.1, 8)
    expect(c.diff).toBeCloseTo(0.02125984252, 8)
  })

  it('bağıl sapma uzunluktan bağımsız: +5.4e-5 %', () => {
    expect(roundingComparison(1).relPct).toBeCloseTo(5.4e-5, 10)
    expect(roundingComparison(0.0001524).relPct).toBeCloseTo(5.4e-5, 10)
    expect(roundingComparison(12.7).relPct).toBeCloseTo(5.4e-5, 10)
  })

  it('yuvarlatılmış kural her zaman büyük değer verir', () => {
    const c = roundingComparison(0.1)
    expect(c.rounded).toBeGreaterThan(c.exact)
  })

  it('sıfırda sapma tanımsız değil, sıfırdır', () => {
    expect(roundingComparison(0).relPct).toBe(0)
    expect(roundingComparison(NaN)).toBeNull()
  })
})

describe('hazır mil listesinde en yakın kayıt', () => {
  it('liste içindeki değere en yakını seçer', () => {
    // 0.15 mm ≈ 5.905 mil → 6 mil (listede indeks 3)
    const mil = convertLength(0.15, 'mm', 'mil').value
    expect(nearestCommonMil(mil)).toBe(3)
  })

  it('tam eşleşmede kendi kaydını verir', () => {
    expect(nearestCommonMil(10)).toBe(5)
  })

  it('liste dışındaki değerde işaret yok', () => {
    expect(nearestCommonMil(0.5)).toBe(-1)
    expect(nearestCommonMil(250)).toBe(-1)
    expect(nearestCommonMil(NaN)).toBe(-1)
  })
})

describe('hata sözleşmesi', () => {
  it('hata yükü kod taşır, cümle taşımaz', () => {
    expectErrorShapes([
      convertLength(1, 'mm', 'furlong'),
      convertLength(1, 'yard', 'mm'),
      convertLength(NaN, 'mm', 'mil'),
      convertLength(Infinity, 'mm', 'mil'),
      convertLength(1e306, 'm', 'mil'),
    ])
  })
})
