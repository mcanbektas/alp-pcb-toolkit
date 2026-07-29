import { describe, it, expect } from 'vitest'
import {
  E6, E12, E24, E48, E96, SERIES, SERIES_NAMES,
  seriesValues, nearestValue, nearestValues, errorPct,
} from './eseries'

describe('dizi tabloları', () => {
  it('her seri adı kadar değer içerir', () => {
    expect(SERIES_NAMES).toEqual(['E6', 'E12', 'E24', 'E48', 'E96'])
    expect(E6).toHaveLength(6)
    expect(E12).toHaveLength(12)
    expect(E24).toHaveLength(24)
    expect(E48).toHaveLength(48)
    expect(E96).toHaveLength(96)
  })

  it('SERIES tablosu dizileri adla eşler', () => {
    expect(SERIES.E6).toBe(E6)
    expect(SERIES.E96).toBe(E96)
  })

  it('E6/E12/E24 on tabanlı, E48/E96 yüz tabanlı yazılır', () => {
    expect([E6[0], E12[0], E24[0]]).toEqual([10, 10, 10])
    expect([E48[0], E96[0]]).toEqual([100, 100])
    expect(E24.at(-1)).toBe(91)
    expect(E48.at(-1)).toBe(953)
    expect(E96.at(-1)).toBe(976)
  })

  it('her dizi kesin artan ve tekrarsızdır', () => {
    for (const name of SERIES_NAMES) {
      const arr = SERIES[name]
      expect(new Set(arr).size, name).toBe(arr.length)
      expect(arr.every((v, i) => i === 0 || arr[i - 1] < v), name).toBe(true)
    }
  })

  it('kaba seriler ince serilerin alt kümesidir', () => {
    expect(E6.every((v) => E12.includes(v))).toBe(true)
    expect(E12.every((v) => E24.includes(v))).toBe(true)
    expect(E48.every((v) => E96.includes(v))).toBe(true)
  })
})

describe('seriesValues — aralık üretimi', () => {
  it('bir dekat içinde tüm değerleri sınırlar dahil verir', () => {
    expect(seriesValues('E12', 10, 100))
      .toEqual([10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82, 100])
  })

  it('dekat altına iner (mantis ölçeği 1–10)', () => {
    expect(seriesValues('E24', 1, 10)).toEqual([
      1, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2, 2.2, 2.4, 2.7, 3,
      3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1, 10,
    ])
  })

  it('yüz tabanlı seriler de mantisten üretilir', () => {
    expect(seriesValues('E48', 1000, 2000)).toEqual([
      1000, 1050, 1100, 1150, 1210, 1270, 1330, 1400,
      1470, 1540, 1620, 1690, 1780, 1870, 1960,
    ])
    const e96 = seriesValues('E96', 100, 200)
    expect(e96).toHaveLength(30)
    expect(e96[0]).toBe(100)
    expect(e96.at(-1)).toBe(200)
  })

  it('bir dekattan küçük değerleri üretir', () => {
    const v = seriesValues('E12', 0.1, 1)
    expect(v).toHaveLength(13)
    expect(v[0]).toBeCloseTo(0.1, 12)
    expect(v[4]).toBeCloseTo(0.22, 12)
    expect(v.at(-1)).toBeCloseTo(1, 12)
  })

  it('birden çok dekada yayılır', () => {
    expect(seriesValues('E12', 10, 1000)).toHaveLength(25)
    expect(seriesValues('E12', 1, 1e6)).toHaveLength(73)
    expect(seriesValues('E12', 4700, 47000)).toEqual([
      4700, 5600, 6800, 8200, 10000, 12000, 15000,
      18000, 22000, 27000, 33000, 39000, 47000,
    ])
  })

  it('kısmi aralıkta yalnızca aralığa düşenleri verir', () => {
    expect(seriesValues('E12', 3, 5)).toEqual([3.3, 3.9, 4.7])
    expect(seriesValues('E12', 4699, 4701)).toEqual([4700])
  })

  it('sonuç artan sırada döner', () => {
    const v = seriesValues('E96', 1, 1000)
    expect(v.every((x, i) => i === 0 || v[i - 1] <= x)).toBe(true)
  })

  it('bilinmeyen seri adı boş dizi verir', () => {
    expect(seriesValues('E13', 1, 10)).toEqual([])
    expect(seriesValues(undefined, 1, 10)).toEqual([])
  })

  it('geçersiz aralık boş dizi verir', () => {
    expect(seriesValues('E12', 0, 10)).toEqual([])
    expect(seriesValues('E12', -5, 10)).toEqual([])
    expect(seriesValues('E12', 100, 10)).toEqual([])
    // max, min’e eşitse aralık boştur (max > min şartı)
    expect(seriesValues('E12', 10, 10)).toEqual([])
    expect(seriesValues('E12', 4700, 4700)).toEqual([])
    expect(seriesValues('E12', NaN, 10)).toEqual([])
    expect(seriesValues('E12', 1, NaN)).toEqual([])
    expect(seriesValues('E12')).toEqual([])
  })
})

