// E serisi tercih edilen değerler (spec §9.6).
//
// İdeal geometrik seri R_n = 10^(n/N) yalnızca yaklaşık sonuç verir; gerçek
// standart değerler yuvarlatılmış tercih edilen sayı tablolarıdır. Bu yüzden
// formülden anlık üretmek yerine doğrulanmış diziler saklanır.

export const E6 = [10, 15, 22, 33, 47, 68]

export const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82]

export const E24 = [
  10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30,
  33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91,
]

export const E48 = [
  100, 105, 110, 115, 121, 127, 133, 140, 147, 154, 162, 169,
  178, 187, 196, 205, 215, 226, 237, 249, 261, 274, 287, 301,
  316, 332, 348, 365, 383, 402, 422, 442, 464, 487, 511, 536,
  562, 590, 619, 649, 681, 715, 750, 787, 825, 866, 909, 953,
]

export const E96 = [
  100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130,
  133, 137, 140, 143, 147, 150, 154, 158, 162, 165, 169, 174,
  178, 182, 187, 191, 196, 200, 205, 210, 215, 221, 226, 232,
  237, 243, 249, 255, 261, 267, 274, 280, 287, 294, 301, 309,
  316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412,
  422, 432, 442, 453, 464, 475, 487, 499, 511, 523, 536, 549,
  562, 576, 590, 604, 619, 634, 649, 665, 681, 698, 715, 732,
  750, 768, 787, 806, 825, 845, 866, 887, 909, 931, 953, 976,
]

export const SERIES = { E6, E12, E24, E48, E96 }

export const SERIES_NAMES = Object.keys(SERIES)

// Dizideki mantisleri 1–10 aralığına normalize eder (E48/E96 100 tabanlı yazılır)
function mantissas(name) {
  const arr = SERIES[name]
  if (!arr) return null
  const scale = arr[0] >= 100 ? 100 : 10
  return arr.map((v) => v / scale)
}

// Verilen seride, [min, max] aralığındaki tüm değerleri üretir.
export function seriesValues(name, min, max) {
  const m = mantissas(name)
  if (!m || !(min > 0) || !(max > min)) return []

  const out = []
  const startDecade = Math.floor(Math.log10(min)) - 1
  const endDecade = Math.ceil(Math.log10(max))
  for (let d = startDecade; d <= endDecade; d++) {
    const decade = Math.pow(10, d)
    for (const mant of m) {
      const v = mant * decade
      if (v >= min && v <= max) out.push(v)
    }
  }
  return out.sort((a, b) => a - b)
}

// Hedefe en yakın standart değer. Döner: { value, errorPct, series }
export function nearestValue(target, name) {
  const m = mantissas(name)
  if (!m || !(target > 0)) return null

  const decade = Math.pow(10, Math.floor(Math.log10(target)))
  // Komşu dekatlar da denenir: 9.8 → 10 gibi sınır durumları için
  let best = null
  for (const d of [decade / 10, decade, decade * 10]) {
    for (const mant of m) {
      const v = mant * d
      const errorPct = (100 * (v - target)) / target
      if (best === null || Math.abs(errorPct) < Math.abs(best.errorPct)) {
        best = { value: v, errorPct, series: name }
      }
    }
  }
  return best
}

// Hedefe en yakın N standart değer, hata büyüklüğüne göre sıralı.
export function nearestValues(target, name, count = 5) {
  const m = mantissas(name)
  if (!m || !(target > 0)) return []

  const decade = Math.pow(10, Math.floor(Math.log10(target)))
  const all = []
  for (const d of [decade / 10, decade, decade * 10]) {
    for (const mant of m) {
      const value = mant * d
      all.push({ value, errorPct: (100 * (value - target)) / target, series: name })
    }
  }
  all.sort((a, b) => Math.abs(a.errorPct) - Math.abs(b.errorPct))
  return all.slice(0, count)
}

// Hedefe göre yüzde hata (spec §9.6)
export function errorPct(selected, target) {
  if (!(target !== 0) || !Number.isFinite(selected)) return NaN
  return (100 * (selected - target)) / target
}
