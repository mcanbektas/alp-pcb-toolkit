// Frekans ve periyot dönüşümü (spec §11.3).
//
//   f = 1 / T
//   T = 1 / f
//
// Açısal frekans spec §11.3'te ayrıca yazılmaz; tanım gereği ω = 2πf'dir ve
// dönüşüm tartışmasız olduğu için sonuçta ayrı bir alan olarak taşınır.
//
// Girişler ve çıkışlar SI: frekans Hz, periyot s, açısal frekans rad/s.
// Sıfır ve negatif değer reddedilir: 1/0 tanımsızdır ve sessizce Infinity
// döndürmek, tanımsız bir sonucu geçerli bir sayı gibi göstermek olurdu.
// Modül saftır: React, DOM ve kullanıcıya görünen metin bilmez; hata kodu
// döner, cümle döndürmez (message alanı yalnızca geliştirici içindir).

export const FREQ_ERR_INVALID = 'invalid'
export const FREQ_ERR_NONPOSITIVE = 'nonpositive'
export const FREQ_ERR_RANGE = 'range'

// Giriş kaynağı: hangi büyüklük verildi
export const SOURCE_FREQUENCY = 'frequency'
export const SOURCE_PERIOD = 'period'

const TWO_PI = 2 * Math.PI

// Ortak giriş denetimi. Hata varsa kod, sorun yoksa null döner.
function guard(x) {
  if (typeof x !== 'number' || !Number.isFinite(x)) return FREQ_ERR_INVALID
  if (x <= 0) return FREQ_ERR_NONPOSITIVE
  return null
}

const MSG = {
  [FREQ_ERR_INVALID]: 'Giriş sonlu bir sayı olmalı.',
  [FREQ_ERR_NONPOSITIVE]: 'Frekans ve periyot sıfırdan büyük olmalı; 1/0 tanımsızdır.',
  [FREQ_ERR_RANGE]: 'Sonuç kayan nokta aralığının dışına taşıyor.',
}

const fail = (code) => ({ error: code, message: MSG[code] })

// Periyot (s) ← frekans (Hz)
export function periodFromFrequency(frequency) {
  const e = guard(frequency)
  if (e) return fail(e)
  const period = 1 / frequency
  // Aşırı küçük/büyük girişte tersi temsil edilemeyebilir; taşmayı sessizce
  // sonsuz olarak geçirmek yerine hata döner.
  if (!Number.isFinite(period) || period <= 0) return fail(FREQ_ERR_RANGE)
  return { period }
}

// Frekans (Hz) ← periyot (s)
export function frequencyFromPeriod(period) {
  const e = guard(period)
  if (e) return fail(e)
  const frequency = 1 / period
  if (!Number.isFinite(frequency) || frequency <= 0) return fail(FREQ_ERR_RANGE)
  return { frequency }
}

// Açısal frekans (rad/s) ← frekans (Hz)
export function angularFromFrequency(frequency) {
  const e = guard(frequency)
  if (e) return fail(e)
  const omega = TWO_PI * frequency
  if (!Number.isFinite(omega)) return fail(FREQ_ERR_RANGE)
  return { omega }
}

// Frekans (Hz) ← açısal frekans (rad/s)
export function frequencyFromAngular(omega) {
  const e = guard(omega)
  if (e) return fail(e)
  const frequency = omega / TWO_PI
  if (!Number.isFinite(frequency) || frequency <= 0) return fail(FREQ_ERR_RANGE)
  return { frequency }
}

/**
 * Çift yönlü dönüşüm: hangi büyüklük verilirse diğerleri türetilir.
 *
 * @param {{ source: string, value: number }} arg  value SI cinsinden (Hz veya s)
 * @returns {{ source, frequency, period, omega }|{ error, message }}
 */
export function convertFrequency({ source, value }) {
  if (source !== SOURCE_FREQUENCY && source !== SOURCE_PERIOD) return fail(FREQ_ERR_INVALID)

  const first = source === SOURCE_FREQUENCY
    ? periodFromFrequency(value)
    : frequencyFromPeriod(value)
  if (first.error) return first

  const frequency = source === SOURCE_FREQUENCY ? value : first.frequency
  const period = source === SOURCE_FREQUENCY ? first.period : value

  const ang = angularFromFrequency(frequency)
  if (ang.error) return ang

  return { source, frequency, period, omega: ang.omega }
}