describe('nearestValue', () => {
  it('tam eşleşmede sıfır hata verir', () => {
    expect(nearestValue(4700, 'E12')).toEqual({ value: 4700, errorPct: 0, series: 'E12' })
    expect(nearestValue(4750, 'E96')).toEqual({ value: 4750, errorPct: 0, series: 'E96' })
    expect(nearestValue(3.16, 'E48')).toEqual({ value: 3.16, errorPct: 0, series: 'E48' })
    expect(nearestValue(2.2, 'E6')).toEqual({ value: 2.2, errorPct: 0, series: 'E6' })
    expect(nearestValue(1e6, 'E12')).toEqual({ value: 1e6, errorPct: 0, series: 'E12' })
  })

  it('seçilen seri adını sonuçta taşır', () => {
    expect(nearestValue(1234, 'E24').series).toBe('E24')
  })

  it('komşu dekata taşabilir', () => {
    // 9.8 → 10: üst dekattaki değer daha yakın
    expect(nearestValue(9.8, 'E12').value).toBe(10)
    expect(nearestValue(9.8, 'E24').value).toBe(10)
    expect(nearestValue(99, 'E12').value).toBe(100)
    expect(nearestValue(9.5, 'E12').value).toBe(10)
  })

  it('dekat altındaki hedefte de çalışır', () => {
    const r = nearestValue(0.0047, 'E24')
    expect(r.value).toBeCloseTo(0.0047, 12)
    expect(r.errorPct).toBeCloseTo(0, 9)
  })

  it('hata yüzdesi hedefe göre işaretli döner', () => {
    const low = nearestValue(11, 'E12')
    expect(low.value).toBe(10)
    expect(low.errorPct).toBeCloseTo(-9.0909, 4)

    const high = nearestValue(9.8, 'E12')
    expect(high.errorPct).toBeCloseTo(2.0408, 4)

    const r = nearestValue(0.5, 'E12')
    expect(r.value).toBeCloseTo(0.47, 12)
    expect(r.errorPct).toBeCloseTo(-6, 9)
  })

  it('eşit uzaklıkta ilk bulunan (küçük) değeri seçer', () => {
    // 11 → 10 ve 12 eşit uzaklıkta (%9.09); karşılaştırma kesin küçüktür
    expect(nearestValue(11, 'E12').value).toBe(10)
    // 12.5 → 10 (−%20) ve 15 (+%20) eşit uzaklıkta
    expect(nearestValue(12.5, 'E6').value).toBe(10)
  })

  it('ince seri kaba seriden daha küçük hata verir', () => {
    const coarse = nearestValue(1234, 'E12')
    const fine = nearestValue(1234, 'E96')
    expect(Math.abs(fine.errorPct)).toBeLessThan(Math.abs(coarse.errorPct))
    expect(nearestValue(123456, 'E96').value).toBe(124000)
  })

  it('geçersiz hedef veya seri için null döner', () => {
    expect(nearestValue(0, 'E12')).toBeNull()
    expect(nearestValue(-5, 'E12')).toBeNull()
    expect(nearestValue(NaN, 'E12')).toBeNull()
    expect(nearestValue(10, 'E7')).toBeNull()
    expect(nearestValue(10, undefined)).toBeNull()
  })

  it('Infinity hedefi null vermez, hatası hesaplanamaz', () => {
    const r = nearestValue(Infinity, 'E12')
    expect(r).not.toBeNull()
    expect(Number.isNaN(r.errorPct)).toBe(true)
  })
})

