// Ohm kanunu ve seri/paralel birleşimler (spec §9.4, §9.5).
// Tüm girişler SI: V, A, Ω, F, H.

const isNum = (x) => Number.isFinite(x)

// Kullanıcı herhangi iki bağımsız değeri girer, kalanlar hesaplanır.
// Üçü birden girilirse tutarsızlık oranı da döner: E = |V − IR| / |V|
export function ohmsLaw({ V, I, R, P }) {
  const given = { V, I, R, P }
  const keys = Object.keys(given).filter((k) => isNum(given[k]))
  if (keys.length < 2) {
    return { error: 'insufficient' }
  }

  let { V: v, I: i, R: r, P: p } = given

  // İki bağımsız değerden diğer ikisini türet
  if (isNum(v) && isNum(i)) { r = i === 0 ? NaN : v / i; p = v * i }
  else if (isNum(v) && isNum(r)) { i = r === 0 ? NaN : v / r; p = r === 0 ? NaN : (v * v) / r }
  else if (isNum(i) && isNum(r)) { v = i * r; p = i * i * r }
  else if (isNum(v) && isNum(p)) { i = v === 0 ? NaN : p / v; r = p === 0 ? NaN : (v * v) / p }
  else if (isNum(i) && isNum(p)) { v = i === 0 ? NaN : p / i; r = i === 0 ? NaN : p / (i * i) }
  else if (isNum(r) && isNum(p)) {
    if (r < 0 || p < 0) return { error: 'invalid' }
    v = Math.sqrt(p * r); i = r === 0 ? NaN : Math.sqrt(p / r)
  }

  // Fazla veri girildiyse tutarlılık kontrolü
  let inconsistency = null
  if (keys.length >= 3 && isNum(given.V) && isNum(given.I) && isNum(given.R) && given.V !== 0) {
    inconsistency = Math.abs(given.V - given.I * given.R) / Math.abs(given.V)
  }

  return { V: v, I: i, R: r, P: p, given: keys, inconsistency }
}

// --- Seri ve paralel ---

const sum = (xs) => xs.reduce((a, b) => a + b, 0)

function reciprocalSum(xs) {
  if (xs.some((x) => x === 0)) return 0 // sıfır dirençli kol her şeyi kısa devre eder
  return 1 / sum(xs.map((x) => 1 / x))
}

export const seriesResistance = (xs) => sum(xs)
export const parallelResistance = (xs) => reciprocalSum(xs)
export const seriesCapacitance = (xs) => reciprocalSum(xs)
export const parallelCapacitance = (xs) => sum(xs)
// Karşılıklı kuplaj yoksa geçerli
export const seriesInductance = (xs) => sum(xs)
export const parallelInductance = (xs) => reciprocalSum(xs)

export function twoInParallel(a, b) {
  if (a + b === 0) return NaN
  return (a * b) / (a + b)
}
