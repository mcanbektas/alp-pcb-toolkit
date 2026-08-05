import { describe, it, expect } from 'vitest'
import {
  findResonances,
  PROMINENCE_DEFAULT_DB, PROMINENCE_MIN_DB, PROMINENCE_MAX_DB,
  PEAKS_ERR_NONPOSITIVE, PEAKS_ERR_THRESHOLD, PEAKS_ERR_LENGTH,
} from './peaks'

// Testler dB üzerinden kurgulanır, motora doğrusal büyüklük verilir: eşik dB
// cinsinden tanımlı olduğu için beklenen prominence değerleri ancak böyle elle
// okunabilir kalıyor.
const fromDb = (db) => db.map((d) => 10 ** (d / 20))

describe('temel tespit', () => {
  const freqs = [1, 10, 100, 1e3, 1e4]
  const mags = fromDb([0, 10, 0, 20, 0])

  it('tepe ve çukurları bulur', () => {
    const r = findResonances(freqs, mags)
    expect(r.error).toBeUndefined()
    expect(r.peaks.map((p) => p.freq)).toEqual([10, 1e3])
    expect(r.valleys.map((v) => v.freq)).toEqual([100])
  })

  it('prominence komşu ters uca göre hesaplanır', () => {
    const { peaks, valleys } = findResonances(freqs, mags)
    expect(peaks[0].prominence).toBeCloseTo(10, 9) // 10 dB tepe, sağında 0 dB çukur
    expect(peaks[1].prominence).toBeCloseTo(20, 9)
    expect(valleys[0].prominence).toBeCloseTo(10, 9) // min(10, 20) − 0
  })

  it('varsayılan eşik 3 dB', () => {
    expect(findResonances(freqs, mags).threshold).toBe(PROMINENCE_DEFAULT_DB)
  })
})

describe('eşik', () => {
  const freqs = [1, 10, 100, 1e3, 1e4]
  const mags = fromDb([0, 10, 0, 20, 0])

  it('eşiğin altında kalan uç doğrulanmış listeye girmez', () => {
    const r = findResonances(freqs, mags, { threshold: 15 })
    expect(r.peaks.map((p) => p.freq)).toEqual([1e3]) // 20 dB geçer, 10 dB geçmez
    expect(r.valleys).toHaveLength(0)
  })

  it('eşiğin altındaki uç aday listesinde durur', () => {
    const r = findResonances(freqs, mags, { threshold: 15 })
    expect(r.candidates).toHaveLength(3)
  })

  it('sınır değerler kabul edilir', () => {
    expect(findResonances(freqs, mags, { threshold: PROMINENCE_MIN_DB }).error).toBeUndefined()
    expect(findResonances(freqs, mags, { threshold: PROMINENCE_MAX_DB }).error).toBeUndefined()
  })

  it('aralık dışı eşik hatadır', () => {
    expect(findResonances(freqs, mags, { threshold: 0.4 }).error).toBe(PEAKS_ERR_THRESHOLD)
    expect(findResonances(freqs, mags, { threshold: 21 }).error).toBe(PEAKS_ERR_THRESHOLD)
    expect(findResonances(freqs, mags, { threshold: NaN }).error).toBe(PEAKS_ERR_THRESHOLD)
  })
})

describe('uç noktalar ve kenarlar', () => {
  it('sweep in ilk ve son noktası sınıflandırılmaz', () => {
    // Tek taraflı komşusu olmayan nokta tepe mi, kesilen kenar mı bilinemez.
    const r = findResonances([1, 10, 100], fromDb([10, 0, 5]))
    expect(r.candidates).toHaveLength(1)
    expect(r.candidates[0].kind).toBe('valley')
  })

  it('monoton yükselen seride uç nokta yoktur', () => {
    const r = findResonances([1, 10, 100], fromDb([0, 5, 10]))
    expect(r.candidates).toHaveLength(0)
    expect(r.peaks).toHaveLength(0)
  })
})

describe('plato', () => {
  const freqs = [1, 10, 100, 1e3, 1e4, 1e5]
  const mags = fromDb([0, 5, 5, 0, 8, 0])

  it('plato tek uç nokta sayılır', () => {
    const r = findResonances(freqs, mags)
    expect(r.candidates.filter((c) => c.kind === 'peak')).toHaveLength(2)
  })

  it('plato frekansı geometrik merkezdir', () => {
    // Aritmetik ortalama (55) logaritmik eksende platonun ortasına düşmez.
    const r = findResonances(freqs, mags)
    expect(r.peaks[0].freq).toBeCloseTo(Math.sqrt(10 * 100), 9)
    expect(r.peaks[0].startIndex).toBe(1)
    expect(r.peaks[0].endIndex).toBe(2)
  })

  it('plato dışındaki uç tek indekste kalır', () => {
    const r = findResonances(freqs, mags)
    expect(r.peaks[1].startIndex).toBe(4)
    expect(r.peaks[1].endIndex).toBe(4)
  })
})

