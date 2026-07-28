// AWG (American Wire Gauge) tel ölçüsü dönüşümleri — spec §11.2.
//
// Ölçek geometriktir: ardışık iki numara arasındaki çap oranı sabittir.
// Tanım noktası AWG 36 = 0.005 inch = 0.127 mm ve AWG 4/0 = 0.46 inch;
// aradaki 39 adım 92 katlık çap oranını verir.
//
//   d[inch] = 0.005 × 92^((36 − AWG)/39)
//   d[mm]   = 0.127 × 92^((36 − AWG)/39)
//   A       = π·d²/4
//
// Ters yön analitiktir, sayısal çözücü gerekmez:
//   AWG = 36 − 39·ln(d/0.127) / ln(92)      (d mm cinsinden)
//
// Girişler ve çıkışlar SI: çap metre, alan m². Modül saftır ve kullanıcıya
// görünen metin bilmez; ölçek dışı bir numara ya da çap için sonuç
// uydurulmaz, hata kodu döner.

import { LENGTH, AREA, INCH_M } from './units'

export const AWG_ERR_INVALID = 'invalid'
export const AWG_ERR_RANGE = 'range'
export const AWG_ERR_TOLERANCE = 'tolerance'

// Ölçeğin tanım noktası ve oranı.
//
// Kaynak: AWG geometrik tel ölçüsü tanımı — 36 numaranın çapı 0.005 inch ve
// ardışık iki numara arasındaki çap oranı sabittir. Milimetre karşılığı
// uluslararası inch tanımından (1 inch = 25.4 mm, tam) çıkar; bu yüzden
// AWG_REF_M literal yazılmaz, INCH_M ile çarpılarak türetilir. Yayınlanmış
// bir çap tablosu kopyalanmaz — bütün değerler bu iki tanımdan hesaplanır.
export const AWG_REF_GAUGE = 36
export const AWG_REF_INCH = 0.005 // AWG 36 çapı, inch — ölçeğin tanım noktası
export const AWG_REF_M = AWG_REF_INCH * INCH_M // = 0.127 mm
export const AWG_RATIO = 92
export const AWG_STEPS = 39

// Desteklenen aralık: 4/0 (0000) → −3 … 40.
// Bu sınırların dışında ölçek tanımlı değildir; ekstrapolasyon yapılmaz.
export const AWG_MIN = -3
export const AWG_MAX = 40

// Numaradan çap (m). Kesirli numara da kabul edilir; ölçek süreklidir.
export function awgDiameter(awg) {
  if (!Number.isFinite(awg)) return NaN
  return AWG_REF_M * Math.pow(AWG_RATIO, (AWG_REF_GAUGE - awg) / AWG_STEPS)
}

// Çaptan (m) kesirli numara. Analitik ters — kök arama gerekmez.
export function awgFromDiameter(d) {
  if (!(d > 0)) return NaN
  return AWG_REF_GAUGE - AWG_STEPS * (Math.log(d / AWG_REF_M) / Math.log(AWG_RATIO))
}

// Yuvarlak kesit alanı (m²)
export function wireArea(d) {
  if (!(d > 0)) return NaN
  return (Math.PI * d * d) / 4
}

export function inAwgRange(awg) {
  return Number.isFinite(awg) && awg >= AWG_MIN && awg <= AWG_MAX
}

// En yakın tam (standart) numara. Aralık dışına taşmaz.
export function nearestAwg(awg) {
  if (!Number.isFinite(awg)) return NaN
  const n = Math.round(awg)
  return Math.min(AWG_MAX, Math.max(AWG_MIN, n))
}

// Gösterim birimleri — yalnızca çarpar/böler, yuvarlama yapmaz.
export function diameterUnits(d) {
  if (!(d > 0)) return null
  return {
    m: d,
    mm: d / LENGTH.mm,
    um: d / LENGTH.um,
    mil: d / LENGTH.mil,
    inch: d / LENGTH.inch,
  }
}

export function areaUnits(a) {
  if (!(a > 0)) return null
  return {
    m2: a,
    mm2: a / AREA['mm²'],
    mil2: a / AREA['mil²'],
    um2: a / AREA['µm²'],
  }
}

// Numara + çaptan ortak sonuç zarfı
function wire(awgExact, d) {
  const area = wireArea(d)
  return {
    awgExact,
    awgNearest: nearestAwg(awgExact),
    d,
    area,
    dUnits: diameterUnits(d),
    aUnits: areaUnits(area),
  }
}

