// Komponent işaret kodları — direnç renk bantları, SMD direnç kodları,
// seramik kondansatör kodları (spec §9.1, §9.2, §9.3).
//
// Saf katman: kullanıcıya görünen metin üretmez. Hata durumunda
// { error: <kod>, detail: <ayrıntı> } döner. `detail` bir cümle değil, kodu
// tamamlayan simgesel/sayısal alanları taşıyan düz veri nesnesidir (bant sırası,
// bant rolü, renk anahtarı, harf, sayı). Kodu ve alanlarını cümleye çeviren
// taraf ekranın text.js dosyasıdır.

import { E96 } from './eseries'

// --- §9.1 Direnç renk kodu ---

// Bant renkleri burada yalnızca anahtar olarak durur: bir bandın hangi rakamı,
// çarpanı, toleransı ve sıcaklık katsayısını taşıdığını bilir; adını da nasıl
// boyanacağını da bilmez. Türkçe renk adları ekranın text.js dosyasında,
// gerçek renk değerleri tema dosyalarındaki --band-<key> değişkenlerindedir.
export const COLORS = [
  { key: 'black', digit: 0, multiplier: 1e0 },
  { key: 'brown', digit: 1, multiplier: 1e1, tolerance: 1, tcr: 100 },
  { key: 'red', digit: 2, multiplier: 1e2, tolerance: 2, tcr: 50 },
  { key: 'orange', digit: 3, multiplier: 1e3, tcr: 15 },
  { key: 'yellow', digit: 4, multiplier: 1e4, tcr: 25 },
  { key: 'green', digit: 5, multiplier: 1e5, tolerance: 0.5 },
  { key: 'blue', digit: 6, multiplier: 1e6, tolerance: 0.25, tcr: 10 },
  { key: 'violet', digit: 7, multiplier: 1e7, tolerance: 0.1, tcr: 5 },
  { key: 'grey', digit: 8, multiplier: 1e8, tolerance: 0.05 },
  { key: 'white', digit: 9, multiplier: 1e9 },
  { key: 'gold', multiplier: 1e-1, tolerance: 5 },
  { key: 'silver', multiplier: 1e-2, tolerance: 10 },
]

export const COLOR_BY_KEY = Object.fromEntries(COLORS.map((c) => [c.key, c]))

export const DIGIT_COLORS = COLORS.filter((c) => c.digit !== undefined)
export const MULTIPLIER_COLORS = COLORS.filter((c) => c.multiplier !== undefined)
export const TOLERANCE_COLORS = COLORS.filter((c) => c.tolerance !== undefined)
export const TCR_COLORS = COLORS.filter((c) => c.tcr !== undefined)

export const CODE_ERR_BANDS = 'bands'
export const CODE_ERR_COLOR = 'color'
export const CODE_ERR_DIGIT = 'digit'
export const CODE_ERR_FORMAT = 'format'
export const CODE_ERR_RANGE = 'range'

// Bir bant konumunun taşıdığı büyüklük. Hata ayrıntısında `role` alanı olarak
// döner; hangi bandın neyi taşımadığını ekran bu koda bakarak yazar.
export const BAND_ROLE_DIGIT = 'digit'
export const BAND_ROLE_MULTIPLIER = 'multiplier'
export const BAND_ROLE_TOLERANCE = 'tolerance'
export const BAND_ROLE_TCR = 'tcr'

// Aynı hata kodunun birden çok durumu varsa ayrıntıdaki `variant` alanı ayırır.
export const CODE_VARIANT_NOT_TEXT = 'not-text'
export const CODE_VARIANT_EMPTY = 'empty'
export const CODE_VARIANT_R_NOTATION = 'r-notation'
export const CODE_VARIANT_SMD_SHAPE = 'smd-shape'
export const CODE_VARIANT_EIA96_INDEX = 'eia96-index'
export const CODE_VARIANT_EIA96_LETTER = 'eia96-letter'
export const CODE_VARIANT_CAP_SHAPE = 'cap-shape'
export const CODE_VARIANT_CAP_LETTER = 'cap-letter'
export const CODE_VARIANT_POSITIVE = 'positive'
export const CODE_VARIANT_MULTIPLIER = 'multiplier'
export const CODE_VARIANT_TOLERANCE = 'tolerance'
export const CODE_VARIANT_TCR = 'tcr'

// Tek hata biçimi: kod + kodu tamamlayan alanlar. Cümle burada kurulmaz.
const codeError = (error, detail) => ({ error, detail })