describe('nearestValues', () => {
  it('varsayılan olarak 5 aday döner', () => {
    expect(nearestValues(4700, 'E12')).toHaveLength(5)
  })

  it('hata büyüklüğüne göre artan sırada döner', () => {
    const list = nearestValues(4700, 'E12')
    expect(list.map((x) => x.value)).toEqual([4700, 3900, 5600, 3300, 2700])
    const errs = list.map((x) => Math.abs(x.errorPct))
    expect(errs.every((e, i) => i === 0 || errs[i - 1] <= e)).toBe(true)
  })

  it('ilk aday nearestValue ile aynıdır', () => {
    for (const [t, n] of [[4700, 'E12'], [1234, 'E24'], [9.8, 'E96'], [0.5, 'E12']]) {
      expect(nearestValues(t, n)[0]).toEqual(nearestValue(t, n))
    }
  })

  it('count aday sayısını sınırlar', () => {
    expect(nearestValues(4700, 'E12', 3).map((x) => x.value)).toEqual([4700, 3900, 5600])
    expect(nearestValues(4700, 'E24', 1)).toEqual([{ value: 4700, errorPct: 0, series: 'E24' }])
    expect(nearestValues(4700, 'E12', 0)).toEqual([])
  })

  it('count aday sayısını aşarsa üç dekattaki tüm adaylar döner', () => {
    expect(nearestValues(22, 'E6', 1000)).toHaveLength(3 * E6.length)
    expect(nearestValues(4700, 'E96', 1000)).toHaveLength(3 * E96.length)
  })

  it('her aday seri adını taşır', () => {
    expect(nearestValues(4700, 'E12').every((x) => x.series === 'E12')).toBe(true)
  })

  it('geçersiz hedef veya seri için boş dizi döner', () => {
    expect(nearestValues(0, 'E12')).toEqual([])
    expect(nearestValues(-1, 'E12')).toEqual([])
    expect(nearestValues(10, 'Ex')).toEqual([])
  })
})

describe('errorPct', () => {
  it('tam eşleşmede sıfırdır', () => {
    expect(errorPct(4700, 4700)).toBe(0)
  })

  it('seçilen hedefin üstündeyse pozitif, altındaysa negatiftir', () => {
    expect(errorPct(4700, 4500)).toBeCloseTo(4.4444, 4)
    expect(errorPct(4500, 4700)).toBeCloseTo(-4.2553, 4)
    expect(errorPct(0, 100)).toBe(-100)
    expect(errorPct(1, 3)).toBeCloseTo(-66.6667, 4)
  })

  it('hedef sıfırken NaN döner (bölme yapılmaz)', () => {
    expect(Number.isNaN(errorPct(100, 0))).toBe(true)
    expect(Number.isNaN(errorPct(0, 0))).toBe(true)
  })

  it('seçilen değer sonlu değilse NaN döner', () => {
    expect(Number.isNaN(errorPct(NaN, 100))).toBe(true)
    expect(Number.isNaN(errorPct(Infinity, 100))).toBe(true)
    expect(Number.isNaN(errorPct(undefined, 10))).toBe(true)
  })

  it('hedef NaN ise NaN döner', () => {
    expect(Number.isNaN(errorPct(10, NaN))).toBe(true)
    expect(Number.isNaN(errorPct(10, undefined))).toBe(true)
  })

  it('nearestValue ile aynı bağıntıyı kullanır', () => {
    const r = nearestValue(1234, 'E24')
    expect(errorPct(r.value, 1234)).toBeCloseTo(r.errorPct, 12)
  })
})
