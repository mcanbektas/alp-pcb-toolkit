// Sıcaklık dönüştürme motoru (spec §11.5).
//
// Saf modül: React, DOM ve kullanıcıya görünen metin bilmez. Hata durumunda
// kod döner; kodu Türkçeye çeviren tek yer ekranın text.js dosyasıdır.
//
// spec §11.5 denklemleri:
//   T_F = (9/5)·T_C + 32
//   T_C = (5/9)·(T_F − 32)
//   T_K = T_C + 273.15
//
// Burada iki ayrı büyüklük vardır ve birbirine karıştırılmaz:
//
//   1) Mutlak sıcaklık — ölçekler arasında hem eğim hem ofset değişir.
//      0 °C = 32 °F = 273.15 K.
//   2) Sıcaklık farkı (ΔT) — ofset yoktur, yalnızca eğim kalır.
//      ΔT_C = ΔT_K, ΔT_F = (9/5)·ΔT_C.
//      spec §3.1 "İç hesaplama birimleri" dahili sıcaklık birimini "santigrat
//      derece veya kelvin farkı" olarak tanımlar; fark büyüklüğünde ikisi zaten
//      özdeştir.
//
// Mutlak sıfır (T_K = 0) fiziksel alt sınırdır; altındaki giriş hesaplanmaz.

export const TEMP_ERR_INVALID = 'invalid'
export const TEMP_ERR_UNIT = 'unit'
export const TEMP_ERR_ABSOLUTE_ZERO = 'absolute-zero'

// Birim anahtarları — units.js tablolarındaki gibi sembol değerlidir.
// Sıcaklık dönüşümü çarpansal değil afin olduğu için units.js tablosuna
// girmez; ölçek dönüşümü bu modülde yapılır.
export const UNIT_C = '°C'
export const UNIT_F = '°F'
export const UNIT_K = 'K'
export const TEMP_UNITS = [UNIT_C, UNIT_F, UNIT_K]

export const KELVIN_OFFSET = 273.15
export const F_OFFSET = 32

// Mutlak sıfırın üç ölçekteki karşılığı
export const ABS_ZERO_K = 0
export const ABS_ZERO_C = -273.15
export const ABS_ZERO_F = -459.67

// Kayan nokta gürültüsü payı (kelvin). Tam sınırdaki giriş (−459.67 °F gibi)
// çevrimden 1e-14 mertebesinde negatif çıkabilir; bu fiziksel bir ihlal değil,
// ikilik tabanda temsil hatasıdır.
const ABS_ZERO_EPS = 1e-9

// --- Ölçek dönüşümleri (spec §11.5) ---
//
// Çarpma sırası bilinçlidir: (9·c)/5 ve ((f−32)·5)/9 biçimleri, (9/5)·c ve
// (5/9)·(f−32) ile cebirsel olarak aynıdır ama ikilik tabanda daha az artık
// bırakır — −459.67 °F tam olarak −273.15 °C verir.

export function cToF(c) {
  return (9 * c) / 5 + F_OFFSET
}

export function fToC(f) {
  return ((f - F_OFFSET) * 5) / 9
}

export function cToK(c) {
  return c + KELVIN_OFFSET
}

export function kToC(k) {
  return k - KELVIN_OFFSET
}

export function fToK(f) {
  return cToK(fToC(f))
}

export function kToF(k) {
  return cToF(kToC(k))
}

// Herhangi bir ölçekten santigrada. Bilinmeyen birim sessizce geçmez: NaN.
export function toCelsius(value, unit) {
  if (!Number.isFinite(value)) return NaN
  if (unit === UNIT_C) return value
  if (unit === UNIT_F) return fToC(value)
  if (unit === UNIT_K) return kToC(value)
  return NaN
}

// Santigrattan herhangi bir ölçeğe
export function fromCelsius(c, unit) {
  if (!Number.isFinite(c)) return NaN
  if (unit === UNIT_C) return c
  if (unit === UNIT_F) return cToF(c)
  if (unit === UNIT_K) return cToK(c)
  return NaN
}

/**
 * Mutlak sıcaklık dönüşümü.
 *
 * Girişin kendi ölçeğindeki değeri gidiş-dönüş yapılmadan korunur; yalnızca
 * diğer iki ölçek türetilir. Böylece kullanıcının yazdığı sayı çevrim
 * artığıyla değişmiş gibi görünmez.
 *
 * @returns {{ C, F, K, unit, value, marginK, atAbsoluteZero }} | { error, message }
 */
export function convertTemperature({ value, unit }) {
  if (!Number.isFinite(value)) {
    return { error: TEMP_ERR_INVALID, message: 'sayısal olmayan sıcaklık değeri' }
  }
  if (!TEMP_UNITS.includes(unit)) {
    return { error: TEMP_ERR_UNIT, message: 'bilinmeyen sıcaklık birimi' }
  }

  const C = unit === UNIT_C ? value : toCelsius(value, unit)
  const K = unit === UNIT_K ? value : cToK(C)
  const F = unit === UNIT_F ? value : cToF(C)

  if (K < -ABS_ZERO_EPS) {
    return { error: TEMP_ERR_ABSOLUTE_ZERO, message: 'mutlak sıfırın altında sıcaklık' }
  }

  return {
    C, F, K,
    unit,
    value,
    // Mutlak sıfıra kalan pay (kelvin). Sıfırsa giriş tam sınırdadır.
    marginK: K,
    atAbsoluteZero: Math.abs(K) <= ABS_ZERO_EPS,
  }
}

/**
 * Sıcaklık FARKI (ΔT) dönüşümü.
 *
 * Ofset yoktur: ΔT_C ile ΔT_K özdeştir, ΔT_F yalnızca 9/5 eğimiyle ayrılır.
 * Negatif fark (soğuma) geçerlidir; mutlak sıfır kontrolü farka uygulanmaz.
 *
 * @returns {{ dC, dK, dF, unit, value }} | { error, message }
 */
export function convertDelta({ value, unit }) {
  if (!Number.isFinite(value)) {
    return { error: TEMP_ERR_INVALID, message: 'sayısal olmayan sıcaklık farkı' }
  }
  if (!TEMP_UNITS.includes(unit)) {
    return { error: TEMP_ERR_UNIT, message: 'bilinmeyen sıcaklık birimi' }
  }

  const dC = unit === UNIT_F ? (value * 5) / 9 : value
  const dF = unit === UNIT_F ? value : (dC * 9) / 5

  return { dC, dK: dC, dF, unit, value }
}

/**
 * Ortam sıcaklığının üstüne bir ΔT eklendiğinde ulaşılan mutlak sıcaklık.
 *
 * Ortam mutlak, artış farktır — dönüşümleri de öyle yapılır. Toplam yalnızca
 * doğrusal bir eklemedir; artışın nereden geldiği bu modülün konusu değildir.
 *
 * @returns {{ C, F, K, ambient, delta }} | { error, message }
 */
export function finalTemperature({ ambient, ambientUnit, delta, deltaUnit }) {
  const a = convertTemperature({ value: ambient, unit: ambientUnit })
  if (a.error) return a

  const d = convertDelta({ value: delta, unit: deltaUnit })
  if (d.error) return d

  const C = a.C + d.dC
  const K = cToK(C)
  if (K < -ABS_ZERO_EPS) {
    return { error: TEMP_ERR_ABSOLUTE_ZERO, message: 'toplam sıcaklık mutlak sıfırın altında' }
  }

  return { C, F: cToF(C), K, ambient: a, delta: d }
}