// Renk bantlarından direnç değeri.
// 4 bant: [d1, d2, çarpan, tolerans]
// 5 bant: [d1, d2, d3, çarpan, tolerans]
// 6 bant: [d1, d2, d3, çarpan, tolerans, TCR]
export function decodeColorBands(keys) {
  if (!Array.isArray(keys) || ![4, 5, 6].includes(keys.length)) {
    return codeError(CODE_ERR_BANDS)
  }

  const bands = keys.map((k) => COLOR_BY_KEY[k])
  for (let i = 0; i < bands.length; i++) {
    if (!bands[i]) return codeError(CODE_ERR_COLOR, { band: i + 1 })
  }

  const digitCount = keys.length === 4 ? 2 : 3
  let significand = 0
  for (let i = 0; i < digitCount; i++) {
    if (bands[i].digit === undefined) {
      return codeError(CODE_ERR_DIGIT, { band: i + 1, role: BAND_ROLE_DIGIT, color: bands[i].key })
    }
    significand = significand * 10 + bands[i].digit
  }

  const mulBand = bands[digitCount]
  if (mulBand.multiplier === undefined) {
    return codeError(CODE_ERR_DIGIT, {
      band: digitCount + 1, role: BAND_ROLE_MULTIPLIER, color: mulBand.key,
    })
  }

  const tolBand = bands[digitCount + 1]
  if (tolBand.tolerance === undefined) {
    return codeError(CODE_ERR_DIGIT, {
      band: digitCount + 2, role: BAND_ROLE_TOLERANCE, color: tolBand.key,
    })
  }

  let tcr = null
  if (keys.length === 6) {
    const tcrBand = bands[5]
    if (tcrBand.tcr === undefined) {
      return codeError(CODE_ERR_DIGIT, { band: 6, role: BAND_ROLE_TCR, color: tcrBand.key })
    }
    tcr = tcrBand.tcr
  }

  const ohms = significand * mulBand.multiplier
  const tolerance = tolBand.tolerance

  return {
    ohms,
    tolerance,
    tcr,
    min: ohms * (1 - tolerance / 100),
    max: ohms * (1 + tolerance / 100),
    bands: bands.map((b) => b.key),
  }
}

// Altıncı bant sıcaklık katsayısıdır: R(T) = R₂₅ · [1 + TCR·10⁻⁶·(T − 25)]
export function resistanceAtTemp(r25, tcrPpm, T_C) {
  return r25 * (1 + tcrPpm * 1e-6 * (T_C - 25))
}

// Değerden renge (ters yön). bandCount: 4 | 5 | 6
export function encodeColorBands(ohms, tolerance, bandCount = 4, tcr = null) {
  if (!(ohms > 0)) return codeError(CODE_ERR_RANGE, { variant: CODE_VARIANT_POSITIVE })
  if (![4, 5, 6].includes(bandCount)) {
    return codeError(CODE_ERR_BANDS)
  }

  const digitCount = bandCount === 4 ? 2 : 3
  // Mantisi digitCount basamaklı tam sayıya getir
  let exp = Math.floor(Math.log10(ohms)) - (digitCount - 1)
  let significand = Math.round(ohms / Math.pow(10, exp))
  // Yuvarlama taşması: 99.6 → 100 (3 basamak yerine 4)
  if (significand >= Math.pow(10, digitCount)) {
    significand = Math.round(significand / 10)
    exp += 1
  }

  const mulBand = MULTIPLIER_COLORS.find((c) => Math.abs(Math.log10(c.multiplier) - exp) < 1e-9)
  if (!mulBand) {
    return codeError(CODE_ERR_RANGE, { variant: CODE_VARIANT_MULTIPLIER, ohms })
  }

  const tolBand = TOLERANCE_COLORS.find((c) => c.tolerance === tolerance)
  if (!tolBand) {
    return codeError(CODE_ERR_RANGE, { variant: CODE_VARIANT_TOLERANCE, tolerance })
  }

  const digits = String(significand).padStart(digitCount, '0').split('').map(Number)
  const keys = digits.map((d) => DIGIT_COLORS.find((c) => c.digit === d).key)
  keys.push(mulBand.key, tolBand.key)

  if (bandCount === 6) {
    const tcrBand = TCR_COLORS.find((c) => c.tcr === tcr)
    if (!tcrBand) {
      return codeError(CODE_ERR_RANGE, { variant: CODE_VARIANT_TCR, tcr })
    }
    keys.push(tcrBand.key)
  }

  // Renkler yalnızca kuantalanmış değeri temsil edebilir; gerçek gösterilen değer bu
  const encoded = significand * mulBand.multiplier
  return { bands: keys, encoded, exact: Math.abs(encoded - ohms) < 1e-12 }
}

// --- §9.2 SMD direnç kodu ---

// EIA-96 çarpan harfleri. Bazı üreticiler alternatif alias kullanır (R/S/H);
// bu yüzden "standart profil" ve "üretici profili" ayrımı yapılır.
export const EIA96_MULTIPLIERS = {
  standard: { Z: 0.001, Y: 0.01, X: 0.1, A: 1, B: 10, C: 100, D: 1000, E: 10000, F: 100000 },
  aliases: { R: 0.01, S: 0.1, H: 10 },
}