// Numaradan tel. Aralık dışı numara için sonuç üretilmez.
export function wireFromAwg(awg) {
  if (!Number.isFinite(awg)) {
    return { error: AWG_ERR_INVALID, message: 'AWG numarası sayısal olmalı.' }
  }
  if (!inAwgRange(awg)) {
    return { error: AWG_ERR_RANGE, message: `AWG numarası ${AWG_MIN} ile ${AWG_MAX} arasında olmalı.` }
  }
  return wire(awg, awgDiameter(awg))
}

// Çaptan tel. Karşılığı ölçek dışına düşerse sonuç üretilmez.
export function wireFromDiameter(d) {
  if (!(d > 0)) {
    return { error: AWG_ERR_INVALID, message: 'Çap pozitif olmalı.' }
  }
  const awg = awgFromDiameter(d)
  if (!Number.isFinite(awg)) {
    return { error: AWG_ERR_INVALID, message: 'Çap sayısal olmalı.' }
  }
  if (!inAwgRange(awg)) {
    return { error: AWG_ERR_RANGE, message: `Çap, AWG ${AWG_MIN} … ${AWG_MAX} ölçeğinin dışında.` }
  }
  return wire(awg, d)
}

// --- Çekme toleransı (spec §3.4) ---
//
// Tel çapı üretimde ± bir bantla gelir. Tolerans BAĞIL kesirdir: 0.05 = ±%5.
// Üst sınır 1 (=%100) hariçtir; %100 tolerans alt uçta çapı sıfırlar ve kesit
// alanı tanımsız kalır.
export const AWG_TOL_MAX = 1

// Bir büyüklüğün üç ucu + nominale göre bağıl sapması.
function span(min, nom, max) {
  return {
    min,
    nom,
    max,
    minPct: (100 * (min - nom)) / nom,
    maxPct: (100 * (max - nom)) / nom,
    spreadPct: (100 * (max - min)) / nom,
  }
}

/**
 * Nominal çapın ± toleransla aldığı minimum · nominal · maksimum bandı ve
 * bunun kesit alanına yansıması (spec §3.4).
 *
 * Kesit sınırları ayrı bir yaklaşımla değil, uç çapların kendisinden
 * hesaplanır. Alan çapın karesiyle gittiği için bant kesitte kendiliğinden
 * yaklaşık iki katına çıkar:
 *   A(d·(1±t)) = A(d)·(1±t)² = A(d)·(1 ± 2t + t²)
 * yani ±%5 çap toleransı kesitte −%9.75 / +%10.25 demektir.
 *
 * Tolerans sıfırken üç uç da nominale birebir eşit çıkar ve `active: false`
 * döner — çağıran taraf bandı hiç göstermeyebilir, bugünkü sonuç değişmez.
 *
 * @param {number} d   nominal çap, m
 * @param {number} tol bağıl tolerans (0.05 = ±%5)
 */
export function diameterTolerance(d, tol = 0) {
  if (!(d > 0)) {
    return { error: AWG_ERR_INVALID, message: 'Çap pozitif olmalı.' }
  }
  if (!Number.isFinite(tol) || tol < 0 || tol >= AWG_TOL_MAX) {
    return {
      error: AWG_ERR_TOLERANCE,
      message: 'Çap toleransı 0 ile %100 arasında olmalı (100 hariç).',
    }
  }

  const dMin = d * (1 - tol)
  const dMax = d * (1 + tol)
  const aMin = wireArea(dMin)
  const aNom = wireArea(d)
  const aMax = wireArea(dMax)

  return {
    tol,
    active: tol > 0,
    d: span(dMin, d, dMax),
    area: span(aMin, aNom, aMax),
    dUnits: { min: diameterUnits(dMin), nom: diameterUnits(d), max: diameterUnits(dMax) },
    aUnits: { min: areaUnits(aMin), nom: areaUnits(aNom), max: areaUnits(aMax) },
  }
}

// Ölçeğin uç çapları (m) — arayüzün geçerli aralığı gösterebilmesi için.
export const AWG_D_MAX = awgDiameter(AWG_MIN)
export const AWG_D_MIN = awgDiameter(AWG_MAX)

/**
 * Tam numaraların tamamı, ince telden kalına doğru (AWG 40 → 4/0).
 * Çap artan sırada olduğu için grafik x eksenine doğrudan verilebilir.
 * @returns {{ awg: number, d: number, area: number }[]}
 */
export function awgSeries() {
  const out = []
  for (let g = AWG_MAX; g >= AWG_MIN; g--) {
    const d = awgDiameter(g)
    out.push({ awg: g, d, area: wireArea(d) })
  }
  return out
}