describe('ölçülemeyen prominence', () => {
  it('karşı tipte komşusu olmayan uç doğrulanmaz', () => {
    // Tek bir tepe var, hiçbir yanında çukur yok: belirginlik ÖLÇÜLEMEZ.
    // Uydurma bir referans (sweep ucu, sıfır) koymak ölçülmemiş bir değeri
    // ölçülmüş gibi sunardı.
    const r = findResonances([1, 10, 100], fromDb([0, 5, 0]))
    expect(r.candidates).toHaveLength(1)
    expect(r.candidates[0].prominence).toBeNull()
    expect(r.peaks).toHaveLength(0)
  })
})

// Buradaki bütün mevcut testlerde bir ucun İKİ YANINDAKİ karşı tip uçlar ya
// eşit ya da tek taraflı. O yüzden prominenceOf'taki `Math.max(...refs)` /
// `Math.min(...refs)` seçimi hiç sınanmıyor: ikisi de aynı sayıyı verirdi.
// Prominence tanımı gereği DAHA SIĞ olan taraf kazanır — bir tepenin
// belirginliği, ondan inip tekrar çıkmadan ulaşılabilen en yüksek komşu
// çukura göre ölçülür.
describe('iki yanı FARKLI derinlikte olan uç', () => {
  const freqs = [1, 10, 100, 1e3, 1e4]

  it('tepe: sığ olan çukura göre ölçülür (20 − 2 = 18, 20 − 0 = 20 DEĞİL)', () => {
    // dB dizisi: 5, 0, 20, 2, 5
    //   → çukur 0 dB (solda), tepe 20 dB (ortada), çukur 2 dB (sağda)
    // Prominence = 20 − max(0, 2) = 18.  Math.max → Math.min mutasyonunda 20.
    const r = findResonances(freqs, fromDb([5, 0, 20, 2, 5]))
    expect(r.error).toBeUndefined()
    expect(r.candidates.map((c) => c.kind)).toEqual(['valley', 'peak', 'valley'])
    expect(r.peaks).toHaveLength(1)
    expect(r.peaks[0].freq).toBe(100)
    expect(r.peaks[0].prominence).toBeCloseTo(18, 9)
  })

  it('tepe: 19 dB eşiği bu tepeyi ELER — mutasyonda (20) elenmezdi', () => {
    const r = findResonances(freqs, fromDb([5, 0, 20, 2, 5]), { threshold: 19 })
    expect(r.peaks).toHaveLength(0)
    // Soldaki çukur ise 20 dB prominence taşır (tek yanında tepe var: 20 − 0).
    expect(r.valleys.map((v) => v.freq)).toEqual([10])
    expect(r.valleys[0].prominence).toBeCloseTo(20, 9)
  })

  it('çukur: alçak olan tepeye göre ölçülür (10 − 3 = 7, 20 − 3 = 17 DEĞİL)', () => {
    // dB dizisi: 0, 20, 3, 10, 0
    //   → tepe 20 dB (solda), çukur 3 dB (ortada), tepe 10 dB (sağda)
    // Prominence = min(20, 10) − 3 = 7.  Math.min → Math.max mutasyonunda 17.
    const r = findResonances(freqs, fromDb([0, 20, 3, 10, 0]))
    expect(r.error).toBeUndefined()
    expect(r.candidates.map((c) => c.kind)).toEqual(['peak', 'valley', 'peak'])
    expect(r.valleys).toHaveLength(1)
    expect(r.valleys[0].freq).toBe(100)
    expect(r.valleys[0].prominence).toBeCloseTo(7, 9)
    // Aynı dizide soldaki tepenin prominence'ı 20 − 3 = 17 (tek yanlı ölçüm).
    expect(r.peaks.map((p) => p.freq)).toEqual([10, 1e3])
    expect(r.peaks[0].prominence).toBeCloseTo(17, 9)
    expect(r.peaks[1].prominence).toBeCloseTo(7, 9)
  })

  it('çukur: 10 dB eşiği bu çukuru ELER — mutasyonda (17) elenmezdi', () => {
    const r = findResonances(freqs, fromDb([0, 20, 3, 10, 0]), { threshold: 10 })
    expect(r.valleys).toHaveLength(0)
    expect(r.peaks.map((p) => p.freq)).toEqual([10]) // 17 dB geçer, 7 dB geçmez
  })
})

describe('geçersiz girdi', () => {
  it('sıfır veya negatif büyüklük logaritmik eksende hatadır', () => {
    expect(findResonances([1, 10, 100], [1, 0, 1]).error).toBe(PEAKS_ERR_NONPOSITIVE)
    expect(findResonances([1, 10, 100], [1, -2, 1]).error).toBe(PEAKS_ERR_NONPOSITIVE)
    expect(findResonances([1, 10, 100], [1, NaN, 1]).error).toBe(PEAKS_ERR_NONPOSITIVE)
    expect(findResonances([1, 10, 100], [1, Infinity, 1]).error).toBe(PEAKS_ERR_NONPOSITIVE)
  })

  it('uzunluk uyuşmazlığı ve çok kısa seri hatadır', () => {
    expect(findResonances([1, 10, 100], [1, 2]).error).toBe(PEAKS_ERR_LENGTH)
    expect(findResonances([1, 10], [1, 2]).error).toBe(PEAKS_ERR_LENGTH)
  })
})