export function decodeSmd(code, { profile = 'standard' } = {}) {
  if (typeof code !== 'string') return codeError(CODE_ERR_FORMAT, { variant: CODE_VARIANT_NOT_TEXT })
  const s = code.trim().toUpperCase()
  if (s === '') return codeError(CODE_ERR_FORMAT, { variant: CODE_VARIANT_EMPTY })

  // Sıfır ohm jumper
  if (/^0{1,4}$/.test(s)) {
    return { ohms: 0, kind: 'zero' }
  }

  // R işareti: ondalık ayracı yerine geçer — 4R7 = 4.7 Ω, R22 = 0.22 Ω
  if (/^\d*R\d*$/.test(s)) {
    const v = parseFloat(s.replace('R', '.'))
    if (!Number.isFinite(v)) return codeError(CODE_ERR_FORMAT, { variant: CODE_VARIANT_R_NOTATION })
    return { ohms: v, kind: 'r-notation' }
  }

  // EIA-96: iki rakam + çarpan harfi
  if (/^\d{2}[A-Z]$/.test(s)) {
    const index = s.slice(0, 2)
    const idx = parseInt(index, 10)
    if (idx < 1 || idx > 96) {
      return codeError(CODE_ERR_RANGE, { variant: CODE_VARIANT_EIA96_INDEX, index })
    }
    const letter = s[2]
    const table = EIA96_MULTIPLIERS.standard
    let mult = table[letter]
    let aliasUsed = false
    if (mult === undefined && profile === 'manufacturer') {
      mult = EIA96_MULTIPLIERS.aliases[letter]
      aliasUsed = mult !== undefined
    }
    if (mult === undefined) {
      return codeError(CODE_ERR_FORMAT, { variant: CODE_VARIANT_EIA96_LETTER, letter })
    }
    // E96 tablosu 100 tabanlı yazılır ve EIA-96'da kod 01 = 100 Ω (harf A = ×1),
    // yani tablo değeri doğrudan kullanılır — ayrıca ölçeklenmez.
    return {
      ohms: E96[idx - 1] * mult,
      kind: 'eia96',
      base: E96[idx - 1],
      multiplier: mult,
      aliasUsed,
    }
  }

  // 3 haneli: R = (10·d1 + d2)·10^d3
  if (/^\d{3}$/.test(s)) {
    const d = s.split('').map(Number)
    return { ohms: (10 * d[0] + d[1]) * Math.pow(10, d[2]), kind: '3-digit' }
  }

  // 4 haneli: R = (100·d1 + 10·d2 + d3)·10^d4
  if (/^\d{4}$/.test(s)) {
    const d = s.split('').map(Number)
    return { ohms: (100 * d[0] + 10 * d[1] + d[2]) * Math.pow(10, d[3]), kind: '4-digit' }
  }

  return codeError(CODE_ERR_FORMAT, { variant: CODE_VARIANT_SMD_SHAPE, code })
}

// --- §9.3 Seramik kondansatör kodu ---

export const CAP_TOLERANCE_LETTERS = {
  B: 0.1, C: 0.25, D: 0.5, F: 1, G: 2, J: 5, K: 10, M: 20, Z: null,
}

// Tek sayıyla ifade edilemeyen tolerans harfleri: sınırlar yüzde olarak.
// Cümlesini ekran kurar; burada yalnızca sayılar durur.
export const CAP_TOLERANCE_ASYMMETRIC = {
  Z: { plus: 80, minus: 20 },
}

export function decodeCapacitor(code) {
  if (typeof code !== 'string') return codeError(CODE_ERR_FORMAT, { variant: CODE_VARIANT_NOT_TEXT })
  const s = code.trim().toUpperCase()
  if (s === '') return codeError(CODE_ERR_FORMAT, { variant: CODE_VARIANT_EMPTY })

  const m = s.match(/^(\d{3})([A-Z])?$/)
  if (!m) {
    return codeError(CODE_ERR_FORMAT, { variant: CODE_VARIANT_CAP_SHAPE, code })
  }

  const d = m[1].split('').map(Number)
  const pF = (10 * d[0] + d[1]) * Math.pow(10, d[2])
  const letter = m[2]

  let tolerance
  let toleranceAsymmetric
  if (letter) {
    if (!(letter in CAP_TOLERANCE_LETTERS)) {
      return codeError(CODE_ERR_FORMAT, { variant: CODE_VARIANT_CAP_LETTER, letter })
    }
    tolerance = CAP_TOLERANCE_LETTERS[letter]
    toleranceAsymmetric = CAP_TOLERANCE_ASYMMETRIC[letter]
  }

  return {
    pF,
    nF: pF / 1000,
    uF: pF / 1e6,
    farad: pF * 1e-12,
    tolerance: tolerance ?? null,
    toleranceLetter: letter ?? null,
    toleranceAsymmetric: toleranceAsymmetric ?? null,
    min: tolerance != null ? pF * (1 - tolerance / 100) : null,
    max: tolerance != null ? pF * (1 + tolerance / 100) : null,
  }
}
